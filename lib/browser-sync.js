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
var plugins = require('./plugins');

var bs = exports;

bs.create = function (userOptions, cb) {

    /**
     * Options stream
     */
    var opts = startup(userOptions);

    opts
        .subscribe(options => {

            var bsServer     = server.create(options);
            var bsSocket     = sockets.create(bsServer.server, options);
            var bsWatcher    = files.getWatcher(options);
            var pauser       = new Rx.Subject();
            var injectList   = options.get('injectFileTypes').toJS();

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
                    x.type = injectList.indexOf(x.ext.slice(1)) > -1
                        ? 'inject'
                        : 'reload';
                    return x;
                });

            /**
             * Create separate streams for events that have
             * user-provided functions, ones that don't (which means we should handle it)
             * and ones that are from plugins (ie: node 'core'
             * @type {Rx.Observable<T>|Observable<T>}
             */
            var withoutfn    = coreStream.filter(x => x.item.fn === undefined);
            var withfn       = coreStream.filter(x => typeof x.item.fn === 'function');
            var pluginStream = bsWatcher.filter(x => x.namespace !== 'core');

            /**
             * When a file change event does *not* have a fn associated
             * we can handle it within 'core'. Here we split the stream based on whether
             * or not the file can be 'injected'
             */
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
             * Call any core watchers that have their own callbacks
             * Note that we matching the chokidar function signature
             * here with event, filename first
             */
            withfn.subscribe(x => x.item.fn.apply(bs, [x.event, x.file, x]));

            /**
             * Here we handle file-change events for plugins.
             */
            pluginStream
                .subscribe(x => {
                    console.log('PLUGIN', x.namespace, `'${x.event}'`, x.file);
                });

            /**
             * Enable the file-watchers
             */
            pauser.onNext(true);

            /**
             * Allow plugins to register a 'cleanup' function
             * @type {Array}
             */
            var cleanups   = [];

            /**
             * Run the server
             */
            bsServer.server.listen(8000);

            cleanups.push(function () {
                bsServer.server.close();
                bsSocket.steward.destroy();
            });

            /**
             * Exposed object to plugins/user
             * @type {{options: Map, cleanup: Function}}
             */
            var bs = {
                options: options,
                cleanup: () => cleanups.forEach(x => x.call(null)),
                clientJs: bsServer.clientJs,
                snippetMw: bsServer.snippetMw,
                watchers: {
                    core: coreStream,
                    plugins: pluginStream
                }
            };

            plugins
                .initAsync(options, bs)
                .toArray()
                .subscribe(x => {
                    cb(null, bs);
                },
                e => {
                    console.log(e.stack);
                    cb(err);
                });

        },
        (err) => {
            console.log('ERROR:', err);
            console.log(err.stack);
            cb(err);
        });
};

module.exports = bs;