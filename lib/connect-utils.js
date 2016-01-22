'use strict';

const fs             = require('fs');
const path           = require('path');
const config         = require('./config');
const isFunction     = require('./utils').isFunction;
const template       = require('./utils').template;
const socketTemplate = fs.readFileSync(config.templates.connector, 'utf-8');
const scriptTemplate = fs.readFileSync(config.templates.scriptTag, 'utf-8');

const CONNECTOR_LOCAL    = '"//" + location.host + "{{ns}}"';
const CONNECTOR_EXTERNAL = '"{{scheme}}://" + location.hostname + ":{{port}}{{ns}}"';

const cu = exports;

/**
 * Use socket socket client path + config
 * to create JS file path such as
 * /browser-sync/browser-sync-client.js
 * @param options
 * @returns {string}
 */
cu.clientScript = function (options) {
    return [
        options.getIn(['socket', 'clientPath']),
        config.client.jsFilePath
    ].join('');
}

/**
 * Create the script tags for use by any Browsersync
 * server. This means they are absolute paths such as
 *     src="/browser-sync/browser-sync-client"
 * Doing this allows socket connections through all localhost/IP/Tunnel addresses
 * @param {Map} options
 * @returns {String}
 */
cu.scriptTags = function (options) {
    return cu.snippet(options, [
        cu.clientScript(options),
        '?v=3.0.0'
    ].join(''));
};

/**
 * For users who want to manually add the Browsersync snippet themselves,
 * this will create a full URL that uses the current page location.hostname
 * along with the Browsersync port + script path
 * Create a script
 * @param {Map} options
 */
cu.externalScriptTags = function (options) {
    return cu.snippet(options, [
        options.get('scheme'),
        '://HOST:',
        cu.clientScript(options),
        '?v=3.0.0'
    ].join(''));
};

/**
 * All
 * @param options
 * @param src
 * @returns {*}
 */
cu.snippet = function (options, src) {
    const async    = options.getIn(['snippetOptions', 'async']);
    return template(scriptTemplate, {
        src: src,
        async: async ? 'async' : ''
    });
};

/**
 * @param {Map} options
 * @returns {String}
 */
cu.socketConnector = function (options) {

    if (options.getIn(['socket', 'port'])) {
        return cu._socketConnector(options, template(CONNECTOR_EXTERNAL, {
            ns: options.getIn(['socket', 'namespace']),
            port: options.getIn(['socket', 'port']),
            scheme: options.get('scheme')
        }));
    }
    return cu._socketConnector(options, template(CONNECTOR_LOCAL, {
        ns: options.getIn(['socket', 'namespace'])
    }));
};

/**
 * Get an external connector for plugins
 * The main difference here is that external consumers
 * must connect via the location.hostname + port such as
 *    external service running at http://localhost:3001
 *    want to connect to bs, needs http://localhost:3000/
 * @param {Map} options
 * @param {{namespace: String}} opts
 * @returns {String}
 */
cu.externalSocketConnector = function (options, opts) {
    return cu._socketConnector(options, template(CONNECTOR_EXTERNAL, {
        scheme: options.get('scheme'),
        port: options.get('port'),
        ns: opts.namespace,
    }));
};

/**
 * Using socket configuration + a customised URL,
 * generate the block of JS used to connect to Browsersync
 * @param {Map} options
 * @param {String} url
 * @returns {String}
 * @private
 */
cu._socketConnector = function (options, url) {

    const socket = options.get('socket');

    const clientConfig = socket
        .getIn(['socketIoClientConfig'])
        .merge({path: socket.getIn(['socketIoOptions', 'path'])});

    return template(socketTemplate, {
        config: JSON.stringify(clientConfig.toJS()),
        url: url
    });
};

/**
 * Allow plugins access to the same socket.io script
 * that Browsersync uses
 * @returns {String}
 */
cu.getSocketIoScript = () => fs.readFileSync(path.join(__dirname, config.socketIoScript), 'utf-8');