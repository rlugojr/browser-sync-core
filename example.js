var bs = require('./')
    .create({
        version: "2.8.2",
        port: 4000,
        files: "*.html",
        plugins: [
            "./test/fixtures/plugin1",
            {
                module: {
                    init: function (bs, opts, done) {
                        setTimeout(function () {
                            console.log('Setup!');
                            done();
                        }, 1000);
                    },
                    "plugin:name": "My Awesome Plugin",
                    "ui": true
                },
                options: {
                    name: "shane",
                    files: [
                        {
                            match: "../../css",
                            fn: function (event, file) {

                            },
                            options: {
                                ignoreInitial: true
                            }
                        }
                    ]
                }
            },
            {
                module: "connect",
                options: {
                    name: "kittie",
                    files: ['*.css', '*.html']
                }
            }
        ]
    }, function (err, out) {
        //console.log(out.options.getIn(['files']).get('My Awesome Plugin').toJS());
        //console.log(out.options.get('urls').toJS());
        //console.log(out.options.get('snippet'));
        //console.log(out.options.get('scriptPaths'));
    });