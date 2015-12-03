var Immutable          = require('immutable');
var clientJs           = exports;
var isString           = require('./utils').isString;
var isFunction         = require('./utils').isFunction;
var snippet            = require('./snippet');
var respMod            = require('resp-modifier');
var serveStatic        = require('serve-static');
var connectUtils       = require('./connect-utils');
var mergePluginOptions = require('./transform-options').mergeOptionsWithPlugins;
var fs                 = require('fs');
var path               = require('path');
var config             = require('./config');
var count              = 0;
var OPT_NAME           = 'clientJs';
var socketIoClient     = fs.readFileSync(path.join(__dirname, config.socketIoScript), 'utf-8');

/**
 * Make absolute script paths available
 * in the urls option.
 *
 * eg: bs.options.getIn(['client-local']);
 * eg: bs.options.getIn(['client-external']);
 * @param options
 * @returns {*}
 */
clientJs.addUrls = function (options) {
    const scriptPath = connectUtils.clientScript(options);
    return options.update('urls', x => {

        const tomerge = {
            'client-local':    x.get('local') + scriptPath
        };

        if (x.has('external')) {
            tomerge['client-external'] = x.get('external') + scriptPath;
        }

        return x.mergeDeep(Immutable.fromJS(tomerge))
    });
};

/**
 * Use a string
 * bs.setOption('clientJs', x => x.concat('my JS')).subscribe();
 *
 * Use an object
 * bs.setOption('clientJs', x => x.concat({
 *     id: 'my Js'
 *     via: 'Where I came from ?',
 *     content: 'string or buffer'
 * })).subscribe();
 *
 * id: id,
 * via: via,
 * content: undefined
 *
 *
 */

/**
 * Combine core Client js + Plugins + User Provided client JS
 * @param {Map} options
 * @returns {Map}
 */
clientJs.addBuiltIns = function (options) {
    var bsClient = require(options.getIn(['externals', OPT_NAME]));
    return options.update(OPT_NAME, x => {
        return Immutable.fromJS([
            {
                id: 'bs-no-conflict',
                content: 'window.___browserSync___oldSocketIo = window.io;'
            },
            {
                id: 'bs-socket-io',
                content: socketIoClient
            },
            {
                id: 'bs-socket-connector',
                content: connectUtils.socketConnector(options)
            },
            {
                id: 'browser-sync-client',
                content: options.get('minify') ? bsClient.minified() : bsClient.unminified()
            }
        ].map(x => {
            x.via = 'Browsersync core';
            return x;
        })).concat(x);
    });
};

/**
 * @param options
 * @returns {Map}
 */
clientJs.merge = function (options) {
    var PLUGIN_OPT_PATH  = ['module', 'hooks', 'option:' + OPT_NAME];

    var pluginMw = options.get('plugins')
        .filter(item => item.hasIn(PLUGIN_OPT_PATH))
        .map(x => createOne('PLUGIN: ' + x.get('name'), x.getIn(PLUGIN_OPT_PATH)))
        .toList();

    return options.update(OPT_NAME, x => pluginMw.concat(x));
};

/**
 * Put all clientJs options/plugins into {content: '', id: fn, via: ''}
 * @param {Map} options
 * @returns {Map}
 */
clientJs.decorate = function (options) {
    return options.update(OPT_NAME, x => x.map(item => createOne('user-options', item)));
};

/**
 * Get concatenated script
 * @param {Map} options
 * @returns {string}
 */
clientJs.getScript = function (options) {
    var items = options.get(OPT_NAME);
    return [
        listItems(items),
        options.get(OPT_NAME)
            .map(wrapItem)
            .join(';')
    ].join('');
};

/**
 * add meta info to client scripts
 * @param x
 * @returns {*}
 */
function listItems (items) {
    var list = items.map((x, i)=> {
        return ` ${i + 1}. ID: ${x.get('id')} :: (via ${x.get('via')})`
    }).join('\n');
    return `
/**
${list}
 */
`
}

function wrapItem (x, i) {
    return `
/** ----
 *  ${i + 1}
 *  ----
 *  ID:  ${x.get('id')}
 *  VIA: ${x.get('via')}
 *  ----
**/
${x.get('content')}
`
}

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
 * If a option:clientJs is a simple string, create an obj.
 * Otherwise just merge
 * @param via
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
