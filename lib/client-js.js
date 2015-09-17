var Immutable          = require('immutable');
var clientJs           = exports;
var isString           = require('./utils').isString;
var isFunction         = require('./utils').isFunction;
var snippet            = require('./snippet');
var respMod            = require('resp-modifier');
var serveStatic        = require('serve-static');
var connectUtils       = require('./connect-utils');
var mergePluginOptions = require('./transform-options').mergeOptionsWithPlugins;
var bsClient           = require('browser-sync-client');
var fs                 = require('fs');
var path               = require('path');
var config             = require('./config');
var count              = 0;

/**
 * Pull server:middleware hooks from plugins
 * @param {Map} options
 * @returns {Map}
 */
clientJs.addBuiltIns = function (options) {
    return options.update('clientJs', x => {
        return Immutable.fromJS([
            {
                id: 'bs-no-conflict',
                content: 'window.___browserSync___oldSocketIo = window.io;',
            },
            {
                id: 'bs-socket-io',
                content: fs.readFileSync(path.join(__dirname, config.socketIoScript), 'utf-8')
            },
            {
                id: 'bs-socket-connector',
                content: connectUtils.socketConnector(options)
            },
            {
                id: 'bs-client',
                content: bsClient.minified()
            }
        ]).map(x => {
            x.via = 'core';
            return x;
        }).concat(x);
    });
};

/**
 * @param options
 * @returns {Map}
 */
clientJs.merge = function (options) {
    var PLUGIN_OPT_PATH  = ['module', 'hooks', 'client:js'];
    var NAME_OPT_PATH    = ['module', 'plugin:name'];

    var pluginMw = options.get('plugins')
        .filter(item => item.hasIn(PLUGIN_OPT_PATH))
        .map(x => createOne(x.getIn(NAME_OPT_PATH), x.getIn(PLUGIN_OPT_PATH)))
        .toList();

    return options.update('clientJs', x => pluginMw.concat(x));
};

/**
 * Put all clientJs options/plugins into {content: '', id: fn, via: ''}
 * @param {Map} options
 * @returns {Map}
 */
clientJs.decorate = function (options) {
    return options.update('clientJs', x => x.map(item => createOne('user-options', item)));
};


/**
 * Get concatenated script
 * @param {Map} options
 * @returns {string}
 */
clientJs.getScript = function (options) {
    return options.get('clientJs').map(x => x.get('content')).join(';');
};

/**
 * @param via
 * @param item
 */
clientJs.createOne = createOne;

/**
 * @param coll
 * @returns {*}
 */
clientJs.fromJS = function (coll) {
    return Immutable.fromJS(coll.map(x => createOne('inline-plugin', x)));
};

/**
 * If a client:js is a simple string, create an obj.
 * Otherwise just merge
 * @param id
 * @param item
 * @returns {*}
 */
function createOne(via, item) {
    var id = 'bs-clientjs-' + (count += 1);
    if (Buffer.isBuffer(item)) {
        item = item.toString();
    }
    if (isString(item)) {
        return Immutable.Map({
            id: id,
            via: via,
            content: item
        });
    }
    return Immutable.Map({
        id: id,
        via: via,
        content: undefined
    }).mergeDeep(item);
}
