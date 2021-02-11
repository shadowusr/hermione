'use strict';

const debug = require('debug')(`hermione:worker:browser-agent`);

module.exports = class BrowserAgent {
    static create(browserId, browserVersion, pool) {
        return new BrowserAgent(browserId, browserVersion, pool);
    }

    constructor(browserId, browserVersion, pool) {
        this.browserId = browserId;
        this.browserVersion = browserVersion;

        this._pool = pool;
    }

    getBrowser(sessionId) {
        debug(`get browser with sesionId: ${sessionId}`);
        return this._pool.getBrowser(this.browserId, this.browserVersion, sessionId);
    }

    freeBrowser(browser) {
        debug(`free browser with sesionId: ${browser.sessionId}`);
        this._pool.freeBrowser(browser);
    }
};
