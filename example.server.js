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
            function kill(req, res, next) {
                next();
            },
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
            {
                module: {
                    initAsync: function (bs, opts, done) {
                        bs.plugin('option:rewriteRules', function (rules, options) {
                            return rules.concat({
                                id: 'pluginrr-01',
                                match: '<body>',
                                replace: '<body class="here">'
                            });
                        });
                        bs.plugin('option:middleware', function (mw, options) {
                            return mw.concat({
                                id: 'pl-mwq1',
                                route: '',
                                handle: function (req, res, next) {
                                    res.end(req.url);
                                }
                            });
                        });
                        setTimeout(() => {
                            bs.plugin('files:watcher', 'core', function (stream) {
                                console.log('getting a core stream');
                                stream
                                    .filter(x => x.event !== 'add')
                                    .subscribe(x => console.log('CORE but from plugin', x));
                            });
                        }, 2000)

                        done();
                    },
                    hooks: {
                        'client:js': 'var name = "kittie"'
                    },
                    "plugin:name": "Shane's plugin"
                },
                options: {
                    files: [{
                        match: ['*.js', '*.json'],
                        options: {
                            ignoreInitial: true
                        }
                    }]

                }
            },
            {
                module: {
                    initAsync: function (bs, opts, done) {
                        bs.options.get('rewriteRules');
                        done();
                    },
                    hooks: {
                        'client:js': 'var name = "kittie from second plugin"'
                    }
                },
            }
        ]
    }, function (err, out) {
        //console.log(out.options.get('files').toJS());
        //console.log(out.options.toJS());
        //console.log(out.options.getIn(['files']).get('My Awesome Plugin').toJS());
        //console.log(out.options.get('urls').toJS());
        //console.log(out.options.get('snippet'));
        //console.log(out.options.get('scriptPaths'));
    });