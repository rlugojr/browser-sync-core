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

var bs        = exports;

bs.create = function (userOptions, cb) {

    var options = transform.update(opts.merge(userOptions));
    var ports   = getPorts.fn(options);
    var online  = isOnline.fn(options);

    zip(just(options), ports, online, function (options, ports, isOnline) {
        return options
            .mergeDeep(ports)
            .set('online', isOnline);
    })
        .map(ips.resolve)
        .map(plugins.resolve)
        .map(plugins.namePlugins)
        .map(transform.afterInit)
        .map(files.merge)
        .map(middleware.merge)
        .subscribe(function (value) {
            cb(null, {
                options: value
            });
        }, function (err) {
            console.log('ERROR:', err);
            console.log(err.stack);
            cb(err);
        }, function () {
            //console.log('Setup Complete');
        });
};

module.exports = bs;