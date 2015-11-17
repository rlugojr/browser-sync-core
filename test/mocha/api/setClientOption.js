'use strict';

const browserSync = require('../../../');
const files       = require('../../../lib/files');
const utils       = require('../utils');
const assert      = require('chai').assert;

const client1     = {client: {id: '123456'}, data: {}};

describe('Client Connections', function () {
    it('does not duplicate clients when ID matches', function (done) {
        browserSync.create({}, function (err, bs) {
            const client = utils.getClient(bs);
            bs.io.sockets.on('connection', function () {
                client.emit('Client.register', client1);
                client.emit('Client.register', client1);
            });
            const sub = bs.clients$
                .skip(1)
                .take(2)
                .toArray()
                .subscribe(function (val) {
                    assert.equal(val[0].size, 1);
                    assert.equal(val[1].size, 1);
                    sub.dispose();
                    bs.cleanup();
                    done();
                }, err => done(err));
        });
    });
});
