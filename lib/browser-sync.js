'use strict';

var Rx       = require('rx');
var zip      = Rx.Observable.zip;
var just     = Rx.Observable.just;

var opts     = require('./incoming-options');
var tran     = require('./transform-options');
var getPorts = require('./ports');
var isOnline = require('./online');

var bs       = exports;

bs.create = function (userOptions, cb) {

    var options  = tran.update(opts.merge(userOptions));
    var ports    = getPorts.fn(options);
    var online   = isOnline.fn(options);

    zip(just(options), ports, online, function (options, ports, isOnline) {
        return options
            .mergeDeep(ports)
            .set('online', isOnline);
    }).subscribe(function (value) {
        cb(null, {
            options: value
        });
        //console.log('core port',   value.get('port'));
        //console.log('socket port', value.getIn(['socket', 'port']));
        //console.log('online',      value.get('online'));
    }, function (err) {
        console.log('ERROR:', err);
        cb(err);
    }, function () {
        //console.log('Setup Complete');
    });
};

module.exports = bs;