var Immutable     = require('immutable');
var clientJs      = exports;
var isString      = require('./utils').isString;
var isFunction    = require('./utils').isFunction;
var snippet       = require('./snippet');
var respMod       = require('resp-modifier');
var serveStatic   = require('serve-static');
var connectUtils  = require('./connect-utils');
var mergeOpts     = require('./transform-options').mergeOptionsWithPlugins;
var bsClient      = require('browser-sync-client');
var fs            = require('fs');
var path          = require('path');
var config        = require('./config');
var count         = 0;

/**
 * Pull server:middleware hooks from plugins
 * @param {Map} options
 * @returns {Map}
 */
clientJs.merge = function (options) {
    return mergeOpts(options, 'clientJs', 'client:js');
};

/**
 * Put all middlewares into {path: '', fn: fn} format
 * @param {Map} options
 * @returns {Map}
 */
clientJs.decorate = function (options) {
    var mw = options
        .get('clientJs')
        .map(item => {
            var id = 'bs-clientjs-' + (count += 1);
            if (isString(item)) {
                return Immutable.Map({
                    id: id,
                    content: item
                });
            }
            return Immutable.Map({
                id: id,
                content: undefined
            }).mergeDeep(item);
        });

    return options.set('clientJs', mw);
};

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
    ].concat(options.get('clientJs').toJS());

    return {
        clientJs: clientJS,
        fn: (req, res) => {
            res.setHeader('Content-Type', 'text/javascript');
            res.end(clientJS.map(item => item.content).join(';'));
        }
    };
}

module.exports.serveClientScript = serveClientScript;