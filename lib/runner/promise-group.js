'use strict';

const debug = require('debug');

module.exports = class PromiseGroup {
    constructor(scope) {
        this._count = 0;
        this._fulfilledCount = 0;
        this._dbg = debug(scope);

        this._promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }

    add(promise) {
        if (this.isFulfilled()) {
            throw new Error('Can not add promise to a fulfilled group');
        }

        this._count += 1;

        this._dbg(`added promise. current cout: ${this._count}, fullfilledCount: ${this._fulfilledCount}`);

        return promise
            .then(() => {
                this._fulfilledCount += 1;

                if (this._count === this._fulfilledCount) {
                    this._dbg('promise group resolved');
                    this._resolve();
                }
            })
            .catch(this._reject);
    }

    isFulfilled() {
        return this._count > 0 && this._count === this._fulfilledCount;
    }

    done() {
        return this._count > 0 ? this._promise : Promise.resolve();
    }
};
