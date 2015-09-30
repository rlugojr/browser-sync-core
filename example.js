var Rx = require('rx');

var obs = new Rx.Observable.create(function (obs) {
    var count = 0;

    setInterval(function () {
        obs.onNext(count += 1);
        console.log('sent value', count);
    }, 500);
});


obs.throttle(2000)
    .do(x => console.log('Received value', x))
    .subscribe();


