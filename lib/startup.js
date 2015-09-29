'use strict';

var Immutable = require('immutable');
var Rx        = require('rx');
var zip       = Rx.Observable.zip;
var just      = Rx.Observable.just;

var opts            = require('./incoming-options');
var transform       = require('./transform-options');
var clientJs        = require('./client-js');
var getPorts        = require('./ports');
var files           = require('./files');
var middleware      = require('./middleware');
var isOnline        = require('./online');
var ips             = require('./ips');
var plugins         = require('./plugins');
var rewriteRules    = require('./rewrite-rules');
var serveStaticDirs = require('./serve-static');

/**
 * @param userOptions
 * @returns {Rx.Observable}
 */
module.exports = function (userOptions) {

    var options = transform.update(opts.merge(userOptions));
    var ports   = getPorts.fn(options);
    var online  = isOnline.fn(options);

    options = options.set('version', '3.0.0');

    return zip(just(options), ports, online, function (options, ports, isOnline) {
        return options
            .mergeDeep(ports)
            .set('online', isOnline);
    })
        .map(ips.resolve)
        .map(plugins.resolve)
        .map(plugins.namePlugins)
        .map(transform.afterInit)
        .map(clientJs.merge)
        .map(clientJs.decorate)
        .map(clientJs.addBuiltIns)
        .map(serveStaticDirs.merge)
        .map(serveStaticDirs.decorate)
        .map(rewriteRules.merge)
        .map(rewriteRules.decorate)
        .map(middleware.merge)
        .map(middleware.decorate)
        .map(files.merge)
        .map(options => {
            return options.update('clientOptions', x => x.mergeDeep({default: transform.getClientOptions(options)})); // todo where to put this transform
        });
};