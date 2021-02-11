'use strict';

const BaseBrowserAgent = require('gemini-core').BrowserAgent;
const debug = require('debug')(`hermione:master:browser-agent`);

module.exports = class BrowserAgent {
    static create(id, version, pool) {
        return new this(id, version, pool);
    }

    constructor(id, version, pool) {
        this._version = version;
        this._agent = BaseBrowserAgent.create(id, pool);
    }

    getBrowser(opts = {}) {
        opts.version = this._version;
        debug(`get browser with opts: ${JSON.stringify(opts)}`);

        return this._agent.getBrowser(opts);
    }

    freeBrowser(browser) {
        debug(`free browser: ${browser.id}`);

        return this._agent.freeBrowser(browser, {force: browser.state.isBroken});
    }

    get browserId() {
        return this._agent.browserId;
    }
};
