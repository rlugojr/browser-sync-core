'use strict';

const Rx   = require('rx');
const path = require('path');
const isString = require('./utils').isString;
const uniqueId = require('./utils').uniqueId;
const Imm  = require('immutable');
const fs   = require('fs');
const just = Rx.Observable.just;
const zip  = Rx.Observable.zip;

/**
 * @param {Map} options
 * @returns {Map}
 */
module.exports.resolve = function resolve(options) {
    return options.update('plugins', x => {
        return x.map(function (item) {
            if (!isString(item)) {
                var newItem = item;
                if (isString(item.get('module'))) {
                    newItem = fromString(item.get('module'));
                    newItem.options = item.get('options') || {};
                }
                return Imm.fromJS({active: true, module: {}, options: {}, via: 'inline', dir: process.cwd()}).mergeDeep(newItem);
            }
            return Imm.fromJS(fromString(item));
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
    var NAME_PATH = ['module', 'plugin:name'];
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
    var ASYNC_METHOD = ['module', 'initAsync'];
    var pluginFns = options.get('plugins')
        .filter(x => x.hasIn(ASYNC_METHOD))
        .map(x => {
            return Rx.Observable.create(obs => {
                x.getIn(ASYNC_METHOD)(bs, x.get('options').toJS(), function (err, output) {
                    if (err) {
                        return obs.onError(err);
                    }
                    obs.onNext(output);
                    obs.onCompleted();
                });
            })
        });

    return Rx.Observable.from(pluginFns).concatAll();
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
 * @param item
 * @returns {{module: *, options: {}, via: String}}
 */
function fromString (item) {
    if (item.charAt(0) === '.') {
        item = path.join(process.cwd(), item);
    }
    var via = require.resolve(item);
    return {active: true, module: require(item), options: {}, via: via, dir: path.dirname(via)};
}