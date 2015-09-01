'use strict';

var Rx   = require('rx');
var just = Rx.Observable.just;
var zip  = Rx.Observable.zip;

module.exports.resolve = function resolve(options) {
    var plugins = options.get('plugins').reduce(function (all, item) {

    }, {});
    return Rx.Observable.just(options);
};