var Rx       = require('rx');
var just     = Rx.Observable.just;
var empty    = Rx.Observable.empty;



incoming.onNext('shane1');

setTimeout(function () {
    incoming.onNext('shane2');
    incoming.onNext('alfred1');
    incoming.onNext('shane3');
}, 4000);
setTimeout(function () {
    current.onNext({locked: true, id: 'BODSS MAN'});
}, 4000);
setTimeout(function () {
    incoming.onNext('alfred2');
    incoming.onNext('shane4');
    incoming.onNext('kittie');
}, 6010);
setTimeout(function () {
    current.onNext({locked: false, id: 'BODSS MAN'});
}, 7000);
setTimeout(function () {
    incoming.onNext('kittie');
    incoming.onNext('shane4');
    incoming.onNext('alfred2');
}, 6040);
setTimeout(function () {
    incoming.onNext('alfred3');
}, 9000);
setTimeout(function () {
    incoming.onNext('alfred4');
}, 12000);
//incoming.onNext('kittie');
//incoming.onNext('almost');