'use strict';

const Rx = require('rx');
const Observable = Rx.Observable;
const path = require('path');
const isString = require('./utils').isString;
const uniqueId = require('./utils').uniqueId;
const Imm = require('immutable');
const fs = require('fs');
const just = Observable.just;
const zip = Observable.zip;

const ASYNC_METHOD = ['module', 'initAsync'];
const SYNC_METHOD = ['module', 'init'];
const NAME_PATH = ['module', 'plugin:name'];

/**
 * Resolves plugins.
 * Plugins can be registered via a simple string such as
 * 'bs-html-injector' or `./lib/myplugin`, both of which will
 * use nodes `require` to resolve the module.
 * @param {Map} options
 * @returns {Map}
 */
module.exports.resolve = function resolve(options) {
    /**
     * Iterate through each plugin provided
     */
    return options.update('plugins', x => {
        /**
         * For each plugin, return an object
         * in the correct format
         */
        return x.map(function (item) {
            /**
             * If a string was given,
             */
            if (isString(item)) {
                return Imm.fromJS(resolvePluginFromString(item));
            }

            var newItem = item;

            /**
             * if the key `module` is a string,
             */
            if (isString(item.get('module'))) {
                newItem = resolvePluginFromString(item.get('module'));
                newItem.options = item.get('options') || {};
            }
            return Imm.fromJS({
                active: true,
                module: {},
                options: {},
                via: 'inline',
                dir: process.cwd()
            }).mergeDeep(newItem);

        })
            .toList();
    })
};

/**
 * Given anon plugins an Addressable name
 * @param {Map} options
 * @returns {Map}
 */
module.exports.namePlugins = function (options) {

    return options.update('plugins', plugins => {
        return plugins.map(plugin => {
            if (!plugin.hasIn(NAME_PATH)) {
                return plugin.setIn(NAME_PATH, uniqueId());
            }
            return plugin;
        })
            .map(x => x.set('name', x.getIn(NAME_PATH)));
    });
};

/**
 * @param options
 * @param bs
 */
module.exports.initAsync = function (options, bs) {

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
            return syncWrapper(x);
        });

    return Observable.from(pluginFns).concatAll();
};

/**
 * @param options
 * @param bs
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
    return {
        active: true,
        module: require(item),
        options: {},
        via: via,
        dir: path.dirname(via)
    };
}