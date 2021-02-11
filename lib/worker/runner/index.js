'use strict';

const AsyncEmitter = require('gemini-core').events.AsyncEmitter;
const {passthroughEvent} = require('gemini-core').events.utils;
const RunnerEvents = require('../constants/runner-events');
const BrowserPool = require('./browser-pool');
const BrowserAgent = require('./browser-agent');
const TestRunner = require('./test-runner');
const CachingTestParser = require('./caching-test-parser');
const debug = require('debug')(`hermione:worker:runner`);

module.exports = class Runner extends AsyncEmitter {
    static create(config) {
        return new Runner(config);
    }

    constructor(config) {
        super();

        this._config = config;
        this._browserPool = BrowserPool.create(this._config, this);

        this._testParser = CachingTestParser.create(config);
        passthroughEvent(this._testParser, this, [
            RunnerEvents.BEFORE_FILE_READ,
            RunnerEvents.AFTER_FILE_READ,
            RunnerEvents.AFTER_TESTS_READ
        ]);
    }

    runTest(fullTitle, {browserId, browserVersion, file, sessionId}) {
        debug(`before parse tests from file: ${file} and browserId: ${browserId}`);
        const tests = this._testParser.parse({file, browserId});
        const test = tests.find((t) => t.fullTitle() === fullTitle);
        debug(`found test to run with title: ${test.fullTitle()}`);
        const browserAgent = BrowserAgent.create(browserId, browserVersion, this._browserPool);
        const runner = TestRunner.create(test, this._config.forBrowser(browserId), browserAgent);

        debug(`run tests in browser with sessionId: ${sessionId}`);

        return runner.run({sessionId});
    }
};
