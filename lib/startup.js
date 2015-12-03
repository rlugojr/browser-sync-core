'use strict';

const Immutable = require('immutable');
const Rx = require('rx');
const zip = Rx.Observable.zip;
const just = Rx.Observable.just;

const opts = require('./incoming-options');
const transform = require('./transform-options');
const clientJs = require('./client-js');
const getPorts = require('./ports');
const files = require('./files');
const middleware = require('./middleware');
const isOnline = require('./online');
const ips = require('./ips');
const plugins = require('./plugins');
const rewriteRules = require('./rewrite-rules');
const serveStaticDirs = require('./serve-static');

/**
 * @param userOptions
 * @returns {Rx.Observable}
 */
module.exports = function (userOptions) {

    const options = opts.merge(userOptions);
    const ports   = getPorts.fn(options);
    const online  = isOnline.fn(options);

    return zip(just(options.set('version', '3.0.0')), ports, online, function (options, ports, isOnline) {
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
        .map(clientJs.addUrls)
        .map(serveStaticDirs.merge)
        .map(serveStaticDirs.decorate)
        .map(rewriteRules.merge)
        .map(rewriteRules.decorate)
        .map(middleware.merge)
        .map(middleware.decorate)
        .map(files.merge)
        .map(options => {
            return plugins.transformOptions(options);
        });
        //.map(options => {
        //    // todo where to put this transform
        //    return options.update('clientOptions', x => x.mergeDeep({default: transform.getClientOptions(options)}));
        //});
};