var Immutable    = require('immutable');
var mw           = exports;
var isString     = require('./utils').isString;
var isFunction   = require('./utils').isFunction;
var snippet      = require('./snippet');
var clientJs     = require('./client-js');
var respMod      = require('resp-modifier');
var serveStatic  = require('serve-static');
var connectUtils = require('./connect-utils');
var mergeOpts    = require('./transform-options').mergeOptionsWithPlugins;
var bsClient     = require('browser-sync-client');
var fs           = require('fs');
var path         = require('path');
var config       = require('./config');
var count        = 0;

/**
 * Pull server:middleware hooks from plugins
 * @param {Map} options
 * @returns {Map}
 */
mw.merge = function (options) {
    return mergeOpts(options, 'middleware', 'server:middleware');
};

/**
 * Put all middlewares into {path: '', fn: fn} format
 * @param {Map} options
 * @returns {Map}
 */
mw.decorate = function (options) {
    return options.update('middleware', x => x.map(createOne));
};

/**
 * @param item
 * @returns {*}
 */
function createOne (item) {
    var id = 'bs-middleware-' + (count += 1);
    if (isFunction(item)) {
        return Immutable.Map({
            id: id,
            route: '',
            handle: item
        });
    }
    return Immutable.Map({
        id: id,
        route: '',
        handle: undefined
    }).mergeDeep(item);
}

/**
 * JS -> Immutable transformation
 * @param coll
 * @returns {*}
 */
mw.fromJS = function (coll) {
    return Immutable.fromJS(coll.map(createOne));
};

/**
 * Combine default + user + plugin middlewares
 * @param options
 * @returns {{middleware: Array.<*>, snippetMw, clientScript: *}}
 */
mw.getMiddleware = function (options) {

    var snippetMw      = respMod.create(snippet.rules(options));
    var cli            = clientJs.getScript(options);

    var clientJsHandle = (req, res) => {
        res.setHeader("Content-Type", "text/javascript");
        res.end(cli);
    };

    return {
        middleware: [
            {
                id: 'bs-client',
                route: options.get('scriptPath'),
                handle: clientJsHandle
            },
            {
                route: '',
                id: 'bs-rewrite-rules',
                handle: snippetMw.middleware
            }
        ]
            .concat(serveStaticMw(options))
            .concat(options.get('middleware').toJS())
    }
};

/**
 * Serve static middleware for server
 * @param options
 * @returns {Array|List}
 */
function serveStaticMw (options) {
    return options
        .get('serveStatic')
        .toJS()
        .map(x => {
            return {
                route: '',
                handle: serveStatic(x.root, x.options)
            }
        });
}