const browserSync = require('../../../');
const utils       = require('../utils');
const register    = require('../../../dist/plugins/clients').ClientEvents.register;
const assert      = require('chai').assert;

describe('Client connection stream', function () {
    it('does not have duplicates', function (done) {
        browserSync.create({}).subscribe(function (bs) {
            const client = utils.getClientSocket(bs);
            client.emit(register, utils.getClient('123456'));
            client.emit(register, utils.getClient('123456'));
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
                }, function (err) {done(err)});
        });
    });
    it('allows unique clients', function (done) {
        browserSync.create({}).subscribe(function (bs) {
            const client = utils.getClientSocket(bs);
            client.emit(register, utils.getClient('xyz'));
            client.emit(register, utils.getClient('zxy'));
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
                }, function(err) { done(err) });
        });
    });
    it('allows unique clients (stress)', function (done) {
        browserSync.create({}).subscribe(function (bs) {
            for (var i = 1, n = 51; i < n; i += 1) {
                utils.getClientSocket(bs).emit(register, utils.getClient('id-' + i));
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
                }, function(err) { done(err) });
        });
    });
});
