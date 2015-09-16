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
var clientJs = require('./client-js');
var middleware = require('./middleware');
var rewriteRules = require('./rewrite-rules');

var bs = exports;

bs.create = function (userOptions, cb) {

    startup(userOptions).subscribe(go, err => {
        console.log('ERROR:', err);
        console.log(err.stack);
        cb(err);
    });

    /**
     * Options stream
     */
    function go(options) {

        var bsServer   = server.create(options);
        var bsSocket   = sockets.create(bsServer.server, options);
        var bsWatcher  = files.getWatcher(options);
        var injectList = options.get('injectFileTypes').toJS();

        var offSwitch  = new Rx.Subject();
        var stdin      = Rx.Observable
            .fromEvent(process.stdin, 'data')
            .map(x => x.toString())
            .map(x => x.slice(null, -1));

        var onstate    = Rx.Observable.just(true);
        var offState   = Rx.Observable.merge(offSwitch, stdin.filter(x => x === 'off'));
        var pauser     = Rx.Observable.merge(onstate, stdin.filter(x => x === 'on'))
            .flatMapLatest(() => bsWatcher.takeUntil(offState));

        /**
         * Create a watcher that is only concerned with 'core'
         * ie: files that are provided in regular options.
         * Only list for 'change' events for now & decorate
         * with a type of either 'inject' or 'reload' depending
         * on whether we thing the resource can be 'injected'
         * @type {Rx.Observable}
         */
        var coreStream = pauser
            .filter(x => x.namespace === 'core')
            .filter(x => x.event === 'change')
            .map(x => {
                x.type = injectList.indexOf(x.ext.slice(1)) > -1
                    ? 'inject'
                    : 'reload';
                return x;
            });

        /**
         * Reload with no supplied FN (handle in core)
         */
        coreStream
            .filter(x => x.item.fn === undefined)
            .filter(x => x.type === 'reload')
            .subscribe(x => console.log('1: without FN, RELOAD:', x.file, x.item.options));

        /**
         * Inject with no supplied FN (handle in core)
         */
        coreStream
            .filter(x => x.item.fn === undefined)
            .filter(x => x.type === 'inject')
            .subscribe(x => console.log('1: without FN, INJECT:', x.file));

        /**
         * Any type that has a FN - just call that fn
         */
        coreStream
            .filter(x => typeof x.item.fn === 'function')
            .subscribe(x => x.item.fn.apply(null, [x.event, x.file, x]));

        /**
         * Allow plugins to register a 'cleanup' function
         * @type {Array}
         */
        var cleanups = [];

        /**
         * Run the server
         */
        console.log(options.get('port'));
        bsServer.server.listen(options.get('port'));

        cleanups.push(function () {
            offSwitch.onNext(false);
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
            snippetMw: bsServer.snippetMw,
            watchers: {
                core: coreStream
            },
            plugin: function (ns, fn) {
                if (ns === 'option:clientJs') {
                    options = options.update('clientJs', x => clientJs.fromJS(fn(x.toJS())));
                }

                if (ns === 'option:rewriteRules') {
                    options = options.update('rewriteRules', x => rewriteRules.fromJS(fn(x.toJS())));
                }

                if (ns === 'option:middleware') {
                    options = options.update('middleware', x => middleware.fromJS(fn(x.toJS())));
                }

                if (ns === 'files:watcher') {
                    arguments[2](pauser.filter(x => x.namespace === arguments[1]));
                }

                if (ns.match(/^option:/)) {
                    applyMw(options);
                }
            }
        };

        function applyMw(options) {
            bsServer.app.stack = middleware.getMiddleware(options).middleware;
        }

        plugins
            .initAsync(options, bs)
            .toArray()
            .subscribe(x => {
                //console.log(bs.options.get('plugins').toJS());
                cb(null, bs);
            },
                e => {
                console.log(e.stack);
                cb(err);
            });
    }
};

module.exports = bs;
