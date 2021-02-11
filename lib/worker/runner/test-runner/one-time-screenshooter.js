'use strict';

const _ = require('lodash');
const {Image} = require('gemini-core');
const logger = require('../../../utils/logger');
const debug = require('debug')(`hermione:worker:one-time-screenshoter`);

module.exports = class OneTimeScreenshooter {
    static create(...args) {
        return new this(...args);
    }

    constructor(config, browser) {
        this._config = config;
        this._browser = browser;
        this._screenshotTaken = false;
    }

    async extendWithPageScreenshot(error, test) {
        if (!this._config.screenshotOnReject || error.screenshot || this._screenshotTaken) {
            debug(`do not save screenshot if it is already taken or disabled, this._config.screenshotOnReject: ${this._config.screenshotOnReject}`);
            return error;
        }

        debug(`inside extendWithPageScreenshot with error: ${error} for test: ${test.fullTitle()}`);

        this._screenshotTaken = true;
        debug(`before set http timeout with value ${this._config.screenshotOnRejectTimeout} for make screenshot on reject for test: ${test.fullTitle()}`);
        this._browser.setHttpTimeout(this._config.screenshotOnRejectTimeout);

        try {
            debug(`before take screenshot for test: ${test.fullTitle()}`);
            const {value: base64} = await this._browser.publicAPI.screenshot();
            debug(`after take screenshot for test: ${test.fullTitle()}`);
            const img = Image.fromBase64(base64);
            debug(`after create img for test: ${test.fullTitle()}`);
            const size = img.getSize();

            debug(`screenshot is taken with size: ${size} for test: ${test.fullTitle()}`);

            error = _.extend(error, {screenshot: {base64, size}});
        } catch (e) {
            logger.warn(`WARN: Failed to take screenshot on reject: ${e}`);
            debug(`error during take screenshot for test: ${test.fullTitle()}`);
        }

        debug(`before set http timeout after make screenshot on reject for test: ${test.fullTitle()}`);
        this._browser.restoreHttpTimeout();

        return error;
    }
};
