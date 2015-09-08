var bs = require('./')
    .create({
        version: "2.8.2",
        server: 'test/fixtures',
        watchOptions: {
            delay: 'oh yeah'
        },
        files: [
            "test/fixtures/*.html",
            "*.css",
            {
                match: "*.txt",
                fn: function () {

                }
            }
        ],
        plugins: [
            {
                module: {},
                options: {
                    files: ["*.jade", {match: "*.css", options: {name: "shane"}}]
                }
            }
        ]
    }, function (err, out) {
        //console.log(out.options.toJS());
        //console.log(out.options.getIn(['files']).get('My Awesome Plugin').toJS());
        //console.log(out.options.get('urls').toJS());
        //console.log(out.options.get('snippet'));
        //console.log(out.options.get('scriptPaths'));
    });