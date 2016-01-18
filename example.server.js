var bs = require('./');

bs.create({
    strict: false,
    serveStatic: [
        'test/fixtures'
    ],
    middleware: [
        {
            handle: function (req, res, next) {

                next();
            }
        }
    ],
    files: [
        {
            match: 'test/fixtures/**/*.css'
        }
        //'test/fixtures/**/*.css',
        //{
        //{
        //    match: 'test/fixtures/*.html',
        //    fn: function (event, path, x) {
        //        console.log(event, path);
        //        this.reload();
        //    }
        //}
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
        //'./lib/plugins/404',
        './lib/plugins/watcher'
        //'/Users/shakyshane/sites/oss/UI'
    ],
    //middleware: [
    //    {
    //        route: '/js',
    //        handle: require('browserify-middleware')('test/fixtures/js/app.js')
    //    }
    //],
    //externals: {
        //clientJs: __dirname + '/client/'
        //clientJs: '/Users/shakyshane/code/bs-client' // laptop
        //clientJs: '/Users/shakyshane/sites/oss/browser-sync-client/' // home imac
    //}
    //minify: false
}, function (err, bs) {
    //console.log('err', err);
    if (err) {
        return;
    }

    setTimeout(function () {
        //bs.setOption(['files'], function (f) {
        //    return f.map(x => x.set('active', true));
        //}).subscribe(x => {
        //    console.log('updateing');
        //    console.log(x);
        //});
        bs.setOption('clientJs', function (js) {
            return js.concat({
                id: 'test',
                content: 'console.log("navigator" in location)'
            });
        }).subscribe();
    }, 1000);

    //bs.setOption('middleware', function (cli) {
    //    //console.log(cli[0]);
    //    return cli.concat(function (res, res, next) {
    //        console.log('cats');
    //        next();
    //    });
    //}).subscribe(x => {
    //    console.log(x.get('middleware'));
    //});

    //setTimeout(function () {
    //    bs.setOption('middleware', function (mw) {
    //        return mw.concat({id: 'shane', handle: function (req, res, next) {
    //            next();
    //        }});
    //    }).subscribe();
    //}, 2000);
    //
    //setTimeout(function () {
    //    bs.setOption('middleware', function (mw) {
    //        return mw.filter(x => x.id !== 'shane');
    //    }).subscribe();
    //}, 4000);

    //
    //setTimeout(function () {
    //    bs.setOption('clientJs', function (cli) {
    //        //console.log(cli[0]);
    //        return cli.filter(x => x.id !== 'shane');
    //    }).subscribe();
    //}, 10000);
    //bs.options$.subscribe(x => console.log('change'))
    //bs.cleanup();

    console.log(bs.options.get('urls').toJS());
});
