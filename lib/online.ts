'use strict';

const Rx       = require('rx');
const just     = Rx.Observable.just;
const online   = Rx.Observable.fromNodeCallback(require('dns').resolve);

import utils from './utils';

/**
 * @param {Map} options
 * @returns {Observable}
 */
module.exports.fn = function isOnline(options) {
    const opt = options.get('online');
    if (utils.isUndefined(opt)) {
        return online('www.google.com')
            .flatMap(just(true))
            .catch(just(false));
    }
    return just(opt);
};
