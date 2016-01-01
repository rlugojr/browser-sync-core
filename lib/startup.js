'use strict';

const Immutable = require('immutable');
const Rx = require('rx');
const zip = Rx.Observable.zip;
const just = Rx.Observable.just;

const opts = require('./incoming-options');
const transform = require('./transform-options');
const clientJs = require('./client-js');
const getPorts = require('./ports');
const middleware = require('./middleware');
const isOnline = require('./online');
const ips = require('./ips');
const plugins = require('./plugins');
const rewriteRules = require('./rewrite-rules');
const serveStaticDirs = require('./serve-static');

const pipeline = [
    ips.resolve,
    plugins.resolve,
    plugins.namePlugins,
    transform.afterInit,
    clientJs.merge,
    clientJs.decorate,
    clientJs.addBuiltIns,
    clientJs.addUrls,
    serveStaticDirs.merge,
    serveStaticDirs.decorate,
    rewriteRules.merge,
    rewriteRules.decorate,
    middleware.merge,
    middleware.decorate,
    plugins.transformOptions
];

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
    }).map(opts => process(opts, pipeline));
};

module.exports.pipeline = pipeline;
function process (opts, pipeline) {
	return pipeline.reduce((all, item) => item.call(null, all), opts);
}
module.exports.process = process;
