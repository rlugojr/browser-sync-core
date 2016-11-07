'use strict';

import Rx        = require('rx');
const Observable = Rx.Observable;
const path       = require('path');
const Imm        = require('immutable');
const debug      = require('debug')('bs:plugins');

const ASYNC_METHOD = ['module', 'initAsync'];
const SYNC_METHOD  = ['module', 'init'];
const NAME_PATH    = ['module', 'plugin:name'];

/**
 * Define the name of options that can cause
 * auto loading. These are in reverse order, so 
 * clients/stdin will ALWAYS be the first core plugin and watch
 * would always be the last.
 */
const autoList     = ['watch', '404', 'proxy', 'serveStatic', 'clients', 'stdin'];

import utils from './utils';
import {Cleanup} from "./browser-sync";
const isString   = utils.isString;
const uniqueId   = utils.uniqueId;

/**
 * Schema for a plugin item
 */
const Plugin = Imm.Record({
    name:    '',
    active:  true,
    module:  Imm.Map({}),
    options: Imm.Map({}),
    via:     'inline',
    dir:     process.cwd(),
    initAsync: undefined,
    init: undefined,
    internal: false
});

/**
 * Resolves plugins.
 * Plugins can be registered via a simple string such as
 * 'bs-html-injector' or `./lib/myplugin`, both of which will
 * use nodes `require` to resolve the module. Alternatively,
 * @param {Map} options
 * @returns {Map}
 */
module.exports.resolve = function resolve(options) {
    /**
     * Iterate through each plugin provided
     * For each plugin, return an object
     * in the correct format
     */
    const outOptions = options.update('plugins', x => {

        if (isString(x)) {
            return Imm.List([resolveOne(x)]);
        }

        const output = x.map(resolveOne).toList();

        return output;
    });

    return outOptions;
};

/**
 * Given anon plugins an Addressable name
 * @param {Map} options
 * @returns {Map}
 */
module.exports.namePlugins = function (options) {

    const outOptions = options.update('plugins', plugins => {
        const output = plugins
            .map(setName)
            .map(x => {
                return x.set('name', x.getIn(NAME_PATH));
            });

        return output;
    });

    return outOptions;
};

/**
 * Plugins can register either an 'initAsync' method (which
 * will halt execution until the callback is called) or an
 * init method that will be called synchronously.
 *
 * This allows slow-starting such as the UI to do any setup
 * work, whilst being able to modify/add-to the options
 * if needed.
 * @param {Immutable.Map} options
 * @param {object} bs
 */
module.exports.initMethods = function (options, bs): Rx.Observable<Cleanup> {

    /**
     * Iterate through each provided plugin
     * and enqueue any init or initAsync methods
     */
    const pluginFns: Array<Rx.Observable<Cleanup>> = options.get('plugins')
        .filter(x => x.hasIn(ASYNC_METHOD) || x.hasIn(SYNC_METHOD))
        .map(plugin => {
            if (plugin.hasIn(ASYNC_METHOD)) {
                return asyncWrapper(plugin, bs);
            }
            return syncWrapper(plugin, bs);
        });

    return Rx.Observable.from(pluginFns).concatAll();
};

/**
 * Allow plugins to modify the options before running
 * @param {Immutable.Map} options
 * @return {Immutable.Map}
 */
module.exports.transformOptions = function (options) {

    const METHOD = ['module', 'transformOptions'];

    var pluginFns = options.get('plugins')
        .filter(x => x.hasIn(METHOD))
        .map(x => {
            return x.getIn(METHOD);
        }).toJS();

    return pluginFns.reduce(function (options, fn) {
        var modded = fn(options);
        return modded;
    }, options);
};

/**
 * Auto-load plugins based on user provided options.
 *
 * eg:
 *
 * bs.create({
 *    proxy: 'http://bbc.co.uk'
 * })
 *
 * -> will cause lib/plugins/proxy to be loaded
 *
 * @param options
 * @returns {*}
 */
