var Immutable = require('immutable');
var mw        = exports;
var isString         = require('./utils').isString;
var isFunction       = require('./utils').isFunction;
var snippet          = require('./snippet');
var respMod          = require('resp-modifier');
var serveStatic      = require('serve-static');
var connectUtils     = require('./connect-utils');
var mergeOpts     = require('./transform-options').mergeOptionsWithPlugins;
var bsClient = require('browser-sync-client');
var fs = require('fs');
var path = require('path');
var config = require('./config');

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
                    path: '',
                    fn: item
                });
            }
            return Immutable.Map({
                path: '',
                fn: undefined
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
    var clientScript = serveClientScript(options);
    var snippetMw = respMod.create(snippet.rules(options));

    return {
        middleware: [
            {
                id: 'bs-client',
                path: '/browser-sync/browser-sync-client.js',
                fn: clientScript.fn
            },
            {
                id: 'bs-client-versioned',
                path: '/browser-sync/browser-sync-client.%s.js'.replace('%s', options.get('version')),
                fn: clientScript.fn
            },
            {
                path: '',
                id: 'bs-rewrite-rules',
                fn: snippetMw.middleware
            }
        ].concat(options.get('middleware').toJS())
            .concat(serveStaticMw(options)),
        snippetMw: snippetMw,
        clientScript: clientScript
    }
};

/**
 * Serve static middleware for server
 * @param options
 * @returns {Array|List}
 */
function serveStaticMw (options) {
    if (!options.get('server')) {
        return [];
    }
    return options
        .getIn(['server', 'baseDir'])
        .toJS()
        .map((item, i) => {
            return {
                path:'',
                fn: serveStatic('./test/fixtures'),
                id: 'bs-serveStatic-' + i
            }
        });
}

/**
 * Create client JS combined with user/plugin client js
 * @param options
 * @returns {{clientJs: Array.<*>, fn: Function}}
 */
function serveClientScript (options) {

    var clientJS = [
        {
            id: 'bs-no-conflict',
            content: 'window.___browserSync___oldSocketIo = window.io;'
        },
        {
            id: 'bs-socket-io',
            content: fs.readFileSync(path.join(__dirname, config.socketIoScript), "utf-8")
        },
        {
            id: 'bs-socket-connector',
            content: connectUtils.socketConnector(options)
        },
        {
            id: 'bs-client',
            content: bsClient.minified()
        }
    ].concat(options.get('clientJs').toJS());

    return {
        clientJs: clientJS,
        fn: (req, res) => {
            res.setHeader("Content-Type", "text/javascript");
            res.end(clientJS.map(item => item.content).join(';'));
        }
    };
}