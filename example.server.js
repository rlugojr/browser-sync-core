var bs = require('./');

bs.create({
    serveStatic: 'test/fixtures',
    externals: {
        clientJs: '/Users/shaneobsourne/sites/browser-sync-client'
    }
}, function (err, bs) {
    console.log(bs.options.get('urls'));
});