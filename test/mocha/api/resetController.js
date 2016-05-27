const browserSync = require('../../../');
const utils = require('../utils');
const register = require('../../../dist/plugins/clients').ClientEvents.register;

describe('Setting the controller back to auto-detection mode', function () {
    it('can allow the controller to be reset manually after being set manually', function (done) {
        browserSync.create({}).subscribe(function (bs) {
            const client1  = utils.getClientSocket(bs);
            const client2 = utils.getClientSocket(bs);

            client1.emit(register, utils.getClient('1'));
            client2.emit(register, utils.getClient('2'));

            bs.registered$
                .take(2)
                .toArray()
                .subscribe(x => {

                    client2.on('scroll', function () {
                        // This will receive the first event
                        // then we call reset to allow controllers to
                        // be set automatically again
                        bs.resetController();
                        
                        // Now emitting from the second client
                        // should work (due the reset above);
                        client2.emit('scroll', utils.getScrollEvent());
                    });

                    client1.on('scroll', function () {
                        // If we ever get here, the process was successful
                        bs.cleanup(done);
                    });

                    client1.emit('scroll', utils.getScrollEvent());
                });
        });
    });
});
