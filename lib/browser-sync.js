'use strict';

var Immutable = require('immutable');
var Rx = require('rx');
var zip = Rx.Observable.zip;
var just = Rx.Observable.just;

var startup = require('./startup');
var fs = require('fs');
var config = require('./config');
var path = require('path');
var files = require('./files');
var connectUtils = require('./connect-utils');
var bsClient = require('browser-sync-client');
var connect = require('connect');
var http = require('http');
var server = require('./server');

var bs = exports;

bs.create = function (userOptions, cb) {

    /**
     * Options stream
     */
    var opts = startup(userOptions);

    //var watcher = files.getWatcher(opts)
    //    .publish()
    //    .refCount();
    //
    //var first = watcher
    //    .filter(function (event) {
    //        return event.item.fn === undefined;
    //    })
    //    .subscribe(function (val) {
    //        console.log(' NO FN: ', val.namespace, val.file, val.event);
    //    }, function (err) {
    //        console.log(err.stack);
    //    });
    //
    //var second = watcher
    //    .filter(function (event) {
    //        return typeof event.item.fn === 'function';
    //    })
    //    .subscribe(function (event) {
    //        console.log('HAS FN: ', event.namespace, event.file, event.event);
    //        event.item.fn.call(null, event.event, event.file, event);
    //    }, function (err) {
    //        console.log(err.stack);
    //    });

    opts
        .subscribe(options => {

            var bsServer = server.create(options);
            var cleanups = [];

            bsServer.server.listen(8000);

            cleanups.push(function () {
                bsServer.server.close();
            });

            var count = 0;

            var int = setInterval(function () {
                if (count > 5) {
                    return clearInterval(int);
                    //sub();
                }
                bsServer.clientJs.push({
                    id: 'bs-auto-' + String(count += 1),
                    content: count
                });
            }, 1000);

            //
            //function sub(){
            //    setInterval(function () {
            //        clientJS.pop();
            //    }, 1000);
            //}
            //clientJS.map(function (item) {
            //    return item.content;
            //}).join(';');

            cb(null, {
                options: options,
                cleanup: () => cleanups.forEach(x => x.call(null))
            });
        },
        err => {
            console.log('ERROR:', err);
            console.log(err.stack);
            cb(err);
        });
};

module.exports = bs;