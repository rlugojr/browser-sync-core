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
var fileWatcher = require('./file-watcher');
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
    function go (options) {

        var bsServer     = server.create(options);
        var bsSocket     = sockets.create(bsServer.server, options);
        var bsWatcher    = files.getWatcher(options);

        var offSwitch    = new Rx.Subject();
        var stdin        = Rx.Observable
            .fromEvent(process.stdin, 'data')
            .map(x => x.toString())
            .map(x => x.slice(null, -1));

        var onstate      = Rx.Observable.just(true);
        var offState     = Rx.Observable.merge(offSwitch, stdin.filter(x => x === 'off'));
        var pauser       = Rx.Observable.merge(onstate, stdin.filter(x => x === 'on'))
            .flatMapLatest(() => bsWatcher.takeUntil(offState));

        /**
         * Core file-watcher stream
         */
        var corestream = fileWatcher.handleCore(pauser, options);

        /**
         *
         */
        corestream
            .where(x => x.type === 'reload')
            .do(x => bsSocket.io.emit('browser:reload'))
            .subscribe();

        corestream
            .where(x => x.type === 'inject')
            .do(x => bsSocket.io.emit('file:reload', x))
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
            clientJs: (fn, options) => options.update('clientJs', x => clientJs.fromJS(fn(x.toJS()))),
            rewriteRules: (fn, options) => options.update('rewriteRules', x => rewriteRules.fromJS(fn(x.toJS()))),
            middleware: (fn, options) => options.update('middleware', x => middleware.fromJS(fn(x.toJS())))
        };

        /**
         * @param options
         * @param selector
         * @param fn
         * @returns {*}
         */
        function optionUpdater (options, selector, fn) {

            if (Object.keys(optionUpdaters).indexOf(selector) > -1) {
                return optionUpdaters[selector](fn, options);
            } else {
                return options.updateIn(selector.split('.'), opt => {
                    //if (Immutable.Map.isMap(opt) || Immutable.List.isList(opt)) {
                    //    opt = opt.toJS();
                    //}
                    return Immutable.fromJS(fn.call(null, opt));
                });
            }
        }

        /**
         * Exposed object to plugins/user
         */
        var plugUpdates = new Rx.Subject();
        var bs = {
            /**
             * Quite servers, remove event listeners, kill timers, stop
             * file-watchers. Allows the process to exit
             */
            cleanup: () => cleanups.forEach(x => x.call(null)),
            /**
             * Push a cleanup task into the stack
             * @param {function} fn
             */
            registerCleanupTask: fn => cleanups.push(fn),
            /**
             * Expose Browsersync config
             */
            config: config,
            /**
             * Expose Browsersync utils
             */
            utils: require('./utils'),
            /**
             * Allow logger to be extended
             */
            getLogger: logger.getLogger,
            /**
             * Expose socket.io instance
             */
            io: bsSocket.io,
            /**
             * Expose all socket properties
             */
            sockets: bsSocket,
            /**
             * Get a file-watcher for a specfic namespace
             *
             * bs.plugin('files:watcher', 'core')
             *   .filter(x => x.event !== 'add')
             *   .subscribe(x => console.log('from plugin', x.file, x.event));
             * @param {string} namespace
             * @returns {Rx.Observable}
             */
            getWatcher: function (namespace) {
                return pauser
                    .filter(x => x.namespace === namespace)
                    .filter(x => x.item.fn === undefined);
            },
            /**
             * return an observable for listening to plugin updates
             * @param {string} name
             * @returns {Rx.Observable}
             */
            pluginUpdates: function (name) {
                return plugUpdates
                    .filter(x => x.get('name') === name)
                    .map(x => x.toJS())
                    .publish().refCount();
            },
            /**
             * @param {string} name - the name of the plugin
             * @param {function} fn - the updater function
             * @returns {Rx.Observable}
             */
            updatePlugin: function (name, fn) {
                return Rx.Observable
                    .just(options.update('plugins', x => {
                        return x.map(plug => {
                            if (plug.get('name') === name) {
                                var res = fn.call(null, plug);
                                plugUpdates.onNext(res);
                                return res;
                            }
                            return plug;
                        });
                    }))
                    .do(x => options = x)
                    .publish().refCount();
            },
            /**
             * Interface for setting an option
             * Note: Some options have custom updaters (such as
             * clientJs, middleware & rewriteRules.
             * If no custom updater exists for an option, we just
             * call the user fn and set the result
             * @param {string} selector - option selector such as 'middleware' or 'ghostMode.forms.toggle'
             * @param {function} fn - updater function
             * @returns {Rx.Observable}
             */
            setOption: function (selector, fn) {
                return Rx.Observable.just({
                    selector: selector,
                    fn: fn,
                    options: options
                })
                .flatMap(x => Rx.Observable.just(optionUpdater(x.options, x.selector, x.fn)))
                .do(applyMw)
                .do(x => options = x)
                //.do(x => console.log('setting plugin', x.get('plugins').toJS()))
                .publish().refCount();
            },
            /**
             * Allow plugins to also load the same socket.io script
             * used by Browsersync
             */
            getSocketIoScript: connectUtils.getSocketIoScript,
            /**
             * Allow plugins to retrieve the external socket connector
             * @param {Map} opts
             * @returns {string}
             */
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
            plugin: function () {}
        };

        Object.defineProperty(bs, 'options', {
            get: function () {
                return options;
            },
            set: function (val) {
                return options = val;
            }
        });

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
