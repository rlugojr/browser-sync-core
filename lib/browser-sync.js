'use strict';

var Immutable = require('immutable');
var Rx = require('rx');
var zip = Rx.Observable.zip;
var just = Rx.Observable.just;

var startup = require('./startup');
var files = require('./files');

var bs = exports;

bs.create = function (userOptions, cb) {

    /**
     * Options stream
     */
    var opts    = startup(userOptions);
    var watcher = files.getWatcher(opts)
        .publish()
        .refCount();

    var first = watcher
        .filter(function (event) {
            return event.item.fn === undefined;
        })
        .subscribe(function (val) {
            console.log(' NO FN: ', val.namespace, val.file, val.event);
        }, function (err) {
            console.log(err.stack);
        });

    var second = watcher
        .filter(function (event) {
            return typeof event.item.fn === 'function';
        })
        .subscribe(function (event) {
            console.log('HAS FN: ', event.namespace, event.file, event.event);
            event.item.fn.call(null, event.event, event.file, event);
        }, function (err) {
            console.log(err.stack);
        });

    opts
        .subscribe(function (opts) {
            cb(null, {
                options: opts,
                watchers: [first, second]
            });
        }, function (err) {
            console.log('ERROR:', err);
            console.log(err.stack);
            cb(err);
        });
    //
    //var server = opts
    //    .subscribe(function (value) {
    //        console.log('From Server init');
    //        //cb(null, {
    //        //    options: value
    //        //});
    //    }, function (err) {
    //        console.log('ERROR:', err);
    //        console.log(err.stack);
    //        cb(err);
    //    }, function () {
    //        //console.log('Setup Complete');
    //    });
};

module.exports = bs;