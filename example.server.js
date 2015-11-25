var bs = require('./');

bs.create({
    //serveStatic: ['test/fixtures'],
    proxy: {target: 'http://sunspel.static/'},
    scheme: 'https',
    rewriteRules: [
        {
            match: 'fast.fonts.net',
            replace: 'shane is ace',
            paths: ['/assets/css/core.min.css**']
        }
    ],
    plugins: [
        './lib/proxy',
        '/Users/shakyshane/Sites/browser-sync-modules/browser-sync-cp'
    ],
    //plugins: ['/Users/shakyshane/sites/oss/UI'],
    //plugins: ['./lib/proxy'],
    externals: {
        //clientJs: '/Users/shaneobsourne/sites/browser-sync-client'
        clientJs: '/Users/shakyshane/code/bs-client'
        //clientJs: '/Users/shakyshane/sites/oss/browser-sync-client/' // home imac
    }
    //minify: false
}, function (err, bs) {
    console.log(bs.options.get('urls'));
});
