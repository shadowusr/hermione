'use strict';

const eventsUtils = require('gemini-core').events.utils;
const debug = require('debug')(`hermione:worker`);

const RunnerEvents = require('./constants/runner-events');
const Runner = require('./runner');
const BaseHermione = require('../base-hermione');

module.exports = class Hermione extends BaseHermione {
    constructor(configPath) {
        super(configPath);

        debug(`process created: config+plugins, pid: ${process.pid}`);

        this._runner = Runner.create(this._config);

        eventsUtils.passthroughEvent(this._runner, this, [
            RunnerEvents.BEFORE_FILE_READ,
            RunnerEvents.AFTER_FILE_READ,

            RunnerEvents.AFTER_TESTS_READ,

            RunnerEvents.NEW_BROWSER,
            RunnerEvents.UPDATE_REFERENCE
        ]);
    }

    init() {
        return this._init();
    }

    runTest(fullTitle, options) {
        debug(`run test with fullTitle: ${fullTitle} and options: ${JSON.stringify(options)}`);
        return this._runner.runTest(fullTitle, options);
    }

    isWorker() {
        return true;
    }
};
