'use strict';

const Promise = require('bluebird');

const historyUtils = require('../../../utils/history-utils');
const debug = require('debug')(`hermione:worker:execution-thread`);

module.exports = class ExecutionThread {
    static create(...args) {
        return new this(...args);
    }

    constructor({test, browser, hermioneCtx, screenshooter}) {
        this._hermioneCtx = hermioneCtx;
        this._screenshooter = screenshooter;
        this._saveHistoryOnTestTimeout = browser.config.saveHistoryOnTestTimeout;
        this._saveHistoryOnError = browser.config.saveHistoryOnError;
        this._test = test;
        this._browser = browser;

        this._ctx = {
            browser: browser.publicAPI,
            currentTest: test
        };
    }

    async run(runnable) {
        this._setExecutionContext(Object.assign(runnable, {
            hermioneCtx: this._hermioneCtx,
            ctx: this._ctx
        }));

        let error;
        try {
            debug(`before run ${runnable.type} runnable for test: ${this._test.fullTitle()} and sessionId: ${this._browser.sessionId}`);
            await this._call(runnable);
            debug(`after run ${runnable.type} runnable for test: ${this._test.fullTitle()} and sessionId: ${this._browser.sessionId}`);
        } catch (e) {
            debug(`catch error while executing ${runnable.type} runnable fo test ${this._test.fullTitle()} and sessionId: ${this._browser.sessionId}`);
            error = e;
        }

        this._setExecutionContext(null);

        if (error) {
            debug(`before set test error for test: ${this._test.fullTitle()} and sessionId: ${this._browser.sessionId}`);
            await this._setTestErr(error);
            debug(`after set test error for test: ${this._test.fullTitle()} and sessionId: ${this._browser.sessionId}`);

            throw error;
        }
    }

    _call(runnable) {
        let fnPromise = Promise.method(runnable.fn).apply(this._ctx);

        debug(`runnable.enableTimeouts(): ${runnable.enableTimeouts()}`);
        debug(`runnable.timeout(): ${runnable.timeout()}`);

        if (runnable.enableTimeouts() && runnable.timeout()) {
            debug(`set timeout in ${runnable.type} runnable with ${runnable.timeout()} ms for test: ${this._test.fullTitle()}, sessionId: ${this._browser.sessionId}`);

            const msg = `${runnable.type} '${runnable.fullTitle()}' timed out after ${runnable.timeout()} ms`;
            fnPromise = fnPromise
                .tap((val) => {
                    debug(`${runnable.type} runnable is resolved, called BEFORE set timeout for test: ${this._test.fullTitle()}, sessionId: ${this._browser.sessionId}`);
                    return val;
                })
                .timeout(runnable.timeout(), msg);
        }

        return fnPromise
            .tap((val) => {
                debug(`${runnable.type} runnable is resolved, called AFTER set timeout for test: ${this._test.fullTitle()}, sessionId: ${this._browser.sessionId}`);
                return val;
            })
            .tapCatch((e) => {
                debug(`catch error ${e.message} during execution ${runnable.type} runnable for test ${this._test.fullTitle()}`);
                return this._screenshooter.extendWithPageScreenshot(e, this._test);
            });
    }

    _setExecutionContext(context) {
        Object.getPrototypeOf(this._ctx.browser).executionContext = context;
    }

    _shouldSaveHistory(error) {
        return this._saveHistoryOnError || (error instanceof Promise.TimeoutError &&
            this._saveHistoryOnTestTimeout);
    }

    async _setTestErr(error) {
        const test = this._ctx.currentTest;

        if (test.err) {
            return;
        }

        if (this._shouldSaveHistory(error)) {
            debug(`try to save history for test: ${this._test.fullTitle()}, sessionId: ${this._browser.sessionId}`);

            try {
                const allHistory = await this._ctx.browser.getCommandHistory();

                error.history = allHistory.map(({name, args, stack}) => ({
                    name,
                    args: args.map(historyUtils.normalizeArg),
                    stack
                }));
            } catch (e) {
                console.error(`Failed to get command history: ${e.message}`);
            }
        }

        test.err = error;
    }
};
