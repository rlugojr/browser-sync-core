var bs = require('./');

bs.create({
    //serveStatic: ['test/fixtures'],
    proxy: {target: 'http://www.bbc.co.uk'},
    //scheme: 'https',
    rewriteRules: [
        //{
            //match: /info\.sunspel\.dev/g,
            //fn: function (req, res, match) {
            //    return 'http://' + req.headers['host'];
            //}
        //}
    ],
    plugins: [
        './lib/proxy',
        //'/Users/shakyshane/Sites/browser-sync-modules/browser-sync-cp'
        '/Users/shakyshane/sites/oss/UI'
    ],
    //plugins: ['/Users/shakyshane/sites/oss/UI'],
    //plugins: ['./lib/proxy'],
    externals: {
        //clientJs: '/Users/shaneobsourne/sites/browser-sync-client'
        //clientJs: '/Users/shakyshane/code/bs-client'
        clientJs: '/Users/shakyshane/sites/oss/browser-sync-client/' // home imac
    }
    //minify: false
}, function (err, bs) {
    console.log(bs.options.get('urls'));
});
