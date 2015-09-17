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
var logger = require('./logger');
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
            .do(x => console.log('1: without FN, RELOAD:', x.file, x.item.options))
            .subscribe();

        /**
         * Inject with no supplied FN (handle in core)
         */
        coreStream
            .filter(x => x.item.fn === undefined)
            .filter(x => x.type === 'inject')
            .do(x => console.log('1: without FN, INJECT:', x.file))
            .subscribe();

        /**
         * Any type that has a FN - just call that fn
         */
        coreStream
            .filter(x => typeof x.item.fn === 'function')
            .do(x => x.item.fn.apply(null, [x.event, x.file, x]))
            .subscribe();

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
         * These functions are called when the plugin call is 'option:<name>`
         * @type {{clientJs: Function, rewriteRules: Function, middleware: Function}}
         */
        var optionUpdaters = {
            clientJs: (fn) => options.update('clientJs', x => clientJs.fromJS(fn(x.toJS()))),
            rewriteRules: (fn) => options.update('rewriteRules', x => rewriteRules.fromJS(fn(x.toJS()))),
            middleware: (fn) => options.update('middleware', x => middleware.fromJS(fn(x.toJS())))
        };

        /**
         * Handle a stream of plugin calls.
         * EG: bs.plugin('option:ghostMode', fn)
         */
        var pluginCalls = new Rx.Subject();

        /**
         * Split function params into namespace/args
         * where the first arg is always the namespace such as
         * option:middleware or option:ghostMode.forms etc
         */
        var pluginFnCalls = pluginCalls
            .map(args => {
                return {
                    namespace: args[0].split(':'),
                    args: args.slice(1)
                }
            });

        /**
         * Handle a stream of option namespaced plugin calls only
         * Create selector field by using the remainder following `:`
         * such as option:ghostMode => 'ghostMode'
         */
        var optSet = pluginFnCalls
            .where(x => x.namespace[0] === 'option')
            .map(x => {
                x.selector = x.namespace[1];
                return x;
            });

        /**
         * Pass off the handler to optionUpdaters functions
         */
        optSet
            .filter(x => Object.keys(optionUpdaters).indexOf(x.selector) > -1)
            .map(x => optionUpdaters[x.selector](x.args[0]))
            .do(x => {
                options = x;
                return x;
            })
            .do(x => applyMw(x))
            .do(x => console.log('Setting middleware'))
            .subscribe();

        /**
         * When there's no associated updater function, just send the value
         * and reset it
         */
        optSet
            .filter(x => Object.keys(optionUpdaters).indexOf(x.selector) === -1)
            .map(x => {
                return options.updateIn(x.selector.split('.'), opt => {
                    //if (Immutable.Map.isMap(opt) || Immutable.List.isList(opt)) {
                    //    opt = opt.toJS();
                    //}
                    return Immutable.fromJS(x.args[0](opt));
                });
            })
            .do(x => options = x)
            .do(x => console.log('Setting options'))
            .subscribe();

        /**
         * Handle the files:watcher plugin interface.
         * signature: 'files:watcher', 'namespace', function
         * Call the function with a filtered stream containing
         * only file-watcher event for the given namespace
         */
        pluginFnCalls
            .where(x => x.namespace[0] === 'files')
            .map(x => {
                return {
                    namespace: x.args[0],
                    fn: x.args[1]
                }
            })
            .do(x => x.fn(pauser.filter(event => event.namespace === x.namespace)))
            .subscribe();


        /**
         * Exposed object to plugins/user
         * @type {{options: Map, cleanup: Function}}
         */
        var bs = {
            options: options,
            cleanup: () => cleanups.forEach(x => x.call(null)),
            registerCleanupTask: fn => cleanups.push(fn),
            getSocketIoScript: connectUtils.getSocketIoScript,
            getExternalSocketConnector: (opts) => {
                return connectUtils.socketConnector(
                    options.withMutations(function (item) {
                        item.set("socket", item.get("socket").merge(opts));
                        if (!options.getIn(["proxy", "ws"])) {
                            item.set("mode", "snippet");
                        }
                    })
                );
            },
            config: config,
            snippetMw: bsServer.snippetMw,
            watchers: {
                core: coreStream
            },
            utils: require('./utils'),
            getLogger: logger.getLogger,
            io: bsSocket.io,
            sockets: bsSocket,
            plugin: function (ns, fn) {
                pluginCalls.onNext(Array.from(arguments));
            }
        };

        function applyMw(options) {
            bsServer.app.stack = middleware.getMiddleware(options).middleware;
        }

        /**
         * Resolve all async plugin initialisers
         * and then call the callback to indicate all
         * are complete
         */
        plugins
            .initAsync(options, bs)
            .toArray()
            .subscribe(x => {
                cb(null, bs);
            },
                e => {
                console.log(e.stack);
                cb(e);
            });
    }
};

module.exports = bs;
