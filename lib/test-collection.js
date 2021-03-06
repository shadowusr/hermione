'use strict';

const _ = require('lodash');

module.exports = class TestCollection {
    static create(...args) {
        return new this(...args);
    }

    constructor(specs) {
        this._originalSpecs = specs;
        this._specs = _.mapValues(specs, _.clone);
    }

    getRootSuite(browserId) {
        const test = this._originalSpecs[browserId][0];
        return test && test.parent && this._getRoot(test.parent);
    }

    eachRootSuite(cb) {
        _.forEach(this._specs, (tests, browserId) => {
            const root = this.getRootSuite(browserId);
            if (root) {
                cb(root, browserId);
            }
        });
    }

    _getRoot(suite) {
        return suite.root ? suite : this._getRoot(suite.parent);
    }

    getBrowsers() {
        return Object.keys(this._specs);
    }

    mapTests(browserId, cb) {
        if (_.isFunction(browserId)) {
            cb = browserId;
            browserId = undefined;
        }

        const results = [];
        this.eachTest(browserId, (test, browserId) => results.push(cb(test, browserId)));

        return results;
    }

    sortTests(browserId, cb) {
        if (_.isFunction(browserId)) {
            cb = browserId;
            browserId = undefined;
        }

        if (browserId) {
            if (this._specs[browserId].length) {
                let pairs = _.zip(this._specs[browserId], this._originalSpecs[browserId]);

                pairs.sort((p1, p2) => cb(p1[0], p2[0]));

                [this._specs[browserId], this._originalSpecs[browserId]] = _.unzip(pairs);
            }
        } else {
            this.getBrowsers().forEach((browserId) => this.sortTests(browserId, cb));
        }

        return this;
    }

    eachTest(browserId, cb) {
        if (_.isFunction(browserId)) {
            cb = browserId;
            browserId = undefined;
        }

        if (browserId) {
            this._specs[browserId].forEach((test) => cb(test, browserId));
        } else {
            this.getBrowsers().forEach((browserId) => this.eachTest(browserId, cb));
        }
    }

    eachTestByVersions(browserId, cb) {
        const groups = _.groupBy(this._specs[browserId], 'browserVersion');
        const versions = Object.keys(groups);
        const maxLength = _(groups)
            .map((tests) => tests.length)
            .max();

        for (let idx = 0; idx < maxLength; ++idx) {
            for (const version of versions) {
                const group = groups[version];
                const test = group[idx];

                if (test) {
                    cb(test, browserId, test.browserVersion);
                }
            }
        }
    }

    disableAll(browserId) {
        if (browserId) {
            this._specs[browserId] = this._originalSpecs[browserId].map((test) => this._mkDisabledTest(test));
        } else {
            this.getBrowsers().forEach((browserId) => this.disableAll(browserId));
        }

        return this;
    }

    _mkDisabledTest(test) {
        return _.extend(Object.create(test), {disabled: true});
    }

    disableTest(fullTitle, browserId) {
        if (browserId) {
            const idx = this._findTestIndex(fullTitle, browserId);
            if (idx !== -1) {
                this._specs[browserId].splice(idx, 1, this._mkDisabledTest(this._originalSpecs[browserId][idx]));
            }
        } else {
            this.getBrowsers().forEach((browserId) => this.disableTest(fullTitle, browserId));
        }

        return this;
    }

    _findTestIndex(fullTitle, browserId) {
        return this._specs[browserId].findIndex((test) => {
            return test.fullTitle().trim() === fullTitle.trim(); // TODO: remove trim after update mocha@4+
        });
    }

    enableAll(browserId) {
        if (browserId) {
            this._specs[browserId] = _.clone(this._originalSpecs[browserId]);
        } else {
            this.getBrowsers().forEach((browserId) => this.enableAll(browserId));
        }

        return this;
    }

    enableTest(fullTitle, browserId) {
        if (browserId) {
            const idx = this._findTestIndex(fullTitle, browserId);
            if (idx !== -1) {
                this._specs[browserId].splice(idx, 1, this._originalSpecs[browserId][idx]);
            }
        } else {
            this.getBrowsers().forEach((browserId) => this.enableTest(fullTitle, browserId));
        }

        return this;
    }
};
