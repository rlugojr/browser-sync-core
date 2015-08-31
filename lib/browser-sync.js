var opts     = require('./incoming-options');
var tran     = require('./transform-options');
var Rx       = require('rx');
var zip      = require('rx').Observable.zip;
var just     = require('rx').Observable.just;
var getPorts = require('./ports');
var isOnline = require('./online');
var bs       = exports;

bs.create = function (userOptions, cb) {

    var options  = tran.update(opts.merge(userOptions));
    var ports    = getPorts(options);
    var online   = isOnline(options);

    zip(just(options), ports, online, function (options, ports, isOnline) {
        return options
            .mergeDeep(ports)
            .set('online', isOnline);
    }).subscribe(function (value) {
        console.log('core port',   value.get('port'));
        console.log('socket port', value.getIn(['socket', 'port']));
        console.log('online',      value.get('online'));
    }, function (err) {
        console.log('ERROR:', err);
    }, function () {
        console.log('Setup Complete');
    });
};

module.exports = bs;