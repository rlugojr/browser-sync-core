const assert = require('chai').assert;
const bs = require('../../../');
const Im = require('immutable');
const Rx = require('rx');
const watcher = require('../../../dist/plugins/watch');

describe('Reacting to file io', function () {
    it.only('reacts to events', function (done) {
        const scheduler = new Rx.TestScheduler();
        const onNext = Rx.ReactiveTest.onNext;


        bs.create({
            watch: [
                {
                    match: 'test/whatevers'
                }
            ],
            online: false,
            debug: {
                scheduler: scheduler,
                watch: {

                }
            }
        }).subscribe(function (bs) {
            // const observable = scheduler.createColdObservable(
            //     onNext(200, {event: 'change', path: 'kittie.html'})
            // );
            const out = scheduler.startScheduler(function () {
                return Rx.Observable.just(true, scheduler);
            }, {created: 0, subscribed: 0, disposed: 40000});
            // const sub = bs.protocol$.subscribe(x => {
            //     console.log('protocol', x);
            //     sub.dispose();
            //     bs.cleanup(x => {
            //         done();
            //     });
            // });

        });
    });
});
