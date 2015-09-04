'use strict';

var Rx       = require('rx');
var just     = Rx.Observable.just;
var online   = Rx.Observable.fromNodeCallback(require('dns').resolve);
var isUndefined = require('./utils').isUndefined;

/**
 * @param {Map} options
 * @returns {Observable}
 */
module.exports.fn = function isOnline(options) {
    var opt = options.get('online');
    if (isUndefined(opt)) {
        return online('www.google.com')
            .flatMap(just(true))
            .catch(just(false));
    }
    return just(opt);
};