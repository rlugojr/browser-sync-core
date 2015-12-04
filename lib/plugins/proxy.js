module.exports.initAsync = function (bs, opts, cb) {
    /** Bail early if plugin loaded, but not used **/
    if (!bs.options.hasIn(['proxy', 'target'])) {
        return cb();
    }

    const utils     = require('./proxy-utils');
    const httpProxy = require('http-proxy');
    const target    = bs.options.getIn(['proxy', 'target']);

    const proxy = httpProxy.createProxyServer({
        target: '',
        changeOrigin: true,
        autoRewrite: true,
        secure: false
    });

    proxy.on('error', function (err) {
        console.log('Proxy error', err);
    });

    proxy.on('proxyReq', function (proxyReq, req, res, options) {
        //console.log(proxyReq.setHeader);
    });

    proxy.on('proxyRes', function (res, req) {
        utils.checkCookies(res);
        // delete res.headers['content-security-policy'];
    });

    bs.setOption('rewriteRules', rr => rr.concat(utils.rewriteLinks(target)))
        .subscribe();

    bs.setOption('middleware', function (mw) {
        return mw.concat({
            route: '',
            id: 'Browsersync Proxy',
            handle: function handlePath (req, res) {
                proxy.web(req, res, { target: target });
            }
        });
    }).subscribe();
    cb();
};

/**
 * @param {Immutable.Map} options
 */
module.exports.transformOptions = function (options) {
    const proxyPath = ['proxy', 'target'];
    if (options.hasIn(proxyPath)) {
        const target = require('url').parse(options.getIn(proxyPath));
        return options
            .updateIn(proxyPath, x => target)
            .update('scheme', x => target.protocol.slice(0, -1))
    }
    return options;
};