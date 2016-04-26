const browserSync = require('../../../');
const utils = require('../utils');
const register = require('../../../dist/plugins/clients').ClientEvents.register;
const assert = require('chai').assert;
const Rx = require('rx');
const Observable = Rx.Observable;

describe('Client options', function () {
    it('creates a new client with default options', function (done) {
        browserSync.create({}).subscribe(function (bs) {
            const client = utils.getClientSocket(bs);
            client.emit(register, utils.getClient('123456'));
            bs.clients$.take(2).toArray()
                .subscribe(function (clients) {
                    const path1 = ['123456', 'options', 'reloadOnRestart'];
                    assert.equal(clients[1].getIn(path1), false);
                    bs.cleanup();
                    done();
                });
        });
    });
    it('creates a new client with default options, then a second with updated', function (done) {
        browserSync.create({}).subscribe(function (bs) {

            const client = utils.getClientSocket(bs);
            client.emit(register, utils.getClient('123456'));

            bs.clients$.take(3).toArray()
                .subscribe(function (clients) {
                    assert.equal(clients[1].size, 1);
                    assert.equal(clients[2].size, 2);
                    assert.equal(clients[2].getIn(['123456', 'id']), '123456');
                    assert.equal(clients[2].getIn(['654321', 'id']), '654321');
                    assert.equal(clients[2].getIn(['123456', 'options', 'reloadOnRestart']), false); // default
                    assert.equal(clients[2].getIn(['654321', 'options', 'reloadOnRestart']), 'shane');
                    bs.cleanup();
                    done();
                });

            bs.registered$.take(1)
                .flatMap(function () {
                    return bs.setDefaultClientOption('reloadOnRestart', function () {
                        return 'shane';
                    });
                })
                // add a second client, after updating default options
                .do(function (x) {
                    client.emit(register, utils.getClient('654321'))
                })
                .subscribe();
        });
    });
    it('sets a single option on a client', function (done) {
        browserSync.create({}).subscribe(function (bs) {

            const client = utils.getClientSocket(bs);
            client.emit(register, utils.getClient('123456'));

            bs.clients$.take(3).toArray()
                .subscribe(function (clients) {
                    const path1 = ['123456', 'options', 'reloadOnRestart'];
                    assert.equal(clients[1].getIn(path1), false); // default
                    assert.equal(clients[2].getIn(path1), 'shane');
                    bs.cleanup();
                    done();
                });

            bs.registered$.take(1).flatMap(function () {
                return Observable.concat([
                    bs.setClientOption('123456', 'reloadOnRestart', function () {
                        return 'shane'
                    })
                ])
            }).subscribe();
        });
    });
    it('overrides a previously set client option with an override', function (done) {
        browserSync.create({}).subscribe(function (bs) {

            const client = utils.getClientSocket(bs);
            client.emit(register, utils.getClient('123456'));

            bs.clients$.take(4).toArray()
                .subscribe(function (clients) {
                    const path = ['123456', 'options', 'notify'];
                    assert.equal(clients[1].getIn(path), true);
                    assert.equal(clients[2].getIn(path), 'shane');
                    assert.equal(clients[3].getIn(path), 'kittie');
                    bs.cleanup();
                    done();
                });

            bs.registered$.take(1).flatMap(function (x) {
                return Observable.concat([
                    bs.setClientOption('123456', ['notify'], function () {
                        return 'shane'
                    }),
                    bs.overrideClientOptions(['notify'], function () {
                        return 'kittie'
                    })
                ])
            }).subscribe();
        });
    });
});
