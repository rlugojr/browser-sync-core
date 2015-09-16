var bs = require('./')
    .create({
        version: "2.8.2",
        server: ['test/fixtures'],
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
                //console.log(req.url);
                next();
            },
            {
                route: "wew",
                id: 'shane',
                handle: function (req, res, next) {
                    next();
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
                        //bs.plugin('client:js', function (clientJs, options) {
                        //    return clientJs.concat({content: 'var shane="Amaze"'});
                        //});
                        done();
                    },
                    hooks: {
                        'client:js': 'var name = "kittie"'
                    }
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
                        setTimeout(x => {
                            bs.plugin('client:js', function (clientJs, options) {
                                return clientJs.concat('console.log("HERE DUDE I\'M RUNNING");');
                            });
                        }, 3000);
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