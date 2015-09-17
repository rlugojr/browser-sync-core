module.exports = {
    initAsync: function (bs, opts, done) {
        done();
    },
    'plugin:name': 'Plugin1',
    'browser-sync:ui': {
        "hooks": {
            "markup": "./index.html",
            "templates": [
                "./ui/template1.html"
            ],
            "client:js": [
                "./plugin1.js"
            ]
        }
    }
};