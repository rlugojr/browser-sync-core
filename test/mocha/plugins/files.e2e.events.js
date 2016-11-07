const assert = require('chai').assert;
const bs = require('../../../');
const Im = require('immutable');
const Rx = require('rx');
const watcher = require('../../../dist/plugins/watch');

describe('Reacting to file io', function () {
    it.only('reacts to events', function (done) {
        const scheduler = new Rx.TestScheduler();
        const onNext = Rx.ReactiveTest.onNext;

        const observable = scheduler.createHotObservable(
            onNext(200, {event: 'change', path: 'kittie.html'})
        );
        const myPlugin = scheduler.createHotObservable(
            onNext(200, {event: 'change', path: 'package1.json'}),
            onNext(201, {event: 'change', path: 'package2.json'})
        );

        bs.create({
            watch: [
                {
                    match: 'test/whatevers'
                }
            ],
            online: false,
            plugins: [
                {
                    module: {
                        'plugin:name': 'my-plugin'
                    },
                    options: {watch: '*.json'},
                }
            ],
            debug: {
                scheduler: scheduler,
                watch: {
                    fileIoObservables: {
                        core: observable,
                        'my-plugin': myPlugin
                    }
                }
            }
        }).subscribe(function (bs) {

            const out = scheduler.startScheduler(function () {
                return bs.coreWatchers$
            }, {created: 0, subscribed: 0, disposed: 40000});
            // console.log(out.messages);
            // bs.cleanup(function () {
                console.log('done');
                // done();
            // });
        });
    });
});
