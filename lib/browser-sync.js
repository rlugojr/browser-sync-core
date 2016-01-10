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
        const opts$    = optSub.share();
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

        cleanups.push({
            async: false,
            fn: function () {
                bsServer.server.close();
            }
        });

        /**
         * These functions are called when the plugin call is 'option:<name>`
         * Usually it's because there's a special transformation
         * pipeline that needs to occur before they can be saved as would
         * normally occur when setting an option
         * @type {{clientJs: Function, rewriteRules: Function, middleware: Function}}
         */
        const optionUpdaters = {
            clientJs: clientJs.fromJS,
            middleware: middleware.fromJS,
            rewriteRule: rewriteRules.fromJS
        };

        const updatableOptions = Object.keys(optionUpdaters);

        /**
         * Quite servers, remove event listeners, kill timers, stop
         * file-watchers. Allows the process to exit
         */
        bs.cleanup = (cb) => {

            const clean = cleanups.map(x => {
                return Rx.Observable.create(obs => {
                    if (x.async) {
                        x.fn.call(bs, () => obs.onCompleted());
                    } else {
                        x.fn.call(bs);
                        obs.onCompleted();
                    }
                });
            });

            Observable
                .from(clean)
                .concatAll()
                .subscribe(
                    x => {},
                    e => console.error('error', e),
                    d => {
                        if (typeof cb === 'function') {
                            cb();
                        }
                    }
                );
        };
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
         */
        bs.setOption = function (selector, fn) {

            const input = Rx.Observable.just({selector, fn});

            if (updatableOptions.indexOf(selector) === -1) {
                return input
                    .withLatestFrom(optSub, (x, opts) => {
                        return opts.updateIn( // update a current value
                            x.selector.split('.'), // make selector an array always
                            (prev) => x.fn.call(null, prev) // call given fn with prev value
                        );
                    })
                    .do(x => optSub.onNext(x)) // pump new options value into opts subject
                    .take(1); // only allow a single subscription
            }

            return input.withLatestFrom(optSub, (x, opts) => {
                return opts.updateIn( // update a current value
                    x.selector.split('.'), // make selector an array always
                    (prev) => {
                        // call an internal function to transform what the user
                        // has provided into the correct internal type
                        return optionUpdaters[x.selector].call(null, x.fn.call(null, prev.toJS()))
                    }
                );
            })
            .do(x => optSub.onNext(x)) // pump new options value into opts subject
            .do(applyMw) // re-apply middleware stack;
            .take(1); // only allow a single subscription
        }

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
         * Resolve all async plugin init/initAsync functions
         * and then call the callback to indicate all
         * are complete
         */
        plugins
            .initMethods(options, bs)
            .toArray()
            .subscribe(x => {
                if (x && x.length) {
                    x.forEach(function (fn) {
                        cleanups.push({
                            async: fn.length > 0,
                            fn: fn
                        });
                    });
                }
                cb(null, bs);
            },
            e => {
                console.log('stack', e.stack);
                cb(e);
            });
    }
};

module.exports = bs;
