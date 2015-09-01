var bs = require('./')
    .create({
        port: 4000,
        plugins: [
            "test/fixtures/plugin1.js",
            {
                module: {
                    init: function (bs, opts, done) {
                        setTimeout(function () {
                            console.log('Setup!');
                            done();
                        }, 1000);
                    },
                    "plugin:name": "My Awesome Plugin"
                },
                options: {
                    name: "shane"
                }
            }
        ]
    }, function (err, out) {
        console.log(out.options.get('plugins').toJS());
    });