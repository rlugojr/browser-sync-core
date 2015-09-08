var bs = require('./')
    .create({
        version: "2.8.2",
        server: 'test/fixtures',
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