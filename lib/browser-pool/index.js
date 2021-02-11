'use strict';

const {BrowserPool} = require('gemini-core');
const QBrowserPool = require('./q-browser-pool');
const Browser = require('../browser/new-browser');
const Events = require('../constants/runner-events');

const debug = require('debug')(`hermione:master:browser-pool`);

exports.create = function(config, emitter) {
    const BrowserManager = {
        create: (id, version) => {
            debug(`try to create session with id: ${id} and version: ${version}`);
            return Browser.create(config, id, version);
        },

        start: (browser) => {
            debug(`before init browser`);
            return browser.init();
        },
        onStart: (browser) => {
            debug(`before emit session start`);
            return emitSessionEvent(emitter, browser, Events.SESSION_START);
        },

        onQuit: (browser) => {
            debug(`before emit session end`);
            return emitSessionEvent(emitter, browser, Events.SESSION_END);
        },
        quit: (browser) => {
            debug(`before quit browser`);
            return browser.quit();
        }
    };

    const configAdapter = {
        forBrowser: (id) => {
            const browserConfig = config.forBrowser(id);
            return {
                parallelLimit: browserConfig.sessionsPerBrowser,
                sessionUseLimit: browserConfig.testsPerSession
            };
        },

        getBrowserIds: () => config.getBrowserIds(),

        get system() {
            return config.system;
        }
    };

    return QBrowserPool.create(BrowserPool.create(BrowserManager, {
        logNamespace: 'hermione',
        config: configAdapter
    }));
};

function emitSessionEvent(emitter, browser, event) {
    return emitter.emitAndWait(event, browser.publicAPI, {browserId: browser.id, sessionId: browser.sessionId});
}
