const browserSync = require('../../../');
const utils       = require('../utils');
const conf        = require('../../../dist/config');
const assert      = require('chai').assert;

describe('Client connection stream', function () {
    it('does not have duplicates', function (done) {
        browserSync.create({}, function (err, bs) {
            const client = utils.getClientSocket(bs);
            client.emit(conf.events.CLIENT_REGISTER, utils.getClient('123456'));
            client.emit(conf.events.CLIENT_REGISTER, utils.getClient('123456'));
            bs.clients$.skip(1)
                .take(2)
                .toArray()
                .subscribe(function (clients) {
                    assert.equal(clients[0].size, 1);
                    assert.equal(clients[1].size, 1);
                    const jsClients1 = clients[0].toList().toJS();
                    const jsClients2 = clients[1].toList().toJS();
                    assert.equal(jsClients1[0].id, '123456');
                    assert.equal(jsClients2[0].id, '123456');
                    bs.cleanup();
                    done();
                }, err => done(err));
        });
    });
    it('allows unique clients', function (done) {
        browserSync.create({}, function (err, bs) {
            const client = utils.getClientSocket(bs);
            client.emit(conf.events.CLIENT_REGISTER, utils.getClient('xyz'));
            client.emit(conf.events.CLIENT_REGISTER, utils.getClient('zxy'));
            bs.clients$.skip(1)
                .take(2)
                .toArray()
                .subscribe(function (clients) {
                    assert.equal(clients[0].size, 1);
                    assert.equal(clients[1].size, 2);
                    const jsClients1 = clients[0].toList().toJS();
                    const jsClients2 = clients[1].toList().toJS();
                    assert.equal(jsClients1[0].id, 'xyz');
                    assert.equal(jsClients2[0].id, 'xyz');
                    assert.equal(jsClients2[1].id, 'zxy');
                    bs.cleanup();
                    done();
                }, err => done(err));
        });
    });
    it('allows unique clients (stress)', function (done) {
        browserSync.create({}, function (err, bs) {
            for (var i = 1, n = 51; i < n; i += 1) {
                utils.getClientSocket(bs).emit(conf.events.CLIENT_REGISTER, utils.getClient('id-' + i));
            }
            bs.clients$.skip(1)
                .take(50)
                .toArray()
                .subscribe(function (clients) {
                    assert.equal(clients[49].size, 50);
                    assert.ok(clients[49].get('id-40'));
                    assert.equal(clients[49].get('id-40').get('id'), 'id-40');
                    bs.cleanup();
                    done();
                }, err => done(err));
        });
    });
});
