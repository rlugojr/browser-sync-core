////var bs = require('./lib/browser-sync');
////bs.create({}, function (err, bs) {
////    console.log('cleanup');
////    bs.cleanup();
////});
//var O = require('rx').Observable;
//
//O.just('shane')
//    .combineLatest(O.just('kittie'))
//    .subscribe(x => console.log(x));

var cookie = require('cookie');
var util = require('./lib/proxy-utils');
console.log(
    util.rewriteCookies('logged_in=no; domain=.github.com; path=/; expires=Wed, 28 Nov 2035 10:43:12 -0000; secure; HttpOnly')
);
