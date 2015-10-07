'use strict';

var fs            = require('fs');
var path          = require('path');
var config        = require('./config');
var isFunction    = require('./utils').isFunction;

var cu = exports;

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
 * @param {Immutable.Map} options
 * @returns {String}
 */
cu.scriptTags = function (options) {

    var template = fs.readFileSync(config.templates.scriptTag, 'utf-8');
    var async    = options.getIn(['snippetOptions', 'async']);

    var script   = [
        options.get('scheme'),
        '://HOST:',
        options.get('port'),
        cu.clientScript(options),
        "?v=3.0.0"
    ].join('');

    return template
        .replace('{script}', script)
        .replace('{async}', async ? 'async' : '');
}

/**
 * @param {Map} options
 * @returns {String}
 */
cu.socketConnector = function (options) {

    var socket        = options.get('socket');
    var template      = fs.readFileSync(config.templates.connector, 'utf-8');
    var url           = cu.getConnectionUrl(options);

    template = template
        .replace('%path%', socket.getIn(['socketIoOptions', 'path']))
        .replace('%url%',  url);

    return template;
};

/**
 * @param {Object} socketOpts
 * @param {Map} options
 * @returns {String|Function}
 */
cu.getNamespace = function (socketOpts, options) {

    var namespace = socketOpts.namespace;


    if (typeof namespace === 'function') {
        return namespace(options);
    }

    if (!namespace.match(/^\//)) {
        namespace = '/' + namespace;
    }

    return namespace;
};

/**
 * @param {Map} options
 * @returns {string}
 */
cu.getConnectionUrl = function (options) {

    var socketOpts       = options.get('socket').toJS();
    var namespace        = cu.getNamespace(socketOpts, options);

    var protocol         = options.get('scheme') + '://';
    var withHostnamePort = '"{protocol}" + location.hostname + ":{port}{ns}"';
    var withHost         = '"{protocol}" + location.host + "{ns}"';
    var withDomain       = '"{domain}{ns}"';
    var port             = options.get('port');

    // default use-case is server/proxy
    var string           = withHost;

    //if (options.get('mode') !== 'server') {
    //    protocol = '//';
        string   = withHostnamePort;
    //}

    if (options.get('mode') === 'proxy' && options.getIn(['proxy', 'ws'])) {
        port = options.getIn(['socket', 'port']);
    }

    if (socketOpts.domain) {
        string = withDomain;
        if (typeof socketOpts.domain === 'function') {
            socketOpts.domain = socketOpts.domain.call(null, options);
        }
    }

    var out = string
        .replace('{protocol}', protocol)
        .replace('{port}',     port)
        .replace('{domain}',   socketOpts.domain)
        .replace('{ns}',       namespace);

    return out;
};

cu.getSocketIoScript = () => fs.readFileSync(path.join(__dirname, config.socketIoScript), 'utf-8');

/**
 * @param options
 * @returns {*[]}
 */
function getScriptArgs (options, scriptPath) {
    var abspath = options.get('scheme') + '://HOST:' + options.get('port') + scriptPath;
    return [
        scriptPath,
        options.get('port'),
        options.set('absolute', abspath)
    ];
}