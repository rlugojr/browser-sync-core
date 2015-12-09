var bs = require('./');

bs.create({
    //serveStatic: ['test/fixtures'],
    files:       [
        //'test/fixtures/*.html',
        {
            match: [
                '/Users/shakyshane/jh/harp',
                '!/Users/shakyshane/jh/harp/.idea'
            ],
            fn: function (event, file, obj) {
                obj.ext      = 'css';
                obj.path     = obj.path.replace(/less$/, 'css');
                obj.basename = obj.basename.replace(/less$/, 'css');
                this.inject(obj);
            }
        }

    ],
    proxy: {
        target: 'http://localhost:9000/'
    },
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
    middleware: [
        {
            route: '/js',
            handle: require('browserify-middleware')('test/fixtures/js/app.js')
        }
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
