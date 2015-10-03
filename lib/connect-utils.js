'use strict';

var fs            = require('fs');
var path          = require('path');
var config        = require('./config');
var isFunction    = require('./utils').isFunction;

var connectUtils = {
    /**
     * @param {Immutable.Map} options
     * @returns {String}
     */
    scriptTags: function (options) {

        function getPath(relative, port) {
            return 'http://HOST:' + port + relative;
        }

        var template   = fs.readFileSync(config.templates.scriptTag, 'utf-8');
        var scriptPath = this.clientScript(options) + "?v=3.0.0";
        var async = options.getIn(['snippetOptions', 'async']);
        var script;
        var override = false;

        if (isFunction(options.get('scriptPath'))) {
            var args = getScriptArgs(options, scriptPath);
            script   = options.get('scriptPath').apply(null, args);
            override = true;
        } else {
            script = getPath(scriptPath, options.get('port'));
        }

        script = scriptPath;

        template = template
            .replace('%script%', script)
            .replace('%async%', async ? 'async' : '');

        return template;
    },
    /**
     * @param {Map} options
     * @returns {String}
     */
    socketConnector: function (options) {

        var socket        = options.get('socket');
        var template      = fs.readFileSync(config.templates.connector, 'utf-8');
        var url           = connectUtils.getConnectionUrl(options);

        template = template
            .replace('%path%', socket.getIn(['socketIoOptions', 'path']))
            .replace('%url%',  url);

        return template;
    },
    /**
     * @param {Object} socketOpts
     * @param {Map} options
     * @returns {String|Function}
     */
    getNamespace: function (socketOpts, options) {

        var namespace = socketOpts.namespace;


        if (typeof namespace === 'function') {
            return namespace(options);
        }

        if (!namespace.match(/^\//)) {
            namespace = '/' + namespace;
        }

        return namespace;
    },
    /**
     * @param {Map} options
     * @returns {string}
     */
    getConnectionUrl: function (options) {

        var socketOpts       = options.get('socket').toJS();
        var namespace        = connectUtils.getNamespace(socketOpts, options);

        var protocol         = '';
        var withHostnamePort = '"{protocol}" + location.hostname + ":{port}{ns}"';
        var withHost         = '"{protocol}" + location.host + "{ns}"';
        var withDomain       = '"{domain}{ns}"';
        var port             = options.get('port');

        // default use-case is server/proxy
        var string           = withHost;

        //if (options.get('mode') !== 'server') {
            protocol = '//';
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
    },
    /**
     * @param {Object} [options]
     */
    clientScript: function (options) {
        return [
            options.getIn(['socket', 'clientPath']),
            '/browser-sync-client.js'
        ].join('');
    },
    getSocketIoScript: () => fs.readFileSync(path.join(__dirname, config.socketIoScript), 'utf-8')
};

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

module.exports = connectUtils;
