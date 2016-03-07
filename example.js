const Rx            = require('rx');
const Observable    = Rx.Observable;
const TestScheduler = Rx.TestScheduler;
const onNext        = Rx.ReactiveTest.onNext;
const just          = Observable.just;
const empty         = Observable.empty;
const scheduler     = new TestScheduler();
const assert        = require('assert');
const debug = require('debug')('example');
const blank         = {locked: false, id: '', socketId: ''};
const controller    = new Rx.BehaviorSubject(blank);

const clients$      = new Rx.BehaviorSubject([
    {
        id: '01',
        socketId: 'a'
    },
    {
        id: '02',
        socketId: 'b'
    },
    {
        id: '02',
        socketId: 'c'
    }
]);

function wrap (obj, id) {
    return {
        test: obj,
        result: Object.assign({}, obj, {id: id})
    }
};

var evt1 = wrap({event: 'scroll', data: {x: 0, y:0},   socketId: 'a'}, '01');
var evt2 = wrap({event: 'scroll', data: {x: 0, y:1},   socketId: 'a'}, '01');

var evt3 = wrap({event: 'scroll', data: {x: 0, y:200}, socketId: 'b'}, '02');

var evt4 = wrap({event: 'scroll', data: {x: 0, y:3},   socketId: 'a'}, '01');
var evt5 = wrap({event: 'scroll', data: {x: 0, y:4},   socketId: 'a'}, '01');

var evt6 = wrap({event: 'scroll', data: {x: 0, y:201}, socketId: 'b'}, '02');
var evt7 = wrap({event: 'scroll', data: {x: 0, y:202}, socketId: 'b'}, '02');

var evt8 = wrap({event: 'scroll', data: {x: 0, y:300}, socketId: 'a'}, '01');
var evt9 = wrap({event: 'scroll', data: {x: 0, y:0},   socketId: 'a'}, '01');

var evs = scheduler.createHotObservable(
    onNext(200,  evt1.test), // a ok
    onNext(201,  evt2.test), // a ok

    onNext(202,  evt3.test), // b skip

    onNext(203,  evt4.test), // a ok
    onNext(204,  evt5.test), // a ok

    onNext(2010, evt6.test), // b ok
    onNext(2011, evt7.test), // b ok

    onNext(2012, evt8.test), // a skip
    onNext(2020, evt8.test), // a skip
    onNext(2050, evt8.test), // a skip
    onNext(3090, evt8.test), // a skip
    onNext(4010, evt9.test)  // a ok
);

var validEvents = [
    onNext(200,  evt1.result), // a ok
    onNext(201,  evt2.result), // a ok
    onNext(203,  evt4.result), // a ok
    onNext(204,  evt5.result), // a ok
    onNext(2010, evt6.result), // b ok
    onNext(2011, evt7.result), // b ok
    onNext(4010, evt9.result)  // a ok
];

/**
 * Take a stream of incoming actionSync events + the current controller
 * and use the controller to determine if the current event is valid
 * (ie: it's from the same browser)
 */
function trackController (incoming, controller) {
    return incoming
        .withLatestFrom(controller)
        .flatMap(x => {

            const incomingEvent     = x[0];
            const currentController = x[1];

            /**
             * Controller has not been set, therefore we allow this event
             * through (as this will in turn cause the controller to be set)
             */
            if (currentController.id === '') {
                return just({locked: false, id: incomingEvent.id, socketId: incomingEvent.socketId});
            }

            /**
             * If the controller ID matches the incoming event ID
             * we return the controller, but re-set the socketId
             * as this could change (ie: every time the browser reloads)
             */
            if (currentController.id === incomingEvent.id) {
                return just(Object.assign(currentController, {socketId: incomingEvent.socketId}));
            }

            /**
             * If we reach here, the controller was set, but the
             * controller.id didn't match the incoming event.id. So we bail here
             * and don't pass any value through. This is how we essentially
             * ignore all events from any browser that is not currently deemed
             * the controller.
             */
            return empty();
        })
        .distinctUntilChanged();
}

var results = scheduler.startScheduler(function () {

    /**
     * Add Browsersync ID to incoming socket events
     */
    const evtStream$ = evs.withLatestFrom(clients$)
        .flatMap((obj) => {
            const evt     = obj[0];
            const clients = obj[1];
            var match     = clients.filter(x => x.socketId === evt.socketId);

            if (match.length) {
                return just(Object.assign(evt, {id: match[0].id}));
            }

            return empty();
        }).share();

    /**
     * Select the currently emitting socket and set it
     * as the controller
     */
    trackController(evtStream$, controller, scheduler)
        .do(controller)
        .subscribe();

    /**
     * Every 2 seconds, reset the controller
     */
    Observable
        .interval(2000, scheduler || null).take(100)
        .map(x => blank)
        .subscribe(controller);

    return evtStream$
        .withLatestFrom(controller)
        .flatMap(function (x) {
        	var evt  = x[0];
        	var ctrl = x[1];
            if (ctrl.id === '') {
                debug('✔  ALLOW EVENT, CONTROLLER NOT SET');
                debug('└─ ', evt);
                return just(evt);
            } else if (ctrl.id === evt.id) {
                debug('✔ ALLOW EVENT, CTRL ID === EVENT ID');
                debug('└─ ', evt);
                return just(evt);
            } else {
                debug('PROBS IGNORE EVENT id:', evt.id, 'CTRL id:', ctrl.id);
            }
            return empty();
        });

}, {created: 0, subscribed: 0, disposed: 5000});

assert.deepEqual(validEvents, results.messages);