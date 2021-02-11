'use strict';

const q = require('q');
const Browser = require('./browser');
const signalHandler = require('../signal-handler');
const logger = require('../utils/logger');
const debug = require('debug')(`hermione:master:new-browser`);

module.exports = class NewBrowser extends Browser {
    constructor(config, id, version) {
        super(config, id, version);

        signalHandler.on('exit', () => this.quit());
    }

    init() {
        return q(() => this._session)
            .call()
            .then(() => {
                debug(`session created for browser: ${this.id} and sessionId: ${this.sessionId}`);
                return this.setHttpTimeout(this._config.sessionRequestTimeout);
            })
            .then(() => this._session.init())
            .then(() => {
                debug(`session inited for browser: ${this.id} and sessionId: ${this.sessionId}`);
                return this.restoreHttpTimeout();
            })
            .then(() => this._setPageLoadTimeout())
            .thenResolve(this);
    }

    _setPageLoadTimeout() {
        if (!this._config.pageLoadTimeout) {
            return Promise.resolve();
        }

        debug(`set page load timeout: ${this._config.pageLoadTimeout}`);

        return this._config.w3cCompatible
            ? this._session.timeouts({'pageLoad': this._config.pageLoadTimeout})
            : this._session.timeouts('page load', this._config.pageLoadTimeout);
    }

    reset() {
        return Promise.resolve();
    }

    quit() {
        debug(`before quit from browser: ${this.id} and sessionId: ${this.sessionId}`);
        // Do not work without 'then' because of webdriverio realization of promise API
        return this._session
            .then(() => {
                debug(`set session quit timeout: ${this._config.sessionQuitTimeout} for sessionId: ${this.sessionId}`);
                return this.setHttpTimeout(this._config.sessionQuitTimeout);
            })
            .then(() => this._session.end())
            .then((res) => {
                debug(`after session is ended for sessionId: ${this.sessionId}`);
                return res;
            })
            .catch((e) => logger.warn(`WARNING: Can not close session: ${e.message}`));
    }
};
