var bs = require('./');

bs.create({
    strict: false,
    serveStatic: ['test/fixtures'],
    files: [
        'test/fixtures/*.html'
        //'test/fixtures/**/*.css',
        //{
        //    match: 'test/fixtures/*.html',
        //    fn: function (event, path, x) {
        //        console.log(event, path);
        //    }
        //}
    ],
    devMode: true,
    //clientJs: [
    //    'const s = window.___browserSync___.socket; s.on("connection", (x) => console.log(x))'
    //],
    //files:       [],
    //proxy: {
    //    target: 'http://www.bbc.co.uk'
    //},
    //scheme: 'https',
    //rewriteRules: [
        //{
            //match: /info\.sunspel\.dev/g,
            //fn: function (req, res, match) {
            //    return 'http://' + req.headers['host'];
            //}
        //}
    //],
    plugins: [
        //{
        //    module: {
        //        initAsync: function (bs, opts, cb) {
        //            bs.getWatcher()
        //        }
        //    },
        //    name: 'my plugin',
        //    options: {
        //        files: "test/fixtures/*.html"
        //    }
        //},
        //'/Users/shakyshane/Sites/browser-sync-modules/browser-sync-cp', // laptop
        //'/Users/shakyshane/Sites/browser-sync-modules/browser-sync-cp', // laptop
        //'./lib/plugins/proxy',
        './lib/plugins/404',
        './lib/plugins/watcher'
        //'/Users/shakyshane/sites/oss/UI'
    ],
    //middleware: [
    //    {
    //        route: '/js',
    //        handle: require('browserify-middleware')('test/fixtures/js/app.js')
    //    }
    //],
    externals: {
        //clientJs: __dirname + '/client/'
        //clientJs: '/Users/shakyshane/code/bs-client' // laptop
        //clientJs: '/Users/shakyshane/sites/oss/browser-sync-client/' // home imac
    }
    //minify: false
}, function (err, bs) {
    //console.log('err', err);
    if (err) {
        return;
    }

    //bs.cleanup();

    console.log(bs.options.get('urls').toJS());
});
