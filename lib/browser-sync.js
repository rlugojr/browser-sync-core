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
var sockets = require('./sockets');

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

            var bsServer   = server.create(options);
            var bsSocket   = sockets.create(bsServer.server, options);
            var bsWatcher  = files.getWatcher(options);
            var pauser     = new Rx.Subject();

            var injectList = options.get('injectFileTypes').toJS();

            /**
             * Create a watcher that is only concerned with 'core'
             * ie: files that are provided in regular options.
             * Only list for 'change' events for now & decorate
             * with a type of either 'inject' or 'reload' depending
             * on whether we thing the resource can be 'injected'
             * @type {Rx.Observable}
             */
            var coreStream = bsWatcher
                .pausable(pauser)
                .filter(x => x.namespace === 'core')
                .filter(x => x.event === 'change')
                .map(x => {
                    x.type = injectList.indexOf(x.file.match(/\.(.+?)$/)[1]) > -1
                        ? 'inject'
                        : 'reload';
                    return x;
                });

            var withoutfn = coreStream.filter(x => x.item.fn === undefined);
            var withfn    = coreStream.filter(x => typeof x.item.fn === 'function');

            var bs = {
                options: options,
                cleanup: () => cleanups.forEach(x => x.call(null))
            };

            withoutfn
                .filter(x => x.type === 'reload')
                .subscribe(x => {
                    console.log('RELOAD', x.namespace, `'${x.event}'`, x.file);
                    bsSocket.io.emit('browser:reload');
                });

            withoutfn
                .filter(x => x.type === 'inject')
                .subscribe(x => {
                    console.log('INJECT', x.namespace, `'${x.event}'`, x.file);
                    bsSocket.io.emit('browser:reload');
                });

            /**
             * Call any core watchers
             * that have their own callbacks
             * Note that we matching the chokidar function signature
             * here with event, filename first
             */
            withfn.subscribe(x => x.item.fn.apply(bs, [x.event, x.file, x]));

            var pluginStream = bsWatcher
                .filter(x => x.namespace !== 'core')
                .subscribe(x => {
                    console.log('PLUGIN', x.namespace, `'${x.event}'`, x.file);
                });

            pauser.onNext(true);

            var cleanups   = [];

            bsServer.server.listen(8000);

            cleanups.push(function () {
                bsServer.server.close();
                bsSocket.steward.destroy();
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

            //function sub(){
            //    setInterval(function () {
            //        clientJS.pop();
            //    }, 1000);
            //}
            //clientJS.map(function (item) {
            //    return item.content;
            //}).join(';');

            cb(null, bs);
        },
        (err) => {
            console.log('ERROR:', err);
            console.log(err.stack);
            cb(err);
        });
};

module.exports = bs;