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
    var mw = options
        .get('middleware')
        .map(item => {
            if (isFunction(item)) {
                return Immutable.Map({
                    route: '',
                    handle: item
                });
            }
            return Immutable.Map({
                route: '',
                handle: undefined
            }).mergeDeep(item);
        });

    return options.set('middleware', mw);
};

/**
 * Combine default + user + plugin middlewares
 * @param options
 * @returns {{middleware: Array.<*>, snippetMw, clientScript: *}}
 */
mw.getMiddleware = function (options) {
    var snippetMw = respMod.create(snippet.rules(options));

    return {
        middleware: [
            {
                id: 'bs-client',
                route: options.getIn(['scriptPaths', 'path']),
                handle: function (req, res, next) {
                    next();
                }
            },
            {
                id: 'bs-client-versioned',
                route: options.getIn(['scriptPaths', 'versioned']),
                handle: function (req, res, next) {
                    next();
                }
            },
            {
                route: '',
                id: 'bs-rewrite-rules',
                handle: snippetMw.middleware
            }
        ].concat(options.get('middleware').toJS())
            .concat(serveStaticMw(options)),
        snippetMw: snippetMw
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