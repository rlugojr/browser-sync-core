'use strict';

const Rx         = require('rx');
const Observable = Rx.Observable;
const path       = require('path');
const isString   = require('./utils').isString;
const uniqueId   = require('./utils').uniqueId;
const Imm        = require('immutable');

const ASYNC_METHOD = ['module', 'initAsync'];
const SYNC_METHOD  = ['module', 'init'];
const NAME_PATH    = ['module', 'plugin:name'];

/**
 * Schema for a plugin item
 */
const Plugin = Imm.Record({
    name:    '',
    active:  true,
    module:  Imm.Map({}),
    options: Imm.Map({}),
    via:     'inline',
    dir:     process.cwd()
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
    return options.update('plugins', x => x.map(resolveOne).toList());
};

/**
 * Given anon plugins an Addressable name
 * @param {Map} options
 * @returns {Map}
 */
module.exports.namePlugins = function (options) {

    return options.update('plugins', plugins => {
        return plugins
            .map(setName)
            .map(x => x.set('name', x.getIn(NAME_PATH)));
    });
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
module.exports.initMethods = function (options, bs) {

    /**
     * Iterate through each provided plugin
     * and enqueue any init or initAsync methods
     */
    const pluginFns = options.get('plugins')
        .filter(x => x.hasIn(ASYNC_METHOD) || x.hasIn(SYNC_METHOD))
        .map(x => {
            if (x.hasIn(ASYNC_METHOD)) {
                return asyncWrapper(x, bs);
            }
            return syncWrapper(x, bs);
        });

    return Observable.from(pluginFns).concatAll();
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
        .map(x => x.getIn(METHOD)).toJS();

    return pluginFns.reduce(function (options, fn) {
        var modded = fn(options);
        return modded;
    }, options);
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
     * If an object is given, with a module property that's a string,
     * use that string to resolve the module with default options
     * and then merge from the top level. This is
     * to ensure things such as options/active state are not missed
     * eg: plugins: [{module: './lib/plugin', options: {name: 'shane}}}]
     */
    if (isString(item.get('module'))) {
        return item
            .mergeDeep(resolvePluginFromString(item.get('module')));
    }

    /**
     * Final use-case is a plain object, with a module property
     * that is an object. This is to allow plugins directly in the
     * configuration, skipping the node require lookup
     */
    return new Plugin().mergeDeep(item);
}

/**
 * Wrap async plugins in an Observable and
 * pass along a CB to be invoked upon completion
 * @param {Immutable.Map} x - the plugin
 * @param {object} bs
 * @returns {Observable}
 */
function asyncWrapper(x, bs) {
    return Observable.create(obs => {
        x.getIn(ASYNC_METHOD).call(bs, bs, x.get('options').toJS(), asyncCb(obs));
    });
}

/**
 * Plugins may register an 'init' function which will be called
 * synchronously in order given. Even when mixed with async plugins
 * @param {Immutable.Map} x - the plugin
 * @param {Object} bs
 * @returns {Observable}
 */
function syncWrapper(x, bs) {
    return Observable.create(obs => {
        const output = x.getIn(SYNC_METHOD).call(bs, bs, x.get('options').toJS());
        obs.onNext(output);
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
    return (err, output) => {
        if (err) {
            return obs.onError(err);
        }
        obs.onNext(output);
        obs.onCompleted();
    }
}

/**
 * @param item
 * @returns {{module: *, options: {}, via: String}}
 */
function resolvePluginFromString(item) {
    if (item.charAt(0) === '.') {
        item = path.join(process.cwd(), item);
    }
    const via = require.resolve(item);
    return new Plugin({
        module: Imm.fromJS(require(item)),
        via:    via,
        dir:    path.dirname(via)
    });
}