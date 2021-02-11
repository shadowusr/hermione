'use strict';

const _ = require('lodash');
const debug = require('debug')(`hermione:master:regular-test-runner`);
const Runner = require('../runner');
const logger = require('../../utils/logger');
const Events = require('../../constants/runner-events');
const AssertViewResults = require('../../browser/commands/assert-view/assert-view-results');

module.exports = class RegularTestRunner extends Runner {
    constructor(test, browserAgent) {
        super();

        this._test = Object.create(test);
        this._browserAgent = browserAgent;
        this._browser = null;
    }

    async run(workers) {
        let freeBrowserPromise;

        try {
            debug('try to get browser');
            const browser = await this._getBrowser();

            if (browser) {
                debug(`subscribe on worker event: "worker.${browser.sessionId}.freeBrowser"`);
                workers.once(`worker.${browser.sessionId}.freeBrowser`, (browserState) => {
                    debug(`worker emited event: worker.${browser.sessionId}.freeBrowser`);
                    freeBrowserPromise = this._freeBrowser(browserState);
                });
            }

            this._emit(Events.TEST_BEGIN);

            this._startTime = Date.now();
            const results = await this._runTest(workers);
            this._applyTestResults(results);

            this._emit(Events.TEST_PASS);
        } catch (error) {
            this._test.err = error;

            this._applyTestResults(error);

            this._emit(Events.TEST_FAIL);
        }

        this._emit(Events.TEST_END);

        await (freeBrowserPromise || this._freeBrowser());
    }

    _emit(event) {
        this.emit(event, this._test);
    }

    async _runTest(workers) {
        if (!this._browser) {
            debug(`browser does not exists, throw err: ${this._test.err}`);
            throw this._test.err;
        }

        debug(`run test in worker with title: ${this._test.fullTitle()}, browser: ${this._browser.id}:${this._browser.version}, sessionId: ${this._browser.sessionId}, file: ${this._test.file}`);

        return await workers.runTest(
            this._test.fullTitle(),
            {
                browserId: this._browser.id,
                browserVersion: this._browser.version,
                sessionId: this._browser.sessionId,
                file: this._test.file
            }
        );
    }

    _applyTestResults({meta, hermioneCtx = {}}) {
        debug(`apply test results`);
        hermioneCtx.assertViewResults = AssertViewResults.fromRawObject(hermioneCtx.assertViewResults || []);
        this._test.assertViewResults = hermioneCtx.assertViewResults.get();

        this._test.meta = _.extend(this._test.meta, meta);
        this._test.hermioneCtx = hermioneCtx;

        this._test.duration = Date.now() - this._startTime;
    }

    async _getBrowser() {
        try {
            this._browser = await this._browserAgent.getBrowser();
            this._test.sessionId = this._browser.sessionId;

            debug(`got browser with sessionId: ${this._browser.sessionId} for test: ${this._tests.fullTitle()}`);

            return this._browser;
        } catch (error) {
            this._test.err = error;
        }
    }

    async _freeBrowser(browserState = {}) {
        if (!this._browser) {
            return;
        }

        debug(`try to free browser with: ${this._browser.sessionId}"`);

        const browser = this._browser;
        this._browser = null;

        browser.applyState(browserState);

        try {
            await this._browserAgent.freeBrowser(browser);
        } catch (error) {
            logger.warn(`WARNING: can not release browser: ${error}`);
        }
    }
};
