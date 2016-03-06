const Rx            = require('rx');
const Observable    = Rx.Observable;
const TestScheduler = Rx.TestScheduler;
const onNext        = Rx.ReactiveTest.onNext;
const onCompleted   = Rx.ReactiveTest.onCompleted;
const just          = Observable.just;
const empty         = Observable.empty;
const scheduler     = new TestScheduler();
const assert        = require('assert');

const blank = {locked: false, id: '', socket: ''};

const controller    = new Rx.BehaviorSubject(blank);

var xs = scheduler.createHotObservable(
    onNext(150,  {locked: false, id: '01', socket: 'a'}),
    onNext(210,  {locked: false, id: '01', socket: 'a'}),
    onNext(230,  {locked: false, id: '01', socket: 'a'}),

    onNext(260,  {locked: false, id: '02', socket: 'b'}),
    onNext(300,  {locked: false, id: '02', socket: 'b'}),
    onNext(350,  {locked: false, id: '02', socket: 'b'}),
    onNext(351,  {locked: false, id: '02', socket: 'b'}),
    onNext(352,  {locked: false, id: '02', socket: 'b'}),

    onNext(2010, {locked: false, id: '03', socket: 'c'})
);

function track(incoming, controller, sheduler) {
    return incoming
        .withLatestFrom(controller)
        .flatMap(x => {
            const inc        = x[0];
            const controller = x[1];

            if (controller.id === '') {
                return just(inc);
            }

            if (inc.id !== controller.id) {
                return empty();
            }

            return just(inc);
        })
        .distinctUntilChanged();
}

var results = scheduler.startScheduler(function () {

    const inc = track(xs, controller, scheduler);

    Observable
        .interval(2000, scheduler || null).take(100)
        .map(x => blank)
        .subscribe(controller);

    inc.subscribe(controller);

    return controller

}, {created: 0, subscribed: 0, disposed: 2020});

assert.deepEqual(results.messages[0], onNext(1, {locked: false, id: '', socket: ''}));
assert.deepEqual(results.messages[1], onNext(150, {locked: false, id: '01', socket: 'a'}));
assert.deepEqual(results.messages[2], onNext(2001, {locked: false, id: '', socket: ''}));
assert.deepEqual(results.messages[3], onNext(2010, {locked: false, id: '03', socket: 'c'}));

//assert.deepEqual(results.messages[0])
//console.log(results.messages);
//assert.equal(results.messages.length, 4, 'Should only have messages from matching controller');
//console.log(JSON.stringify(results.messages, null, 4));
//console.log(results.messages.map(x => x.value.value));
//assert.equal()