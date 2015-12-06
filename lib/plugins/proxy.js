const Imm         = require('immutable');
const isString    = require('../utils').isString;
const ProxyOption = Imm.Record({
    id: '',
    route: '',
    target: '',
    url: Imm.Map({}),
    rewriteRules: true,
    options: Imm.Map({
        changeOrigin: true,
        autoRewrite: true,
        secure: false
    })
});

module.exports.initAsync = function (bs, opts, cb) {
    /** Bail early if plugin loaded, but not used **/

    if (!bs.options.get('proxy')) {
        return cb();
    }

    const utils       = require('./proxy-utils');
    const httpProxy   = require('http-proxy');
    const proxies     = bs.options.getIn(['proxy']).toJS();
    const middlewares = proxies.map((x, i) => {
        const proxy   = httpProxy.createProxyServer(x.options);
        proxy.on('error', function (err) {
            console.log(x.id, 'Proxy error', err);
        });
        return {
            route: x.route,
            id: x.id,
            handle: function handlePath(req, res) {
                proxy.web(req, res, {
                    target: x.target
                });
            }
        }
    });
    const rewriteRules = proxies
        .filter(x => x.rewriteRules)
        .map(x => {
            return utils.rewriteLinks(x.url);
        });

    bs.setOption('middleware', mw => mw.concat(middlewares))
        .subscribe();

    bs.setOption('rewriteRules', rr => rr.concat(rewriteRules))
        .subscribe();

    //proxy.on('error', function (err) {
    //    console.log('Proxy error', err);
    //});
    //
    //proxy.on('proxyReq', function (proxyReq, req, res, options) {
    //    //console.log(proxyReq.setHeader);
    //});

    //proxy.on('proxyRes', function (res, req) {
    //    utils.checkCookies(res)// delete res.headers['content-security-policy'];
    //});
    cb();
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
            return initialProxyOption.map(createOne);
        }
        if (Imm.Map.isMap(initialProxyOption)) {
            return Imm.List([createOne(initialProxyOption)]);
        }
        if (isString(initialProxyOption)) {
            return Imm.List([createOne(Imm.Map({target: initialProxyOption}))])
        }
    });
};

/**
 * @param item
 * @returns {Cursor|List<T>|Map<K, V>|Map<string, V>|*}
 */
var count = 0;
function createOne (item) {
    return new ProxyOption(item)
        .mergeDeep({
            id: `Browsersync Proxy (${count += 1})`,
            url: Imm.Map(require('url').parse(item.get('target')))
        });
}