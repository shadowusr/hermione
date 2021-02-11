'use strict';

const debug = require('debug')(`hermione:master:high-priority-browser-agent`);

module.exports = class HighPriorityBrowserAgent {
    static create(...args) {
        return new this(...args);
    }

    constructor(browserAgent) {
        this._browserAgent = browserAgent;
    }

    getBrowser() {
        debug(`get browser: ${this._browserAgent.browserId}`);
        return this._browserAgent.getBrowser({highPriority: true});
    }

    freeBrowser(...args) {
        debug(`free browser: ${this._browserAgent.browserId}`);
        return this._browserAgent.freeBrowser(...args);
    }
};
