var fs = require('fs');
var config = require('./config');
var path = require('path');
var files = require('./files');
var middleware = require('./middleware');
var connect = require('connect');
var http = require('http');


module.exports.create = function (options) {

    var app = connect();
    var mw = middleware.getMiddleware(options);

    mw.middleware.forEach((mw)  => {
        if (mw.path.length) {
            return app.use(mw.path, mw.fn);
        }
        app.use(mw.fn);
    });

    var server = http.createServer(app);

    return {
        server: server,
        app: app,
        clientJs: mw.clientScript.clientJs,
        snippetMw: mw.snippetMw
    };
};


