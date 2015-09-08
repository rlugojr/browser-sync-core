'use strict';

var Immutable = require('immutable');
var Rx        = require('rx');
var zip       = Rx.Observable.zip;
var just      = Rx.Observable.just;

var startup   = require('./startup');

var bs        = exports;

bs.create = function (userOptions, cb) {

    /**
     * Options stream
     */
    var opts = startup(userOptions);

    var filewatcher = opts
        .subscribe(function (opts) {
            cb(null, {options: opts})
            //opts.get('files').toJS().forEach(function (item) {
            //    console.log(item);
            //});
            //console.log('From file watcher');
            //cb(null, {
            //    options: value
            //});
        }, function (err) {
            console.log('ERROR:', err);
            console.log(err.stack);
            cb(err);
        }, function () {
            //console.log('Setup Complete');
        });

    //var server = opts
    //    .subscribe(function (value) {
    //        console.log('From Server init');
    //        //cb(null, {
    //        //    options: value
    //        //});
    //    }, function (err) {
    //        console.log('ERROR:', err);
    //        console.log(err.stack);
    //        cb(err);
    //    }, function () {
    //        //console.log('Setup Complete');
    //    });
};

module.exports = bs;