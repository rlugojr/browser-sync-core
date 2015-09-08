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
        .flatMap(function (opts) {
            return Rx.Observable.merge(opts.get('files')
                .toJS()
                .filter(function (item) {
                    return item.fn === undefined
                })
                .map(function (item) {
                    return Rx.Observable.create(function (obs) {
                        var watcher = require("chokidar")
                            .watch(item.match, item.options)
                            .on('all', function (event, file) {
                                obs.onNext({
                                    event: event,
                                    file: file
                                });
                            });
                        return function () {
                            return watcher.close();
                        }
                    }).map(function (event) {
                        event.namespace = item.namespace;
                        event.item = item;
                        return event;
                    });
                })
            );
            //return Rx.Observable.merge();
        })
        .subscribe(function (valu) {

            console.log(valu);
            //cb(null, {options: opts});
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