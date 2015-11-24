const browserSync = require('../../../');
const files       = require('../../../lib/files');
const utils       = require('../utils');
const conf        = require('../../../lib/config');
const assert      = require('chai').assert;
const Rx          = require('rx');
const Observable  = Rx.Observable;

describe('Client options', function () {
    it('creates a new client with default options', function (done) {
        browserSync.create({}, function (err, bs) {
            const client = utils.getClientSocket(bs);
            client.emit(conf.events.CLIENT_REGISTER, utils.getClient('123456'));
            bs.clients$.take(2).toArray()
                .subscribe(clients => {
                    const path1 = ['123456', 'options', 'reloadOnRestart'];
                    assert.equal(clients[1].getIn(path1), false);
                    bs.cleanup();
                    done();
                });
        });
    });
    it('creates a new client with default options, then a second with updated', function (done) {
        browserSync.create({}, function (err, bs) {

            const client = utils.getClientSocket(bs);
            client.emit(conf.events.CLIENT_REGISTER, utils.getClient('123456'));

            bs.clients$.take(3).toArray()
                .subscribe(clients => {
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
                .flatMap(() => bs.setDefaultClientOption('reloadOnRestart', x => 'shane'))
                // add a second client, after updating default options
                .do(x => client.emit(conf.events.CLIENT_REGISTER, utils.getClient('654321')))
                .subscribe();
        });
    });
    it('sets a single option on a client', function (done) {
        browserSync.create({}, function (err, bs) {

            const client = utils.getClientSocket(bs);
            client.emit(conf.events.CLIENT_REGISTER, utils.getClient('123456'));

            bs.clients$.take(3).toArray()
                .subscribe(clients => {
                    const path1 = ['123456', 'options', 'reloadOnRestart'];
                    assert.equal(clients[1].getIn(path1), false); // default
                    assert.equal(clients[2].getIn(path1), 'shane');
                    bs.cleanup();
                    done();
                });

            bs.registered$.take(1).flatMap(x => {
                return Observable.concat([
                    bs.setClientOption('123456', 'reloadOnRestart', x => 'shane')
                ])
            }).subscribe();
        });
    });
    it('overrides a previously set client option with an override', function (done) {
        browserSync.create({}, function (err, bs) {

            const client = utils.getClientSocket(bs);
            client.emit(conf.events.CLIENT_REGISTER, utils.getClient('123456'));

            bs.clients$.take(4).toArray()
                .subscribe(clients => {
                    const path = ['123456', 'options', 'notify'];
                    assert.equal(clients[1].getIn(path), true);
                    assert.equal(clients[2].getIn(path), 'shane');
                    assert.equal(clients[3].getIn(path), 'kittie');
                    bs.cleanup();
                    done();
                });

            bs.registered$.take(1).flatMap(x => {
                return Observable.concat([
                    bs.setClientOption('123456', ['notify'], x => 'shane'),
                    bs.overrideClientOptions(['notify'], x => 'kittie')
                ])
            }).subscribe();
        });
    });
});
