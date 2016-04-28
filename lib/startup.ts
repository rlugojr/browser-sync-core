'use strict';

import Immutable = require('immutable');
import Rx = require('rx');

const zip = Rx.Observable.zip;
const just = Rx.Observable.just;

const opts = require('./incoming-options');
const transform = require('./transform-options');
const clientJs = require('./client-js');
const middleware = require('./middleware');
const ips = require('./ips');
const plugins = require('./plugins');
const rewriteRules = require('./rewrite-rules');

import {getPorts} from './ports';
import {isOnline} from './online';

const pipeline = [

    ips.resolve,

    plugins.autoLoad,
    plugins.resolve,
    plugins.namePlugins,

    transform.afterInit,

    clientJs.merge,
    clientJs.decorate,
    clientJs.addBuiltIns,
    clientJs.addUrls,

    middleware.merge,
    middleware.decorate,

    rewriteRules.merge,
    rewriteRules.transformOptions,

    plugins.transformOptions
];

/**
 * @param userOptions
 * @returns {Rx.Observable}
 */
export default function (userOptions: {}): Rx.Observable<Immutable.Map<string, any>> {

    const options = opts.merge(userOptions);
    const ports   = getPorts(options);
    const online  = isOnline(options);

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

export function startupOptions (userOptions: {}): Immutable.Map<string, any> {
    const options = opts.merge(userOptions);
    return process(options, pipeline);
}