module.exports.autoLoad = function (options) {
    const outOptions = options
        .update('plugins', (x) => {
            // Ensure next transformation is always dealing with a List
            if (!Imm.List.isList(x)) {
                return Imm.List([x]);
            }
            return x;
        })

        /**
         * Here we check if an option matching the plugin name was set
         * eg: watch: ['*.html'] - if it was, we construct a path to the relevant
         * plugin and add it to the plugins array so that it will be loaded latest
         */
        .update('plugins', function (plugins) {

            return autoList.reduce((a, plugin) => {
                const pluginOpt = options.get(plugin);
                if (pluginOpt !== undefined && pluginOpt !== false) {
                    debug(`+ autoload (${plugin})`);
                    const requirePath = require('path').resolve(__dirname, 'plugins', plugin);
                    debug(`└─ via (${requirePath})`);
                    return a.unshift(Imm.Map({
                        module: requirePath,
                        internal: true
                    }));
                }
                return a;
            }, plugins);
        });

    return outOptions;
};

/**
 * @param {Immutable.Map} plugin
 * @returns {Immutable.Map}
 */
function setName (plugin) {
    if (!plugin.hasIn(NAME_PATH)) {
        return plugin.setIn(NAME_PATH, uniqueId());
    }
    return plugin;
}

/**
 * @param {string|Immutable.Map} item
 * @returns {Map}
 */
function resolveOne (item) {
    /**
     * If only a string was given, eg plugins: ['my-plugin']
     * just use node's require to bring in the module with default args
     */
    if (isString(item)) {
        return Imm.fromJS(resolvePluginFromString(item));
    }

    /**
     * If a function was given, simulate a module:init structure
     */
    if (typeof item === 'function') {
        return new Plugin().mergeDeep({
            module: {
                init: item
            }
        });
    }

    /**
     * If an object is given, with a module property that's a string,
     * use that string to resolve the module with default options
     * and then merge from the top level. This is
     * to ensure things such as options/active state are not missed
     * eg: plugins: [{module: './lib/plugin', options: {name: 'shane}}}]
     */
    if (isString(item.get('module'))) {
        return resolvePluginFromString(item.get('module')).mergeDeep(item.delete('module'));
    }

    if (Imm.Map.isMap(item.get('module'))) {
        return new Plugin().mergeDeep(item);
    }

    /**
     * Final use-case is a plain object, with a module property
     * that is an object. This is to allow plugins directly in the
     * configuration, skipping the node require lookup
     */
    return new Plugin().mergeDeep({module: item});
}

/**
 * Wrap async plugins in an Observable and
 * pass along a CB to be invoked upon completion
 * @param {Immutable.Map} plugin - the plugin
 * @param {object} bs
 * @returns {Observable}
 */
function asyncWrapper(plugin, bs): Rx.Observable<Cleanup> {
    return Observable.create<Cleanup>(obs => {
        const output = plugin.getIn(ASYNC_METHOD).call(bs, bs, plugin.get('options').toJS(), asyncCb(obs));
        if (typeof output === 'function') {
            obs.onNext({
                async: output.length > 0,
                fn: output,
                description: `Cleanup for plugin ${plugin.get('name')}`
            });
        }
    });
}

/**
 * Plugins may register an 'init' function which will be called
 * synchronously in order given. Even when mixed with async plugins
 * @param {Immutable.Map} plugin - the plugin
 * @param {Object} bs
 * @returns {Observable}
 */
function syncWrapper(plugin, bs): Rx.Observable<Cleanup> {
    return Observable.create<Cleanup>(obs => {
        const output = plugin.getIn(SYNC_METHOD).call(bs, bs, plugin.get('options').toJS());
        if (typeof output === 'function') {
            obs.onNext({
                async: output.length > 0,
                fn: output,
                description: `Cleanup for plugin ${plugin.get('name')}`
            });
        }
        obs.onCompleted();
    });
}

/**
 * Create a callback that is passed into async
 * plugins initializers to signal setup completion
 * @param {Rx.Observer} obs
 * @returns {Function}
 */
function asyncCb(obs) {

    const fn = () => {
        process.nextTick(function () {
            obs.onCompleted();
        });
    };

    return {
        done: fn,
        onCompleted: fn,
        error: obs.onError.bind(obs),
        onError: obs.onError.bind(obs)
    };
}

/**
 * @param pluginName
 * @returns {{module: *, options: {}, via: String}}
 */
function resolvePluginFromString(pluginName: string) {
    if (pluginName.charAt(0) === '.') {
        pluginName = path.join(process.cwd(), pluginName);
    }
    const via = require.resolve(pluginName);
    return new Plugin({
        module: Imm.fromJS(require(pluginName)),
        via:    via,
        dir:    path.dirname(via)
    });
}
