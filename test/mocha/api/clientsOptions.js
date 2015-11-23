const browserSync = require('../../../');
const files       = require('../../../lib/files');
const utils       = require('../utils');
const conf        = require('../../../lib/config');
const assert      = require('chai').assert;
const Rx          = require('rx');
const Observable  = Rx.Observable;

describe('Client options', function () {
    it('adds the default options to new clients', function (done) {
        browserSync.create({}, function (err, bs) {
            const client = utils.getClientSocket(bs);
            client.emit(conf.events.CLIENT_REGISTER, utils.getClient('123456'));
            bs.clients$.skip(1)
                .take(1)
                .toArray()
                .subscribe(function (clients) {
                    const first = clients[0].get('123456').toJS();
                    assert.equal(first.options.reloadOnRestart, false);
                    bs.cleanup();
                    done();
                }, err => done(err));
        });
    });
    it('updates a single clients options', function (done) {
        browserSync.create({}, function (err, bs) {
            const client = utils.getClientSocket(bs);

            client.emit(conf.events.CLIENT_REGISTER, utils.getClient('123456'));

            bs.clients$.skip(1).take(1).subscribe(function (client) {
            	assert.equal(
                    client.getIn(['123456', 'options', 'reloadOnRestart']),
                    false
                );
                listen();
            });

            function listen() {
                bs.clients$
                    .skip(1)
                    .take(1)
                    .subscribe(function (clients) {
                        assert.equal(
                            clients.getIn(['123456', 'options', 'reloadOnRestart']),
                            true
                        );
                        bs.cleanup();
                        done();
                    });

                bs.setClientOption('123456', ['reloadOnRestart'], (value) => {
                    return !value;
                });
            }
        });
    });
    it('updates the default client options so that new connections get the updated value', function (done) {
        browserSync.create({}, function (err, bs) {
            bs.setDefaultClientOption(['reloadOnRestart'], () => {
                return true;
            }).subscribe(x => {
                assert.equal(x.getIn(['clientOptions', 'reloadOnRestart']), true);
                connect();
            });

            function connect () {

                const client = utils.getClientSocket(bs);

                client.emit(conf.events.CLIENT_REGISTER, utils.getClient('123456'));

                bs.clients$.skip(1).take(1).subscribe(function (client) {
                    assert.equal(
                        client.getIn(['123456', 'options', 'reloadOnRestart']),
                        true
                    );
                    done();
                }, err => done(err));
            }
        });
    });
    it.only('overrides a previously set client option with an override', function (done) {
        browserSync.create({}, function (err, bs) {

            const client = utils.getClientSocket(bs);
            client.emit(conf.events.CLIENT_REGISTER, utils.getClient('123456'));

            bs.clients$.take(4).toArray()
                .subscribe(clients => {
                    var path = ['123456', 'options', 'notify'];
                    assert.equal(clients[1].getIn(path), true);
                    assert.equal(clients[2].getIn(path), 'shane');
                    assert.equal(clients[3].getIn(path), 'kittie');
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
