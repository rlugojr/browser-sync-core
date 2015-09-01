'use strict';

var Immutable = require('immutable');
var Rx = require('rx');
var zip = Rx.Observable.zip;
var just = Rx.Observable.just;

var opts         = require('./incoming-options');
var transform    = require('./transform-options');
var getPorts     = require('./ports');
var isOnline     = require('./online');
var plugins      = require('./plugins');

var bs = exports;

bs.create = function (userOptions, cb) {

    var options = transform.update(opts.merge(userOptions));
    var ports   = getPorts.fn(options);
    var online  = isOnline.fn(options);

    zip(just(options), ports, online, function (options, ports, isOnline) {
        return options
            .mergeDeep(ports)
            .set('online', isOnline);
        })
        .map(function (options) {
            return options.mergeDeep({
               externalIps: require('dev-ip')()
            });
        })
        .map(plugins.resolve)
        .map(transform.afterInit)
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