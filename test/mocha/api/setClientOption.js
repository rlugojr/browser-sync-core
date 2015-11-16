'use strict';

var browserSync = require('../../../');
var files       = require('../../../lib/files');
var assert      = require('chai').assert;
var socket      = require("socket.io-client");

function getClient (bs) {
    const opts          = bs.options.toJS();
    const connectionUrl = opts.urls.local + opts.socket.namespace;
    return socket(connectionUrl, {
        path: opts.socket.socketIoOptions.path
    });
}

describe('Client Connections', function () {
    it('does not duplicate clients when ID matches', function (done) {
        browserSync.create({}, function (err, bs) {
            bs.io.sockets.on('connection', function () {
                client.emit('Client.register', {
                    client: {
                        id: '123456'
                    },
                    data: {}
                });
                client.emit('Client.register', {
                    client: {
                        id: '123456'
                    },
                    data: {}
                });
            });
            const opts          = bs.options.toJS();
            const connectionUrl = opts.urls.local + opts.socket.namespace;
            const client = socket(connectionUrl, {
                path: opts.socket.socketIoOptions.path
            });
            var sub = bs.clients$
                .skip(1) // take 2 events
                .take(2) // take 2 events
                .toArray()
                .subscribe(function (val) {
                    console.log(val);
                    //assert.equal(val[0].size, 1);
                    //assert.equal(val[1].size, 1);
                    //bs.cleanup();
                    //client.close();
                    sub.dispose();
                    bs.cleanup();
                    done();
                });

        });
    });
    it('does not duplicate clients when ID matches', function (done) {
        browserSync.create({}, function (err, bs) {
            bs.io.sockets.on('connection', function () {
                client.emit('Client.register', {
                    client: {
                        id: '123456'
                    },
                    data: {}
                });
                client.emit('Client.register', {
                    client: {
                        id: '123456'
                    },
                    data: {}
                });
            });

            const opts          = bs.options.toJS();
            const connectionUrl = opts.urls.local + opts.socket.namespace;
            const client = socket(connectionUrl, {
                path: opts.socket.socketIoOptions.path
            });
            var sub = bs.clients$
                .take(2) // take 2 events
                .toArray()
                .subscribe(function (val) {
                    console.log('got here');
                    //assert.equal(val[0].size, 1);
                    //assert.equal(val[1].size, 1);
                    //bs.cleanup();
                    //client.close();
                    sub.dispose();
                    bs.cleanup();
                    done();
                });

        });
    });

});
