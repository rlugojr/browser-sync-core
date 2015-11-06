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
var server = require('./server');
var sockets = require('./sockets');
var plugins = require('./plugins');
var clientJs = require('./client-js');
var middleware = require('./middleware');
var protocol = require('./protocol');
var logger = require('./logger');
var utils = require('./utils');
var rewriteRules = require('./rewrite-rules');
var transform    = require('./transform-options');
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

        var optSub       = new Rx.BehaviorSubject(options);
        var options$     = optSub.share();
        var clients      = new Rx.BehaviorSubject(options.get('clientOptions'));
        var clients$     = clients.share().distinctUntilChanged();

        var bsServer     = server.create(options);

        /** -----------
         *
         * Sockets
         *
         * @type {{io, steward, clients, connections, protocol, pause, resume}}
         */
        var bsSocket      = sockets.create(bsServer.server, options);
        var clientEvents  = options.get('clientEvents');
        var clientOptions = transform.getClientOptions(options);



        var connections$  = Rx.Observable.create(obs => {
            bsSocket.clients.on('connection', obs.onNext.bind(obs));
        }).share();

        require('./clients').track(connections$, optSub, clientOptions);

        /** ---------
         *
         * File watcher
         *
         * @type {Rx.Observable}
         */
        var bsWatcher        = files.getWatcher(options);
        var watcherOffSwitch = new Rx.Subject();
        var stdin            = Rx.Observable
            .fromEvent(process.stdin, 'data')
            .map(x => x.toString())
            .map(x => x.slice(null, -1));

        var onstate         = Rx.Observable.just(true);
        var offState        = Rx.Observable.merge(watcherOffSwitch, stdin.filter(x => x === 'off'));
        var pauser          = Rx.Observable
            .merge(onstate, stdin.filter(x => x === 'on'))
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
            .do(x => bsSocket.protocol.send('Global.reload', true))
            .subscribe();

        /**
         *
         */
        corestream
            .where(x => x.type === 'inject')
            .do(file => bsSocket.protocol.send('Global.inject', file))
            .subscribe();


        /**
         * Run the server
         */
        console.log(options.get('port'));
        bsServer.server.listen(options.get('port'));

        var cleanups = [];
        cleanups.push(function () {
            watcherOffSwitch.onNext(false);
            bsServer.server.close();
            steward.destroy();
        });

        /**
         * These functions are called when the plugin call is 'option:<name>`
         * Usually it's becasue there's a special tranformation
         * pipeline that needs to occur before they can be saved as would
         * normally occcur when setting an option
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

            if (Array.isArray(selector)) {
                selector = selector.join('.');
            }

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
            sockets:  bsSocket,
            clients:  bsSocket.clients,
            clients$: clients$,
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
                    .share();
            },
            /**
             * @param {string} name - the name of the plugin
             * @param {function} fn - the updater function
             * @returns {Rx.Observable}
             */
            updatePlugin: function (name, fn) {
                return Rx.Observable
                    .just(optSub.getValue().update('plugins', x => {
                        return x.map(plug => {
                            if (plug.get('name') === name) {
                                var res = fn.call(null, plug);
                                plugUpdates.onNext(res);
                                return res;
                            }
                            return plug;
                        });
                    }))
                    .do(optSub.onNext.bind(optSub))
                    .take(1)
                    .share();
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
                    options: optSub.getValue()
                })
                .flatMap(x => Rx.Observable.just(optionUpdater(x.options, x.selector, x.fn)))
                .do(applyMw) // todo: don't always re-apply middlewares if an option changed that didn't need them to
                .do(x => optSub.onNext(x))
                .take(1)
                .share();
            },
            /**
             * Set individual client options
             * @param {String} id - either a bs-client ID (not a socket.io id) or 'default'
             * @param {Array|String} selector - option selector ['ghostMode', 'clicks']
             * @param {Function} fn
             * @returns {Rx.Observable}
             */
            setClientOption: function (id, selector, fn) {

                var options = transform.setClientOptions({
                    id: id,
                    selector: selector,
                    fn: fn,
                    options: optSub.getValue()
                });

                options.get('clientOptions')
                    .filter((x, key) => key !== 'default')
                    .forEach((x, key) => {
                        bsSocket.clients.emit('Options.set', { // todo: verify with protocol
                            id: key,
                            options: x
                        });
                    });

                optSub.onNext(options);

                return Rx.Observable.just(optSub.getValue()).share();
            },
            getClients: function () {
                return optSub.getValue().get('clientOptions');
            },
            /**
             * Allow plugins to also load the same socket.io script
             * used by Browsersync
             */
            getSocketIoScript: connectUtils.getSocketIoScript,
            /**
             * Allow plugins to retrieve the external socket connector
             * @param {{namespace: String}} opts
             * @returns {string}
             */
            getExternalSocketConnector: (opts) => {
                return connectUtils.externalSocketConnector(optSub.getValue(), opts);
            },
            plugin: function () {}
        };

        Object.defineProperty(bs, 'options', {
            get: function () {
                return optSub.getValue();
            },
            set: function (val) {
                throw new TypeError('Cannot re-assign this value');
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
                console.log('All plugins have finished their setup tasks');
                cb(null, bs);
            },
                e => {
                console.log(e.stack);
                cb(e);
            });
    }
};

module.exports = bs;
