var fs = require('fs');
var config = require('./config');
var path = require('path');
var files = require('./files');
var connectUtils = require('./connect-utils');
var bsClient = require('browser-sync-client');
var connect = require('connect');
var http = require('http');
var snippet = require('./snippet');
var respMod = require('resp-modifier');
var serveStatic = require('serve-static');

module.exports.create = function (options) {

    var app = connect();

    var clientScript = serveClientScript(options);
    var snippetMw = respMod.create(snippet.rules(options));

    var coreMws = [
        {
            id: 'bs-client',
            path: '/browser-sync/browser-sync-client.js',
            fn: clientScript.fn
        },
        {
            id: 'bs-client-versioned',
            path: '/browser-sync/browser-sync-client.%s.js'.replace('%s', options.get('version')),
            fn: clientScript.fn
        },
        {
            path: '',
            id: 'bs-rewrite-rules',
            fn: snippetMw.middleware
        }
    ].concat(options.get('middleware').toJS())
        .concat(serveStaticMw(options))
        .forEach(function (mw) {
            if (mw.path.length) {
                return app.use(mw.path, mw.fn);
            }
            app.use(mw.fn);
        });


    var server = http.createServer(app);

    return {
        server: server,
        app: app,
        clientJs: clientScript.clientJs,
        snippetMw: snippetMw
    };
};

function serveClientScript (options) {

    var clientJS = [
        {
            id: 'bs-no-conflict',
            content: 'window.___browserSync___oldSocketIo = window.io;'
        },
        {
            id: 'bs-socket-io',
            content: fs.readFileSync(path.join(__dirname, config.socketIoScript), "utf-8")
        },
        {
            id: 'bs-socket-connector',
            content: connectUtils.socketConnector(options)
        },
        {
            id: 'bs-client',
            content: bsClient.minified()
        }
    ].concat(options.get('clientJs').toJS());

    var output = {
        clientJs: clientJS,
        fn: function (req, res) {
            res.setHeader("Content-Type", "text/javascript");
            res.end(clientJS.map(function (item) {
                return item.content;
            }).join(';'));
        }
    };

    return output;
}

function serveStaticMw (options) {
    return options
        .getIn(['server', 'baseDir'])
        .toJS()
        .map(function (item, i) {
            return {
                path:'',
                fn: serveStatic('./test/fixtures'),
                id: 'bs-serveStatic-' + i
            }
        })
}
