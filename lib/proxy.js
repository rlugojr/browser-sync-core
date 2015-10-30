module.exports.initAsync = function (bs, opts, cb) {
    var httpProxy = require('http-proxy');

    var proxy = httpProxy.createProxyServer({
        target: '',
        changeOrigin: true
    });

    proxy.on('error', function (err) {
        console.log(err);
    });

    bs.setOption('rewriteRules', function (rr) {
    	return rr.concat({
            id: 'bs-proxy-rr',
            match: /hype-for-type\.static/g,
            replace: 'localhost:3000'
        })
    }).subscribe();
    bs.setOption('middleware', function (mw) {
        return mw.concat({
            route: "",
            id: 'Browsersync Proxy',
            handle: function handlePath (req, res) {
                proxy.web(req, res, { target: "http://www.bbc.co.uk" });
            }
        });
    }).subscribe();
}