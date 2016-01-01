'use strict';

const Immutable = require('immutable');
const Rx = require('rx');
const Observable = Rx.Observable;
const startup = require('./startup');
const config = require('./config');
const path = require('path');
const connectUtils = require('./connect-utils');
const server = require('./server');
const sockets = require('./sockets');
const plugins = require('./plugins');
const clientJs = require('./client-js');
const middleware = require('./middleware');
const protocol = require('./protocol');
const utils = require('./utils');
const rewriteRules = require('./rewrite-rules');
const bs = exports;

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

        const optSub   = new Rx.BehaviorSubject(options);
        const bsServer = server.create(options);
        const cleanups = [];
        const bs       = {};

        /** -----------
         *
         * Sockets
         *
         * @type {{io, steward, clients, connections, protocol, pause, resume}}
         */
        const bsSocket = sockets.create(bsServer.server, options);
        const clientsStreams = require('./clients').track(bsSocket, optSub, cleanups);

        /**
         * Run the server
         */
        bsServer.server.listen(options.get('port'));

        cleanups.push(function () {
            bsServer.server.close();
        });

        /**
         * These functions are called when the plugin call is 'option:<name>`
         * Usually it's because there's a special transformation
         * pipeline that needs to occur before they can be saved as would
         * normally occur when setting an option
         * @type {{clientJs: Function, rewriteRules: Function, middleware: Function}}
         */
        const optionUpdaters = {
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
        function optionUpdater(options, selector, fn) {

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
         * Quite servers, remove event listeners, kill timers, stop
         * file-watchers. Allows the process to exit
         */
        bs.cleanup = () => cleanups.forEach(x => x.call(null));
        /**
         * Push a cleanup task into the stack
         * @param {function} fn
         */
        bs.registerCleanupTask = fn => cleanups.push(fn);
        /**
         * Expose Browsersync config
         */
        bs.config = config;
        /**
         * Expose Browsersync utils
         */
        bs.utils = require('./utils');
        /**
         * Expose socket.io instance
         */
        bs.io = bsSocket.io;
        /**
         * Expose all socket properties
         */
        bs.sockets      = bsSocket;
        bs.clients      = bsSocket.clients;
        bs.clients$     = clientsStreams.clients$;
        bs.connections$ = clientsStreams.connections$;
        bs.registered$  = clientsStreams.registered$;

        /**
         * Get a file-watcher for a specific namespace
         *
         * bs.plugin('files:watcher', 'core')
         *   .filter(x => x.event !== 'add')
         *   .subscribe(x => console.log('from plugin', x.file, x.event));
         * @param {string} namespace
         * @returns {Observable}
         */
        //bs.getWatcher = function (namespace) {
        //    return pauser
        //        .filter(x => x.namespace === namespace)
        //        .filter(x => x.item.fn === undefined);
        //};

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
        bs.setOption = function (selector, fn) {
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
        };
        /**
         * Retrieve a socket.io client from a Browsersync client id.
         * Browsersync client ID's persist and survive a refresh
         * so consumers can use that ID to retrieve the socket.io
         * client which allow them to target events to a single
         * client.
         * @param {string} id - Browsersync client ID (Note: this is different from the socket.io id)
         * @returns {Socket|Boolean}
         */
        bs.getSocket = function (id) {
            const match = clientsStreams.clients$.getValue().filter(x => x.get('id') === id).toList().get(0);
            if (match) {
                return bsSocket.clients.sockets.filter(x => {
                    return x.id === match.get('socketId');
                })[0];
            }
            return false;
        };

        /**
         * Set individual client options
         * @param {String} id - either a bs-client ID (not a socket.io id) or 'default'
         * @param {Array|String} selector - option selector, eg: ['ghostMode', 'clicks']
         * @param {Function} fn - transform function will be called with current value
         * @returns {Observable}
         */
        bs.setClientOption = function (id, selector, fn) {
            return Observable
                .just(clientsStreams.clients$.getValue())
                .map(clients => {
                    return clients.updateIn([id, 'options'].concat(selector), fn);
                })
                .do(clientsStreams.clients$.onNext.bind(clientsStreams.clients$));
        };
        /**
         * Set a default option for newly connected clients.
         * Note: This will not affect any current clients
         * @param {Array|String} selector
         * @param {function} fn - transformation function will be called with current value
         * @returns {Rx.Observable}
         */
        bs.setDefaultClientOption = function (selector, fn) {
            return Observable
                .just(optSub.getValue())
                .map(x => x.updateIn(['clientOptions'].concat(selector), fn))
                .do(optSub.onNext.bind(optSub))
        };
        /**
         * Set an option for all clients, overriding any previously set items
         * @param {Array|String} selector
         * @param {function} fn - transformation function will be called with current value
         * @returns {Rx.Observable}
         */
        bs.overrideClientOptions = function (selector, fn) {
            return Observable
                .just(clientsStreams.clients$.getValue())
                .map(clients => {
                    return clients.map(client => {
                        return client.updateIn(['options'].concat(selector), fn);
                    });
                })
                .do(clientsStreams.clients$.onNext.bind(clientsStreams.clients$));
        };
        //getClients: function () {
        //    return optSub.getValue().get('clientOptions');
        //},
        /**
         * Allow plugins to also load the same socket.io script
         * used by Browsersync
         */
        bs.getSocketIoScript = connectUtils.getSocketIoScript;
        /**
         * Allow plugins to retrieve the external socket connector
         * @param {{namespace: String}} opts
         * @returns {string}
         */
        bs.getExternalSocketConnector = (opts) => {
            return connectUtils.externalSocketConnector(optSub.getValue(), opts);
        };

        bs.options$ = optSub;

        bs.plugin = function () {};
        bs.reload = function () {
            bsSocket.protocol.send('Global.reload', true);
        };
        bs.inject = function (obj) {
            bsSocket.protocol.send('Global.inject', obj);
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
            .initMethods(options, bs)
            .toArray()
            .subscribe(x => {
                cb(null, bs);
            },
            e => {
                console.log('stack', e.stack);
                cb(e);
            });
    }
};

module.exports = bs;
