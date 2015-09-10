var bs = require('./')
    .create({
        version: "2.8.2",
        serveStatic: [
            {
                root: ['lib', 'test'],
                options: {
                    extensions: ['js']
                }
            }
        ],
        middleware: [
            function kill(req, res, next) {
                console.log(req.url);
                next();
            },
            {
                path: "wew",
                id: 'shane',
                fn: function (req, res, next) {
                    next();
                }
            }
        ],
        watchOptions: {
            delay: 'oh yeah'
        },
        files: [
            "test/fixtures/*.html",
            {
                match: "*.js",
                fn: function (event, file) {
                    //console.log('JS files changed');
                    //console.log('JS files changed event', event);
                    //console.log('JS files changed file ', file);
                }
            }
        ],
        plugins: [
            {
                module: {},
                options: {
                    files: ["test/fixtures/css/*.css"]
                }
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