var bs = require('./');

bs.create({
    strict: false,
    proxy: {
        target: 'http://localhost:3000',
        ws: true
    },
    files: ['*.js', 'test/fixtures'],
    //devMode: true,
    //rewriteRules: [
    //    {
    //        match: "http://static.bbci.co.uk/frameworks/barlesque/3.7.3/orb/4/style/orb.min.css",
    //        replace:
    //    }
    //]
    plugins: [
        //'/Users/shakyshane/Sites/browser-sync-modules/browser-sync-cp', // laptop
        //'/Users/shakyshane/Sites/browser-sync-modules/browser-sync-cp', // laptop
        './lib/plugins/proxy',
        //'./lib/plugins/404',
        './lib/plugins/watcher'
        //'/Users/shakyshane/sites/oss/UI'
    ],
    externals: {
        clientJs: __dirname + '/client/'
        //clientJs: '/Users/shakyshane/code/bs-client' // laptop
        //clientJs: '/Users/shakyshane/sites/oss/browser-sync-client/' // home imac
    }
    //minify: false
}, function (err, bs) {
    //console.log('err', err);
    if (err) {
        return;
    }
    setTimeout(() => {
        bs.cleanup(function () {

        });
    }, 4000);
    //console.log(bs.options.get('urls').toJS());
});
