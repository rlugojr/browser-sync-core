'use strict';

var Immutable = require('immutable');
var Rx        = require('rx');
var zip       = Rx.Observable.zip;
var just      = Rx.Observable.just;

var opts       = require('./incoming-options');
var transform  = require('./transform-options');
var getPorts   = require('./ports');
var files      = require('./files');
var middleware = require('./middleware');
var isOnline   = require('./online');
var ips        = require('./ips');
var plugins    = require('./plugins');

module.exports = function (userOptions) {

    var options = transform.update(opts.merge(userOptions));
    var ports   = getPorts.fn(options);
    var online  = isOnline.fn(options);

    return zip(just(options), ports, online, function (options, ports, isOnline) {
        return options
            .mergeDeep(ports)
            .set('online', isOnline);
    })
        .map(ips.resolve)
        .map(plugins.resolve)
        .map(plugins.namePlugins)
        .map(transform.afterInit)
        .map(middleware.merge)
        .map(files.merge);
};