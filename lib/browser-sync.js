'use strict';

var Immutable = require('immutable');
var Rx = require('rx');
const Observable = Rx.Observable;
var zip = Observable.zip;
var just = Observable.just;
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

        const optSub       = new Rx.BehaviorSubject(options);
        const bsServer     = server.create(options);
        const cleanups     = [];

        /** -----------
         *
         * Sockets
         *
         * @type {{io, steward, clients, connections, protocol, pause, resume}}
         */
        const bsSocket       = sockets.create(bsServer.server, options);
        const clientsStreams = require('./clients').track(bsSocket, optSub, cleanups);

        /** ---------
         *
         * File watcher
         *
         * @type {Observable}
         */
        if (options.get('files').size) {

            var bsWatcher        = files.getWatcher(options);
            var watcherOffSwitch = new Rx.Subject();
            var stdin            = Observable
                .fromEvent(process.stdin, 'data')
                .map(x => x.toString())
                .map(x => x.slice(null, -1));

            var onstate         = Observable.just(true);
            var offState        = Observable.merge(watcherOffSwitch, stdin.filter(x => x === 'off'));
            var pauser          = Observable
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

            cleanups.push(function () {
                watcherOffSwitch.onNext(false);
            });
        }

        /**
         * Run the server
         */
        bsServer.server.listen(options.get('port'));

        cleanups.push(function () {
            bsServer.server.close();
        });

        /**
         * These functions are called when the plugin call is 'option:<name>`
         * Usually it's becasue there's a special transformation
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

        //clientsStreams.clients$.subscribe(x => {
        //    console.log(x);
        //});

        /**
         * Exposed object to plugins/user
         */
        var bs = {
            /**
             * Quite servers, remove event listeners, kill timers, stop
             * file-watchers. Allows the process to exit
             */
            cleanup: () => {
                cleanups.forEach(x => x.call(null));
            },
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
             * Expose socket.io instance
             */
            io: bsSocket.io,
            /**
             * Expose all socket properties
             */
            sockets:  bsSocket,
            clients:  bsSocket.clients,
            clients$: clientsStreams.clients$,
            connections$: clientsStreams.connections$,
            registered$: clientsStreams.registered$,
            /**
             * Get a file-watcher for a specific namespace
             *
             * bs.plugin('files:watcher', 'core')
             *   .filter(x => x.event !== 'add')
             *   .subscribe(x => console.log('from plugin', x.file, x.event));
             * @param {string} namespace
             * @returns {Observable}
             */
            getWatcher: function (namespace) {
                return pauser
                    .filter(x => x.namespace === namespace)
                    .filter(x => x.item.fn === undefined);
            },
            /**
             * return an observable for listening to plugin updates
             * @param {string} name
             * @returns {Observable}
             */
            pluginUpdates: function (name) {

            },
            /**
             * @param {string} name - the name of the plugin
             * @param {function} fn - the updater function
             * @returns {Observable}
             */
            updatePlugin: function (name, fn) {

            },
            /**
             * Interface for setting an option
             * Note: Some options have custom updaters (such as
             * clientJs, middleware & rewriteRules.
             * If no custom updater exists for an option, we just
             * call the user fn and set the result
             * @param {string} selector - option selector such as 'middleware' or 'ghostMode.forms.toggle'
             * @param {function} fn - updater function
             * @returns {Observable}
             */
            setOption: function (selector, fn) {

            },
            /**
             * Set individual client options
             * @param {String} id - either a bs-client ID (not a socket.io id) or 'default'
             * @param {Array|String} selector - option selector ['ghostMode', 'clicks']
             * @param {Function} fn
             * @returns {Observable}
             */
            setClientOption: function (id, selector, fn) {
                return Observable
                    .just(clientsStreams.clients$.getValue())
                    .map(clients => {
                        return clients.updateIn([id, 'options'].concat(selector), fn);
                    })
                    .do(clientsStreams.clients$.onNext.bind(clientsStreams.clients$));
            },
            setDefaultClientOption: function (selector, fn) {
                return Observable
                    .just(optSub.getValue())
                    .map(x => x.updateIn(['clientOptions'].concat(selector), fn))
                    .do(optSub.onNext.bind(optSub))
            },
            overrideClientOptions: function (selector, fn) {
                return Observable
                    .just(clientsStreams.clients$.getValue())
                    .map(clients => {
                        return clients.map(client => {
                            return client.updateIn(['options'].concat(selector), fn);
                        });
                    })
                    .do(clientsStreams.clients$.onNext.bind(clientsStreams.clients$));
            },
            //getClients: function () {
            //    return optSub.getValue().get('clientOptions');
            //},
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
                cb(null, bs);
            },
            e => {
                console.log(e.stack);
                cb(e);
            });
    }
};

module.exports = bs;
