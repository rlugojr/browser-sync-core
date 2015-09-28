'use strict';

var isString       = require('./utils').isString;
var isFunction     = require('./utils').isFunction;
var Immutable      = require('immutable');
var utils          = require('./utils');
var defaultOptions = require('./default-options');
var connectUtils   = require('./connect-utils');


/**
 * @param {Map} options
 * @returns {Map}
 */
module.exports.update = function (options) {

    return options.withMutations(function (item) {

        setMode(item);
        setScheme(item);
        setStartPath(item);
        setProxyWs(item);
        setServerOpts(item);
        setNamespace(item);
        fixSnippetOptions(item);
        setMiddleware(item);
        setOpen(item);

        if (item.get('uiPort')) {
            item.setIn(['ui', 'port'], item.get('uiPort'));
        }
    });
};

/**
 * @param options
 * @returns {Cursor|List<T>|Map<K, V>|Map<string, V>|*}
 */
module.exports.afterInit = function (options) {
    return options.mergeDeep({
        urls:        utils.getUrlOptions(options),
        snippet:     connectUtils.scriptTags(options),
        scriptPaths: Immutable.fromJS(connectUtils.clientScript(options, true)),
        sessionId: new Date().getTime()
    });
};

/**
 * @param {Map} options
 * @param {String} optionName
 * @param {String} pluginHook
 * @returns {Map}
 */
module.exports.mergeOptionsWithPlugins = function (options, optionName, pluginHook) {
    var PLUGIN_OPT_PATH  = ['module', 'hooks', pluginHook];
    var pluginMw = options.get('plugins')
        .filter(item => item.hasIn(PLUGIN_OPT_PATH))
        .map(item => item.getIn(PLUGIN_OPT_PATH))
        .reduce((all, item) => all.concat(item), Immutable.List([]));

    return options.update(optionName, x => pluginMw.concat(x));
};

/**
 * @param {Map} options
 * @returns {Map}
 */
module.exports.getClientOptions = function (options) {
    var optWhitelist       = options.get('clientOptionsWhitelist').toJS();
    var clientOnlyOptions  = ['id'];
    var validClientOptions = Object
        .keys(options.toJS())
        .filter(x => optWhitelist.indexOf(x) > -1)
        .concat(clientOnlyOptions)
        .reduce((all, item) => {
            all[item] = undefined;
            return all;
        }, {});

    return new Immutable.Record(validClientOptions)(options);
};

/**
 * Update an individual clients options, or all
 * @param x
 * @returns {*}
 */
module.exports.setClientOptions = function (x) {

    var selector   = x.selector;
    var fn         = x.fn;
    var CLIENT_OPT = 'clientOptions';
    var options    = x.options;

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
 * Move top-level ws options to proxy.ws
 * This is to allow it to be set from the CLI
 * @param item
 */
function setProxyWs(item) {
    if (item.get('ws') && item.get('mode') === 'proxy') {
        item.setIn(['proxy', 'ws'], true);
    }
}

/**
 * @param item
 */
function setOpen (item) {
    var open = item.get('open');
    if (item.get('mode') === 'snippet') {
        if (open !== 'ui' && open !== 'ui-external') {
            item.set('open', false);
        }
    }
}

/**
 * Set the running mode
 * @param item
 */
function setMode (item) {
    item.set('mode', (function () {
        if (item.get('server')) {
            return 'server';
        }
        if (item.get('proxy')) {
            return 'proxy';
        }
        return 'snippet';
    })());
}

/**
 * @param item
 */
function setScheme (item) {

    var scheme = 'http';

    if (item.getIn(['server', 'https'])) {
        scheme = 'https';
    }

    if (item.get('https')) {
        scheme = 'https';
    }

    if (item.getIn(['proxy', 'url', 'protocol'])) {
        if (item.getIn(['proxy', 'url', 'protocol']) === 'https:') {
            scheme = 'https';
        }
    }

    item.set('scheme', scheme);
}

/**
 * @param item
 */
function setStartPath (item) {

    if (item.get('proxy')) {
        var path = item.getIn(['proxy', 'url', 'path']);
        if (path !== '/') {
            item.set('startPath', path);
        }
    }

}

/**
 * @param item
 */
function setNamespace(item) {
    var namespace = item.getIn(['socket', 'namespace']);

    if (isFunction(namespace)) {
        item.setIn(['socket', 'namespace'], namespace(defaultOptions.socket.namespace));
    }
}

/**
 * @param item
 */
function setServerOpts(item) {

    if (item.get('server')) {

        var indexarg = item.get('index') || item.getIn(['server', 'index']) || 'index.html';
        var optPath  = ['server', 'serveStaticOptions'];

        if (item.get('directory')) {
            item.setIn(['server', 'directory'], true);
        }

        if (!item.getIn(optPath)) {
            item.setIn(optPath, Immutable.Map({
                index: indexarg
            }));
        } else {
            if (!item.hasIn(optPath.concat(['index']))) {
                item.setIn(optPath.concat(['index']), indexarg);
            }
        }

        // cli extensions
        if (item.get('extensions')) {
            item.setIn(optPath.concat(['extensions']), item.get('extensions'));
        }
    }
}

/**
 * Back-compat options for snippetOptions.ignorePaths
 */
function fixSnippetOptions (item) {

    var ignorePaths  = item.getIn(['snippetOptions', 'ignorePaths']);
    var includePaths = item.getIn(['snippetOptions', 'whitelist']);

    if (ignorePaths) {
        if (isString(ignorePaths)) {
            ignorePaths = [ignorePaths];
        }
        ignorePaths = ignorePaths.map(ensureSlash);
        item.setIn(['snippetOptions', 'blacklist'], Immutable.List(ignorePaths));
    }
    if (includePaths) {
        includePaths = includePaths.map(ensureSlash);
        item.setIn(['snippetOptions', 'whitelist'], Immutable.List(includePaths));
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

    var mw = getMiddlwares(item);

    item.set('middleware', mw);
}

/**
 * top-level option, or given as part of the proxy/server option
 * @param item
 * @returns {*}
 */
function getMiddlwares (item) {

    var mw       = item.get('middleware');
    var serverMw = item.getIn(['server', 'middleware']);
    var proxyMw  = item.getIn(['proxy',  'middleware']);

    var list     = Immutable.List([]);

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