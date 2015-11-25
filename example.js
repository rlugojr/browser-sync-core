//var bs = require('./lib/browser-sync');
//bs.create({}, function (err, bs) {
//    console.log('cleanup');
//    bs.cleanup();
//});
var O = require('rx').Observable;

O.just('shane')
    .combineLatest(O.just('kittie'))
    .subscribe(x => console.log(x));