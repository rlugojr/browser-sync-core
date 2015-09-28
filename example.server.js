var fs = require('fs');
var bs = require('./')
    .create({
        version: "2.8.2",
        serveStatic: ['test/fixtures'],
        //rewriteRules: [
        //    {
        //        match: '<head>',
        //        replace: '<head id="yep yep">',
        //    }
        //],
        minify: false,
        port: 3000,
        online: true,
        reloadOnRestart: true,
        clientJs: [
            //{
            //    //content: fs.readFileSync('./client.js', 'utf8')
            //}
        ],
        middleware: [
            //function kill(req, res, next) {
            //    next();
            //},
            {
                route: "/wew",
                id: 'shane',
                handle: function handlePath (req, res, next) {
                    res.end('you wish');
                    //next();
                }
            }
        ],
        watchOptions: {
            delay: 'oh yeah'
        },
        files: [
            "test/fixtures/*.html",
            {
                match: 'test/fixtures/**/*.css',
                locator: /styles(.+?)?\.css$/
            }
        ],
        externals: {
            clientJs: '/Users/shaneobsourne/sites/browser-sync-client'
        },
        plugins: [
            //'/Users/shaneobsourne/sites/browser-sync-client',
            //'/Users/shakyshane/Sites/browser-sync-modules/browser-sync-cp',
            //'/Users/shaneobsourne/code/browser-sync-core/node_modules/browser-sync-client',
            '/Users/shaneobsourne/code/UI',
            {
                module: './test/fixtures/plugin1.js'
            },
            {
                module: {
                    initAsync: function (bs, opts, cb) {

                        //bs.setOption('middleware', function (mw) {
                        //    return mw.concat({
                        //        path: '',
                        //        handle: function (req, res, next) {
                        //            console.log(req.url);
                        //            next();
                        //        },
                        //        id: 'my-undiq'
                        //    });
                        //}).subscribe();

                        bs.setOption('rewriteRules', function (rr) {
                            return rr.concat({
                                match: '<head>',
                                replace: "<head><meta />"
                            });
                        }).subscribe();

                        //bs.getWatcher('My New Plugin')
                        //    .filter(x => x.event !== 'add' && x.event !== 'addDir')
                        //    .do(x => console.log(x))
                        //    .subscribe();

                        cb();
                    },
                    "browser-sync:ui": true,
                    "plugin:name": 'My New Plugin',
                    hooks: {
                        "option:clientJs": "console.log('From plugin!')"
                    }
                },
                options: {
                    files: [
                        '*.yml',
                    ]
                }
            }
            //{
            //    module: {
            //        initAsync: function (bs, opts, done) {
            //            bs.plugin('option:rewriteRules', function (rules, options) {
            //                return rules.concat({
            //                    id: 'pluginrr-01',
            //                    match: '<body>',
            //                    replace: '<body class="here">'
            //                });
            //            });
            //            //bs.plugin('option:strict', function (strict, options) {
            //            //    return !strict;
            //            //});
            //            //bs.plugin('option:ghostMode.forms', function (opt) {
            //            //    return false;
            //            //});
            //            //bs.plugin('option:middleware', function (mw, options) {
            //            //    return mw.concat({
            //            //        id: 'pl-mwq1',
            //            //        route: '',
            //            //        handle: function (req, res, next) {
            //            //            res.end(req.url);
            //            //        }
            //            //    });
            //            //});
            //            setTimeout(() => {
            //                bs.plugin('files:watcher', 'Shane\'s plugin', function (stream) {
            //                    stream.subscribe(x => console.log('CORE but from plugin', x.file));
            //                });
            //            }, 2000);
            //
            //            done();
            //        },
            //        hooks: {
            //            'client:js': 'var name = "kittie"'
            //        },
            //        "plugin:name": "Shane's plugin"
            //    },
            //    options: {
            //        files: [{
            //            match: ['*.js', '*.json'],
            //            options: {
            //                ignoreInitial: true
            //            }
            //        }]
            //
            //    }
            //},
            //{
            //    module: {
            //        initAsync: function (bs, opts, done) {
            //            bs.options.get('rewriteRules');
            //            done();
            //        },
            //        hooks: {
            //            'client:js': 'var name = "kittie from second plugin"'
            //        }
            //    },
            //}
        ]
    }, function (err, out) {
        var plu = out.options.get('serveStatic').toJS();
        console.log(plu);
        //console.log(plu);
        //var mpath = plu['module']['browser-sync:ui']['hooks']['markup'];
        //var path = require('path');
        //
        //console.log(plu.dir);
        //
        //console.log(out.options.get('files').toJS());
        //console.log(out.options.toJS());
        //console.log(out.options.getIn(['files']).get('My Awesome Plugin').toJS());
        //console.log(out.options.get('urls').toJS());
        //console.log(out.options.get('snippet'));
        //console.log(out.options.get('scriptPaths'));
    });