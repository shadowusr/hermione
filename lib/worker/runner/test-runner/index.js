'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const HookRunner = require('./hook-runner');
const ExecutionThread = require('./execution-thread');
const OneTimeScreenshooter = require('./one-time-screenshooter');
const AssertViewError = require('../../../browser/commands/assert-view/errors/assert-view-error');
const debug = require('debug')(`hermione:worker:test-runner`);

module.exports = class TestRunner {
    static create(...args) {
        return new this(...args);
    }

    constructor(test, config, browserAgent) {
        this._test = _.cloneDeepWith(test, (val, key) => {
            // Don't clone whole tree
            if (key === 'parent') {
                return val;
            }
        });

        this._config = config;
        this._browserAgent = browserAgent;
    }

    async run({sessionId}) {
        debug(`run test in process: ${process.pid}, with title: ${this._test.fullTitle()} in sessionId: ${sessionId}`);

        const test = this._test;
        const hermioneCtx = test.hermioneCtx || {};

        let browser;

        try {
            browser = await this._browserAgent.getBrowser(sessionId);
        } catch (e) {
            debug(`catch error when get browser with sessionId: ${sessionId}`);
            throw Object.assign(e, {hermioneCtx});
        }

        const screenshooter = OneTimeScreenshooter.create(this._config, browser);
        const executionThread = ExecutionThread.create({test, browser, hermioneCtx, screenshooter});
        const hookRunner = HookRunner.create(test, executionThread);

        let error;

        try {
            // TODO: make it on browser.init when "actions" method will be implemented in all webdrivers
            if (browser.config.resetCursor) {
                debug(`reset cursor position for: ${sessionId}`);
                await this._resetCursorPosition(browser);
            }

            debug(`before run "runBeforeEachHooks" for: ${this._test.fullTitle()}`);
            await hookRunner.runBeforeEachHooks();
            debug(`after run "runBeforeEachHooks" for: ${this._test.fullTitle()}`);
            debug(`before run "it" for: ${this._test.fullTitle()}`);
            await executionThread.run(test);
            debug(`before run "it" for: ${this._test.fullTitle()}`);
        } catch (e) {
            debug(`catch error when executing beforeEach or it for: ${this._test.fullTitle()}, err: ${e.message}`);
            error = e;
        }

        if (isSessionBroken(error, this._config)) {
            debug(`mark session is broken: ${sessionId}`);
            browser.markAsBroken();
        }

        try {
            debug(`before run "runAfterEachHooks" for: ${this._test.fullTitle()}`);
            await hookRunner.runAfterEachHooks();
            debug(`after run "runAfterEachHooks" for: ${this._test.fullTitle()}`);
        } catch (e) {
            debug(`catch error when executing afterEach for: ${this._test.fullTitle()}, err: ${e.message}`);
            error = error || e;
        }

        const assertViewResults = hermioneCtx.assertViewResults;
        if (!error && assertViewResults && assertViewResults.hasFails()) {
            debug(`has fails in assertView for: ${this._test.fullTitle()}`);
            error = new AssertViewError();
        }

        hermioneCtx.assertViewResults = assertViewResults ? assertViewResults.toRawObject() : [];
        const {meta} = browser;
        const results = {hermioneCtx, meta};

        debug(`before free browser with session: ${sessionId}`);
        this._browserAgent.freeBrowser(browser);

        if (error) {
            throw Object.assign(error, results);
        } else {
            return results;
        }
    }

    async _resetCursorPosition({publicAPI: session}) {
        const baseDeprecationWarnings = session.options.deprecationWarnings;
        session.options.deprecationWarnings = false;

        await Promise.resolve(session.scroll('body', 0, 0))
            .then(() => session.moveToObject('body', 0, 0))
            .finally(() => session.options.deprecationWarnings = baseDeprecationWarnings);
    }
};

function isSessionBroken(error, {system: {patternsOnReject}}) {
    return error && patternsOnReject.some((p) => new RegExp(p).test(error.message));
}
