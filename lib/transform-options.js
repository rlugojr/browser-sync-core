'use strict';

const isString       = require('./utils').isString;
const isFunction     = require('./utils').isFunction;
const Immutable      = require('immutable');
const utils          = require('./utils');
const defaultOptions = require('./default-options');
const connectUtils   = require('./connect-utils');

/**
 * @param options
 * @returns {Cursor|List<T>|Map<K, V>|Map<string, V>|*}
 */
module.exports.afterInit = function (options) {
    return options.mergeDeep({
        urls:        utils.getUrlOptions(options),
        snippet:     connectUtils.scriptTags(options),
        scriptPath:  connectUtils.clientScript(options),
        sessionId:   new Date().getTime()
    });
};

/**
 * @param {Map} options
 * @param {String} optionName
 * @param {String} pluginHook
 * @returns {Map}
 */
module.exports.mergeOptionsWithPlugins = function (options, optionName, pluginHook) {
    const PLUGIN_OPT_PATH  = ['module', 'hooks', pluginHook];
    const pluginMw = options.get('plugins')
        .filter(item => item.hasIn(PLUGIN_OPT_PATH))
        .map(item => item.getIn(PLUGIN_OPT_PATH))
        .reduce((all, item) => all.concat(item), Immutable.List([]));

    return options.update(optionName, x => pluginMw.concat(x));
};

/**
 * Update an individual clients options, or all
 * @param {{selector: (String|Array), fn: [Function], options: Map, id: String}} x
 * @returns {Map}
 */
module.exports.setClientOptions = function (x) {

    var selector     = x.selector;
    const fn         = x.fn;
    const CLIENT_OPT = 'clientOptions';
    const options    = x.options;

    if (!Array.isArray(selector)) {
        selector = selector.split('.');
    }

    /**
     * If `id` is 'default', we dive into each and every
     * client option (including the defaults) and update
     * according to the path given. eg: selector=[ghostMode, clicks]
     */
    if (x.id === 'default') {
        return options.updateIn([CLIENT_OPT], x => {
            return x.map(function (client) {
                return client.updateIn(selector, opt => {
                    return Immutable.fromJS(fn.call(null, opt));
                });
            });
        });
    }

    /**
     * Here, it must of been an option-set for a specific client
     * So we dive in and update the individual clients option.
     */
    return options.updateIn([CLIENT_OPT, x.id].concat(selector), opt => {
        return Immutable.fromJS(fn.call(null, opt));
    });
};

/**
 * @param item
 */
function setOpen (item) {
    const open = item.get('open');
    if (item.get('mode') === 'snippet') {
        if (open !== 'ui' && open !== 'ui-external') {
            item.set('open', false);
        }
    }
}

/**
 * Enforce paths to begin with a forward slash
 */
function ensureSlash (item) {
    if (item[0] !== '/') {
        return '/' + item;
    }
    return item;
}

/**
 *
 */
function setMiddleware (item) {

    const mw = getMiddlwares(item);

    item.set('middleware', mw);
}

/**
 * top-level option, or given as part of the proxy/server option
 * @param item
 * @returns {*}
 */
function getMiddlwares (item) {

    const mw       = item.get('middleware');
    const serverMw = item.getIn(['server', 'middleware']);
    const proxyMw  = item.getIn(['proxy',  'middleware']);

    const list     = Immutable.List([]);

    if (mw) {
        return listMerge(list, mw);
    }

    if (serverMw) {
        return listMerge(list, serverMw);
    }

    if (proxyMw) {
        return listMerge(list, proxyMw);
    }

    return list;
}

/**
 * @param item
 * @returns {*}
 */
function isList (item) {
    return Immutable.List.isList(item);
}

/**
 * @param list
 * @param item
 * @returns {*}
 */
function listMerge(list, item) {

    if (isFunction(item)) {
        list = list.push(item);
    }

    if (isList(item) && item.size) {
        list = list.merge(item);
    }

    return list;
}
