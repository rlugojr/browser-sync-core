var bs = require('./')
    .create({
        version: "2.8.2",
        server: ['test/fixtures'],
        rewriteRules: [
            {
                match: '<head>',
                replace: '<head id="yep yep">',
            }
        ],
        serveStatic: [
            {
                root: ['lib', 'test'],
                options: {
                    extensions: ['js']
                }
            }
        ],
        clientJs: [
            {
                content: 'console.log("Aww yis")'
            },
            {
                content: 'console.log("Aww No!")'
            }
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
            "test/fixtures/css/*.css",
            {
                match: "*.yml",
                fn: function (event, file) {
                    console.log(event, file);
                    //console.log('JS files changed');
                    //console.log('JS files changed event', event);
                    //console.log('JS files changed file ', file);

                }
            }
        ],
        plugins: [
            '/Users/shakyshane/Sites/browser-sync-modules/browser-sync-cp',
            {
                module: './test/fixtures/plugin1.js'
            },
            {
                module: {
                    initAsync: function (bs, opts, cb) {
                        cb();
                    },
                    "plugin:name": "Shane",
                    "browser-sync:ui": true,
                    hooks: {
                        "option:clientJs": "console.log('From plugin!')"
                    }
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
        //var plu = out.options.get('plugins').toJS();
        //console.log(plu);
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