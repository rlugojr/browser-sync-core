'use strict';

const devIp           = require('dev-ip')();
const Immutable       = require('immutable');
const portScanner     = require('portscanner');
const path            = require('path');
const UAParser        = require('ua-parser-js');
const parser          = new UAParser();

var uniqueIdCounter   = 0;

const utils = {
    /**
     * @param {Object} options
     * @returns {String|boolean} - the IP address
     */
    getHostIp: function (options) {

        const external = options.get('externalIps').toJS();

        if (options) {
            var host = options.get('host');
            if (host && host !== 'localhost') {
                return host;
            }
            if (options.get('detect') === false || !external.length) {
                return false;
            }
        }

        return external.length ? external[0] : false;
    },
    /**
     * Set URL Options
     */
    getUrlOptions: function (options) {

        const scheme = options.get('scheme');
        const port   = options.get('port');
        const urls   = {};

        if (options.get('online') === false) {
            urls['local'] = utils.getUrl(scheme + '://localhost:' + port, options);
            return Immutable.fromJS(urls);
        }

        const external  = utils.xip(utils.getHostIp(options), options);
        var localhost = 'localhost';

        if (options.get('xip')) {
            localhost = '127.0.0.1';
        }

        localhost = utils.xip(localhost, options);

        return Immutable.fromJS(utils.getUrls(external, localhost, scheme, options));
    },
    /**
     * Append a start path if given in options
     * @param {String} url
     * @param {Object} options
     * @returns {String}
     */
    getUrl: function (url, options) {

        var prefix = '/';
        var startPath = options.get('startPath');

        if (startPath) {
            if (startPath.charAt(0) === '/') {
                prefix = '';
            }
            url = url + prefix + startPath;
        }

        return url;
    },
    /**
     * @param {String} external
     * @param {String} local
     * @param {String} scheme
     * @param {Object} options
     * @returns {{local: string, external: string}}
     */
    getUrls: function (external, local, scheme, options) {

        const urls = {
            'local': utils.getUrl(utils._makeUrl(scheme, local, options.get('port')), options)
        };

        if (external !== local) {
            urls['external'] = utils.getUrl(utils._makeUrl(scheme, external, options.get('port')), options);
        }

        return urls;
    },
    /**
     * @param {String} scheme
     * @param {String} host
     * @param {Number} port
     * @returns {String}
     * @private
     */
    _makeUrl: function (scheme, host, port) {
        return scheme + '://' + host + ':' + port;
    },
    /**
     * Get ports
     * @param {Object} options
     * @param {Function} cb
     */
    getPorts: function (options, cb) {

        var port  = options.get('port');
        var ports = options.get('ports'); // backwards compatibility
        var max;

        if (ports) {
            port = ports.get('min');
            max  = ports.get('max') || null;
        }

        utils.getPort(port, max, cb);
    },
    getPort: function (port, max, cb) {
        portScanner.findAPortNotInUse(port, max, {
            host: 'localhost',
            timeout: 1000
        }, cb);
    },
    /**
     * @param {String} ua
     * @returns {Object}
     */
    getUaString: function (ua) {
        return parser.setUA(ua).getBrowser();
    },
    /**
     * Open the page in browser
     * @param {String} url
     * @param {Object} options
     */
    openBrowser: function (url, options) {

        var open    = options.get('open');
        var browser = options.get('browser');

        if (utils.isString(open)) {
            if (options.getIn(['urls', open])) {
                url = options.getIn(['urls', open]);
            }
        }

        if (open) {
            if (browser !== 'default') {
                if (utils.isList(browser)) {
                    browser.forEach(function (browser) {
                        utils.open(url, browser);
                    });
                } else {
                    utils.open(url, browser); // single
                }
            } else {
                utils.open(url);
            }
        }
    },
    /**
     * Wrapper for open module - for easier stubbin'
     * @param url
     * @param name
     */
    open: function (url, name?) {
        require('opn')(url, name || null);
    },
    /**
     * @param {Boolean} kill
     * @param {String|Error} errMessage
     * @param {Function} [cb]
     */
    fail: function (kill, errMessage, cb) {
        if (kill) {
            if (utils.isFunction(cb)) {
                if (errMessage.message) { // Is this an error object?
                    cb(errMessage);
                } else {
                    cb(new Error(errMessage));
                }
            }
            process.exit(1);
        }
    },
    /**
     * Add support for xip.io urls
     * @param {String} host
     * @param {Object} options
     * @returns {String}
     */
    xip: function (host, options) {
        var suffix = options.get('hostnameSuffix');
        if (options.get('xip')) {
            return host + '.xip.io';
        }
        if (suffix) {
            return host + suffix;
        }
        return host;
    },
    /**
     * Determine if an array of file paths will cause a full page reload.
     * @param {Array} needles - filepath such as ["core.css", "index.html"]
     * @param {Array} haystack
     * @returns {Boolean}
     */
    //willCauseReload: function (needles, haystack) {
    //    return needles.some(function (needle) {
    //        //return !_.contains(haystack, path.extname(needle).replace('.', ''));
    //    });
    //},
    isList: Immutable.List.isList,
    isMap: Immutable.List.isMap,
    /**
     * @param {Map} options
     * @returns {Array}
     */
    getConfigErrors: function (options) {

        var messages = require('./config').errors;

        var errors = [];

        if (options.get('server') && options.get('proxy')) {
            errors.push(messages['server+proxy']);
        }

        if (options.get('https') && options.get('proxy')) {
            if (options.getIn(['proxy', 'url', 'protocol']) !== 'https:') {
                errors.push([messages['proxy+https'], options.getIn(['proxy', 'target'])].join(' '));
            }
        }

        return errors;
    },
    /**
     * @param {Map} options
     * @param {Function} [cb]
     */
    verifyConfig: function (options, cb) {
        var errors = utils.getConfigErrors(options);
        if (errors.length) {
            utils.fail(true, errors.join('\n'), cb);
            return false;
        }
        return true;
    },
    /**
     * @param err
     */
    defaultCallback: function (err) {
        if (err && err.message) {
            console.error(err.message);
        }
    },
    template: function (string, obj) {
        return string.replace(/\{\{(.+?)\}\}/g, function () {
            return obj[arguments[1]] || '';
        });
    },
    isString: function (val) {
        return typeof val === 'string';
    },
    isFunction: function (val) {
        return typeof val === 'function';
    },
    isUndefined: function (val) {
        return val === undefined;
    },
    isRegex: function (value) {
        return Object.prototype.toString.call(value) === '[object RegExp]';
    },
    serializeRegex: function (reg) {
        return {
            source:     reg.source,
            global:     reg.global,
            ignoreCase: reg.ignoreCase,
            multiline:  reg.multiline
        };
    },
    uniqueId: function () {
        return 'bs-plugin-' + String(uniqueIdCounter++);
    },
    ucfirst: function (s) {
        return s.substr(0, 1).toUpperCase() + s.substring(1);
    }
};

export default utils;

module.exports.portscanner  = portScanner;
module.exports.UAParser     = UAParser;
module.exports.connect      = require('connect');
module.exports.devIp        = devIp;
module.exports.serveStatic  = require('serve-static');
