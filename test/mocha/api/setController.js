const browserSync = require('../../../');
const utils = require('../utils');
const register = require('../../../dist/plugins/clients').ClientEvents.register;
const Rx = require('rx');

describe('Setting the controller automatically via first emitted event', function () {
    it('Allows an event from one client to be broadcast to others', function (done) {
        browserSync.create({}).subscribe(function (bs) {
            const client  = utils.getClientSocket(bs);
            const client2 = utils.getClientSocket(bs);

            client.emit(register, utils.getClient('123456'));
            client2.emit(register, utils.getClient('654321'));

            client2.on('scroll', function () {
                bs.cleanup(done);
            });

            client.on('scroll', function () {
                done(); // this should never get called
            });

            client.emit('scroll', utils.getScrollEvent());
            client2.emit('scroll', utils.getScrollEvent());
        });
    });
    it('can set the controller manually', function (done) {
        browserSync.create({}).subscribe(function (bs) {
            const client1  = utils.getClientSocket(bs);
            const client2 = utils.getClientSocket(bs);

            client1.emit(register, utils.getClient('1'));
            client2.emit(register, utils.getClient('2'));


            // this will set the controller as it will be the first event

            bs.registered$
                .take(2)
                .toArray()
                .subscribe(x => {

                    client1.on('scroll', function () {
                        bs.cleanup(done);
                    });
                    
                    client1.emit('scroll', utils.getScrollEvent());
                    
                    bs.setController('2');

                    client2.emit('scroll', utils.getScrollEvent());
                });
        });
    });
});
