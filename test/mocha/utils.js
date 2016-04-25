const utils = exports;
const opts = require('../../dist/incoming-options');
const transform = require('../../dist/transform-options');
const socket = require('socket.io-client');
const bs = require('../../');
const connect = require('connect');
const http = require('http');
const assert = require('chai').assert;
var request = require('supertest');

var uniq = 0;

utils.optmerge = function (input) {
    return opts.merge(input);
};

utils.getClientSocket = function (bs) {
    const opts = bs.options.toJS();
    const connectionUrl = opts.urls.local + opts.socket.namespace;
    return socket(connectionUrl, {
        path: opts.socket.socketIoOptions.path,
        forceNew: true
    });
};

utils.getClient = function (id, data) {
    return {
        client: {
            id: id || String(uniq += 1)
        },
        data: data || {}
    };
};

utils.proxye2e = (resp, done) => {
    var app = connect();
    var server = http.createServer(app);
    server.listen();
    var add = server.address();
    var url = `http://localhost:${add.port}`;
    var respIn = utils[resp](url);

    app.use('/', function (req, res) {
        res.end(respIn);
    });

    bs.create({
        proxy: url
    }).subscribe(function (bs) {
        var bsUrl = bs.options.getIn(['urls', 'local']);
        var bsPort = bs.options.getIn(['port']);
        var snippet = bs.options.get('snippet');
        request(bsUrl)
            .get('/')
            .set('Accept', 'text/html')
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    bs.cleanup(function () {
                        server.close();
                        return done(err);
                    });
                }
                assert.equal(res.text, utils[resp](`//localhost:${bsPort}`) + snippet);
                bs.cleanup(function () {
                    server.close();
                    done();
                });
            });
    });
};

utils.resp1 = (host) =>
    `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Document</title>
    <link rel="stylesheet" href="${host}/css/core.css">
</head>
<body>

</body>
</html>`;
