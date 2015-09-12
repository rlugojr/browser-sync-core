var Rx = require('rx');

var fn1 = (obs) => {
    console.log('running 1');
    setTimeout(() => {
        console.log('first');
        obs.onNext(true);
        obs.onCompleted();
    }, 1000);
};

var fn2 = (obs) => {
    console.log('running 2');
    setTimeout(() => {
        console.log('second');
        obs.onNext(true);
        obs.onCompleted();
    }, 1000);
};

Rx.Observable.from([fn1, fn2].map(x => {
    return Rx.Observable.create(obs => {
        x(obs);
    });
}))
    .concatAll()
    .forEach(x => {
        //console.log(x);
    });