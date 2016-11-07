/// <reference path="../typings/main.d.ts" />
import {Socket} from "./sockets";
import {ClientsApi} from "./browser-sync-opts";
import Immutable = require("immutable");
import startup from './startup';
import Rx = require('rx');
import config from './config';
import {GlobalClientEvents, GlobalReloadEvent} from "./browser-sync-clients";

const Observable = Rx.Observable;
const connectUtils = require('./connect-utils');
const server = require('./server');
const sockets = require('./sockets');
const plugins = require('./plugins');
const clientJs = require('./client-js');
const middleware = require('./middleware');
const utils = require('./utils');
const rewriteRules = require('./rewrite-rules');

const debugOptions = require('debug')('bs:options');
const debugCleanup = require('debug')('bs:cleanup');
const debugPlugins = require('debug')('bs:plugins');

const bs = exports;

export interface Cleanup {
    description: string
    async: boolean
    fn: (cb?: Function) => void
}

export interface BrowserSync {

    cleanups: Cleanup[]

    /**
     * Exported streams
     */
    connections$: any
    registered$: any
    options$: any
    watchers$?: any
    coreWatchers$?: any
    clients$: any

    /**
     * Exported APIs (by namespace)
     */
    clients: ClientsApi

    server: any
    bsSocket: any
    app: any
    registerCleanupTask: (fn:any) => void
    cleanup: (cb?:any) => void
    config: any
    utils: any
    io: any
    sockets: Socket
    options: any
    setOption: (selector:string, fn) => any
    getSocket: (id:string) => any

    // Controller
    setController:   (id:string) => void
    resetController: () => void

    setClientOption: (id:string, selector:string, fn) => any
    setDefaultClientOption: (selector:string, fn) => any
    overrideClientOptions: (selector:string, fn) => any
    getSocketIoScript: () => string
    getExternalSocketConnector: (opts: any) => string
    reload: () => void
    inject: (any) => void
    applyMw: (options: Immutable.Map<any, any>) => void
    watchers?: any
    optionUpdaters: any
}

bs.create = function (userOptions) {
    return startup(userOptions).flatMap(opts => {
        return Rx.Observable.create(obs => {
            go(opts, obs);
        });
    });
};

/**
 * Options stream
 */
function go(options, observer) {

    const optSub   = new Rx.BehaviorSubject(options);
    const opts$    = optSub.share();
    const bsServer = server.create(options);
    const bs       = <BrowserSync>{};
    bs.cleanups    = [];
    bs.server      = bsServer.server;
    bs.app         = bsServer.app;

    /**
     * Push a cleanup task into the stack
     * @param {function} fn
     */
    bs.registerCleanupTask = (fn: Cleanup) => {
        bs.cleanups.push(fn); // todo: is there another way to model
    };

    /** -----------
     *
     * Sockets
     *
     * @type {{io, steward, clients, connections, protocol, pause, resume}}
     */
    bs.bsSocket = sockets.create(bs, bs.server, options);
    
    /**
     * Run the server
     */
    bsServer.server.listen(options.get('port'));

    bs.cleanups.push({
        description: 'Closing Browsersync server',
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
    bs.optionUpdaters = {
        clientJs: clientJs.fromJS,
        middleware: middleware.fromJS,
        rewriteRules: rewriteRules.fromJS
    };

    /**
     * Quit servers, remove event listeners, kill timers, stop
     * file-watchers etc... Allows the process to exit
     */
    bs.cleanup = (cb?: Function) => {

        debugCleanup(`-> running ${bs.cleanups.length} cleanup methods`);

        const now = new Date().getTime();

        const clean = bs.cleanups.map((cleanup: Cleanup) => {
            return Rx.Observable.create(obs => {
                if (cleanup.async) {
                    debugCleanup(`+ (async) ${cleanup.description}`);
                    cleanup.fn.call(bs, () => obs.onCompleted());
                } else {
                    debugCleanup(`+ (sync) ${cleanup.description}`);
                    cleanup.fn.call(bs);
                    obs.onCompleted();
                }
            });
        });

        Observable
            .from(clean)
            .concatAll()
            .subscribe(
                x => {},
                e => console.error('error', e.stack),
                () => {
                    debugCleanup(`= complete in ${(new Date().getTime() - now)}ms`);
                    if (typeof cb === 'function') {
                        cb();
                    }
                }
            );
    };

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
    bs.io = bs.bsSocket.io;
    /**
     * Expose all socket properties
     */
    bs.sockets      = bs.bsSocket;

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

        debugOptions(`> setting option from path ${selector}`);

        const input = Rx.Observable.just({selector, fn});

        if (Object.keys(bs.optionUpdaters).indexOf(selector) === -1) {
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
            const prev = opts.getIn(x.selector.split('.')).toJS();
            const modified = x.fn.call(null, prev);
            return bs.optionUpdaters[x.selector].call(null, modified, opts);
        })
        .do(x => optSub.onNext(x)) // pump new options value into opts subject
        .do(applyMw) // re-apply middleware stack;
        .take(1); // only allow a single subscription
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

    type ReloadEmitter = (type: GlobalClientEvents, payload: GlobalReloadEvent) => void;

    /**
     * Define the public API for actions that should affect clients
     */
    bs.clients = {
        reload: () => {
            bs.bsSocket.clients.emit(GlobalClientEvents.reload, <GlobalReloadEvent>{force: true});
        }
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

    bs.applyMw = applyMw;
    
    /**
     * Resolve all async plugin init/initAsync functions
     * and then call the callback to indicate all
     * are complete
     */
    plugins
        .initMethods(options, bs)
        .subscribe(cleanup => {
            bs.cleanups.push(cleanup);
        },
        e => {
            console.log('stack', e.stack);
            observer.onError(e);
        }, () => {
            debugPlugins(`✔ all plugins have finished their setup tasks`);
            observer.onNext(bs);
        });
}

module.exports = bs;
