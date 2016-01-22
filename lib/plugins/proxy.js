const Imm         = require('immutable');
const isString    = require('../utils').isString;
const debug       = require('debug')('bs:proxy');

/**
 * Sometimes we need to strip the domain from set-cookie headers
 * to stop the browser trying to set a domain that will fail.
 * This helps login systems such as Magento
 * @type {{stripDomain: boolean}}
 */
const defaultCookieOptions = {
    stripDomain: true
};

/**
 * Initial options used when creating the node http-proxy server
 * Can be set per proxy
 * see:
 * @type {{changeOrigin: boolean, autoRewrite: boolean, secure: boolean}}
 */
const defaultProxyOptions = {
    changeOrigin: true,
    autoRewrite: true,
    secure: false,
    ws: true
};

/**
 * Browsersync proxy option
 */
const ProxyOption = Imm.Record({
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
    options:      Imm.Map(defaultProxyOptions),
    cookies:      Imm.Map(defaultCookieOptions),
    ws:           false
});

module.exports["plugin:name"] = "Browsersync Proxy";
module.exports.initAsync = function (bs, opts, obs) {

    /** Bail early if plugin loaded, but not used **/
    if (!bs.options.get('proxy')) {
        return obs.done();
    }

    const utils       = require('./proxy-utils');
    const httpProxy   = require('http-proxy');
    const proxies     = bs.options.getIn(['proxy']).toJS();

    debug(`adding ${proxies.length} proxies`);

    /**
     * For each proxy given, create a separate http-proxy server
     * middleware in the Browsersync format
     * with the options provided.
     */
    const middlewares = proxies.map((x, i) => {
        const proxy       = httpProxy.createProxyServer(x.options);
        const proxyReqFns = [].concat(x.proxyReq);
        const proxyResFns = [].concat(x.proxyRes);

        /**
         * proxy websockets if proxy.ws: true
         */
        if (x.ws) {
            bs.server.on('upgrade', function (req, socket, head) {
                proxy.ws(req, socket, head);
            });
        }

        /**
         * if cookies.stripDomain: true, parse & strip the
         * domain from any cookie
         */
        if (x.cookies.stripDomain) {
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
        proxy.on('error', x.proxyErr);

        /**
         * Apply functions to proxy events
         * @param {string} name - the name of the http-proxy event
         * @param {Array} fns - functions to call on each event
         */
        function applyFns (name, fns) {
            proxy.on(name, function () {
                fns.forEach(fn => fn.apply(null, arguments));
            });
        }

        return {
            route: x.route,
            id: x.id,
            handle: function handlePath(req, res) {
                proxy.web(req, res, {target: x.target});
            }
        }
    });

    /**
     * For any proxy that has rewriteRules: true,
     * add rewrite rules for it.
     */
    const rewriteRules = proxies
        .filter(x => x.rewriteRules)
        .map(x => {
            return utils.rewriteLinks(x.url);
        });

    bs.setOption('middleware', mw => mw.concat(middlewares)).subscribe();
    bs.setOption('rewriteRules', rr => rr.concat(rewriteRules)).subscribe();

    obs.done();
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

    return options.update('proxy', initialProxyOption => {
        if (Imm.List.isList(initialProxyOption)) {
            return initialProxyOption.map(stub).map(createOne);
        }
        if (Imm.Map.isMap(initialProxyOption)) {
            return Imm.List([createOne(initialProxyOption)]);
        }
        if (isString(initialProxyOption)) {
            return Imm.List([createOne(stub(initialProxyOption))])
        }
    });
};

function stub (item) {
    if (isString(item)) {
        return Imm.Map({target: item});
    }
    return item;
}

/**
 * @param item
 * @returns {Cursor|List<T>|Map<K, V>|Map<string, V>|*}
 */
var count = 0;

function createOne (item) {
    return new ProxyOption()
        .mergeDeep(item.mergeDeep({
            id: `Browsersync Proxy (${count += 1})`,
            url: Imm.Map(require('url').parse(item.get('target'))),
            options: {
                target: item.get('target')
            }
        }));
}
