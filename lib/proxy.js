
module.exports.initAsync = function (bs, opts, cb) {
    var utils     = require('./proxy-utils');
    var httpProxy = require('http-proxy');
    var target    = require('url').parse(bs.options.getIn(['proxy', 'target']));

    var proxy = httpProxy.createProxyServer({
        target: '',
        changeOrigin: true,
        autoRewrite: true,
        secure: false
    });

    proxy.on('error', function (err) {
        console.log('Proxy error', err);
    });

    proxy.on('proxyReq', function (res, req) {
        //console.log(req.url);
    });

    proxy.on('proxyRes', function (res, req) {
    	utils.checkCookies(res);
    });

    bs.setOption('rewriteRules', function (rr) {
    	return rr.concat(utils.rewriteLinks(target))
    }).subscribe();

    bs.setOption('middleware', function (mw) {
        return mw.concat({
            route: "",
            id: 'Browsersync Proxy',
            handle: function handlePath (req, res) {
                proxy.web(req, res, { target: target });
            }
        });
    }).subscribe();
    cb();
}