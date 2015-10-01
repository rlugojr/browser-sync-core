var Rx        = require('rx');
var sub       = new Rx.Subject();
var subStream = sub.publish().refCount().distinctUntilChanged();
var sub2      = new Rx.Subject();
var subStream2 = sub2.publish().refCount().distinctUntilChanged();

var count = 0;
setInterval(function () {
    console.log('    sent:', count += 1);
    sub.onNext(count);
}, 1000);


var count2 = 0;
setInterval(function () {
    console.log('  2 sent:', count2 += 10);
    sub2.onNext(count2);
}, 1000);

subStream
    .combineLatest(subStream2)
    .do(x => console.log('received:', x))
    .subscribe();