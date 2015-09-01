'use strict';

var _        = require('lodash');
var Rx       = require('rx');
var just     = Rx.Observable.just;
var online   = Rx.Observable.fromNodeCallback(require("dns").resolve);

/**
 * @param {Map} options
 * @returns {Observable}
 */
module.exports.fn = function isOnline(options) {
    var opt = options.get('online');
    if (_.isUndefined(opt)) {
        return online("www.google.com")
            .flatMap(just(true))
            .catch(just(false));
    }
    return just(opt);
};