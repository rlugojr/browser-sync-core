import * as proxy from "./proxy.d";

const Imm       = require('immutable');
const debug     = require('debug')('bs:proxy');
const OPT_NAME  = 'proxy';

import utils from '../utils';
const isString  = utils.isString;

import * as proxyUtils from './proxy-utils';

/**
 * Initial options used when creating the node http-proxy server
 * Can be set per proxy
 * see:
 * @type {{changeOrigin: boolean, autoRewrite: boolean, secure: boolean}}
 */
const defaultHttpProxyOptions = <proxy.HttpProxyOptions>{
    changeOrigin: true,
    autoRewrite: true,
    secure: false,
    ws: true
};

/**
 * Sometimes we need to strip the domain from set-cookie headers
 * to stop the browser trying to set a domain that will fail.
 * This helps login systems such as Magento
 * @type {{stripDomain: boolean}}
 */
const defaultCookieOptions = <proxy.CookieOptions>{
    stripDomain: true
};

/**
 * Browsersync proxy option
 */
const ProxyOption = Imm.Record(<proxy.ProxyOption>{
    id: '',
    route: '',
    target: '',
    rewriteRules: true,
    /**
     * Functions to be called on proxy response
     * with args [proxyReq, req, res, options]
     */
    proxyReq:     Imm.List([]),
    /**
     * Functions to be called on proxy response
     * with args [proxyRes, req, res]
     */
    proxyRes:     Imm.List([]),
    proxyErr:     function(err, proxy) {
        console.log('Error from proxy');
        console.error(err);
        console.error(err.stack);
    },
    url:          Imm.Map({}),
    options:      Imm.Map(defaultHttpProxyOptions),
    cookies:      Imm.Map(defaultCookieOptions),
    ws:           false
});

module.exports["plugin:name"] = "Browsersync Proxy";
module.exports.init = function (bs, opts, obs) {

    /** Bail early if plugin loaded, but not used **/
    if (!bs.options.get(OPT_NAME)) {
        return obs.done();
    }

    const utils       = require('./proxy-utils');
    const httpProxy   = require('http-proxy');
    const proxies     = bs.options.getIn([OPT_NAME]);

    /**
     * For each proxy given, create a separate http-proxy server
     * middleware in the Browsersync format
     * with the options provided.
     */
    const middlewares = proxies.map((x) => {
        const proxy       = httpProxy.createProxyServer(x.get('options').toJS());
        const proxyReqFns = [].concat(x.get('proxyReq').toJS());
        const proxyResFns = [].concat(x.get('proxyRes').toJS());
        const target      = x.get('target');

        debug(`+ target: ${target}`);

        /**
         * proxy websockets if proxy.ws: true
         */
        if (x.get('ws')) {
            debug(`+ ws upgrade for: ${x.get('target')}`);
            bs.server.on('upgrade', function (req, socket, head) {
                proxy.ws(req, socket, head);
            });
        }

        /**
         * if cookies.stripDomain: true, parse & strip the
         * domain from any cookie
         */
        if (x.getIn(['cookies', 'stripDomain'])) {
            proxyResFns.push(utils.checkCookies);
        }

        /**
         * Add any user provided functions for proxyReq and proxyRes
         */
        applyFns('proxyReq', proxyReqFns);
        applyFns('proxyRes', proxyResFns);

        /**
         * Handle Proxy errors
         */
        proxy.on('error', x.get('proxyErr'));

        /**
         * Apply functions to proxy events
         * @param {string} name - the name of the http-proxy event
         * @param {Array} fns - functions to call on each event
         */
        function applyFns (name, fns) {
            proxy.on(name, function () {
                const args = arguments;
                fns.forEach(fn => {
                    fn.apply(null, args);
                });
            });
        }

        return {
            route: x.get('route'),
            id: x.get('id'),
            handle: function handleBrowsersyncProxy(req, res) {

                // todo: Is the following a real usecase?

                // eg: proxy: {route: "/api"}
                // ->  Add /api to proxy calls?

                proxy.web(req, res, {target: target});
            }
        }
    });

    /**
     * For any proxy that has rewriteRules: true,
     * add rewrite rules for it.
     */
    const rewriteRules = proxies
        .filter(x => x.get('rewriteRules') === true)
        .map(x => {
            return proxyUtils.rewriteLinks(x.get('url').toJS());
        });

    bs.setOption('middleware', mw => mw.concat(middlewares.toJS())).subscribe();
    bs.setOption('rewriteRules', rr => rr.concat(rewriteRules.toJS())).subscribe();
};

/**
 * Accept options in the following formats:
 * 1. proxy: 'http://www.bbc.co.uk'
 * 2. proxy: { target: http://www.bbc.co.uk, route: '/api' }
 * 3. proxy: [
 *      {
 *          target: http://www.bbc.co.uk,
 *          route: ''
 *      }
 *      {
 *          target: http://www.bbc.co.uk,
 *          route: '/api'
 *      }
 * @param {Immutable.Map} options
 */
module.exports.transformOptions = function (options) {

    return options.update(OPT_NAME, initialProxyOption => {
        if (Imm.List.isList(initialProxyOption)) {
            return initialProxyOption.map(stubIncomingString).map(createOneProxyOption);
        }
        if (Imm.Map.isMap(initialProxyOption)) {
            return Imm.List([createOneProxyOption(initialProxyOption)]);
        }
        if (isString(initialProxyOption)) {
            return Imm.List([createOneProxyOption(stubIncomingString(initialProxyOption))])
        }
    });
};

/**
 * @param item
 * @returns {*}
 */
function stubIncomingString (item) {

    if (!isString(item)) {
        return item;
    }

    if (!item.match(/^https?:\/\//)) {
        item = 'http://' + item
    }

    return Imm.Map({target: item});
}

/**
 * @param item
 * @returns {Cursor|List<T>|Map<K, V>|Map<string, V>|*}
 */
var count = 0;

function createOneProxyOption (item) {
    return new ProxyOption()
        .mergeDeep(item.mergeDeep({
            id: `Browsersync Proxy (${count += 1})`,
            url: Imm.Map(require('url').parse(item.get('target'))),
            options: {
                target: item.get('target')
            }
        }));
}
