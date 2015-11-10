var bs = require('./');

bs.create({
    serveStatic: 'test/fixtures',
    externals: {
        //clientJs: '/Users/shaneobsourne/sites/browser-sync-client',
        //clientJs: '/Users/shakyshane/code/bs-client'
        clientJs: '/Users/shakyshane/sites/oss/browser-sync-client/' // home imac
    },
    minify: false
}, function (err, bs) {
    console.log(bs.options.get('urls'));
});
