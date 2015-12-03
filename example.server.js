var bs = require('./');

bs.create({
    serveStatic: ['test/fixtures'],
    files:       [
        'test/fixtures/*.html',
        'test/fixtures/ui/**'
    ],
    //proxy: {target: 'http://www.bbc.co.uk'},
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
        '/Users/shakyshane/Sites/browser-sync-modules/browser-sync-cp', // laptop
        './lib/plugins/proxy',
        './lib/plugins/404'
        //'/Users/shakyshane/sites/oss/UI'
    ],
    externals: {
        //clientJs: '/Users/shaneobsourne/sites/browser-sync-client'
        clientJs: '/Users/shakyshane/code/bs-client' // laptop
        //clientJs: '/Users/shakyshane/sites/oss/browser-sync-client/' // home imac
    }
    //minify: false
}, function (err, bs) {
    console.log(bs.options.get('urls').toJS());
});
