var fs = require('fs');
var config = require('./config');
var path = require('path');
var files = require('./files');
var middleware = require('./middleware');
var mergeOpts    = require('./transform-options').mergeOptionsWithPlugins;
var connect = require('connect');
var http = require('http');
var isString = require('./utils').isString;
var Immutable = require('immutable');

var ss = exports;

/**
 * Pull server:middleware hooks from plugins
 * @param {Map} options
 * @returns {Map}
 */
ss.merge = function (options) {
    var initial = options.get('serveStatic');

    if (options.getIn(['server', 'baseDir'])) {
        initial = options.getIn(['server', 'baseDir']).map(x => {
            return Immutable.fromJS({
                root: x,
                options: options.getIn(['server', 'serveStaticOptions'])
            });
        }).concat(initial);
    }

    return mergeOpts(options.set('serveStatic', initial), 'serveStatic', 'server:serveStatic');
};

/**
 * Put all middlewares into {path: '', fn: fn} format
 * @param {Map} options
 * @returns {Map}
 */
ss.decorate = function (options) {

    var defaultOptions = Immutable.Map({index: 'index.html'});

    var mw = options
        .get('serveStatic')
        .map(item => {
            if (isString(item)) {
                return Immutable.fromJS({
                    root: item,
                    options: defaultOptions
                });
            }
            return Immutable.fromJS({
                root: '',
                options: defaultOptions
            }).mergeDeep(item);
        })
        .reduce((all, item) => {
            if (item.get('root').size > 1) {
                return all.concat(Immutable.fromJS(item.get('root').map(x => {
                    return {
                        root: x,
                        options: defaultOptions.mergeDeep(item.get('options')).toJS()
                    }
                })));
            }
            return all.push(item);
        }, Immutable.List([]));

    return options.set('serveStatic', mw);
};
//
///**
// * Combine default + user + plugin middlewares
// * @param options
// * @returns {{middleware: Array.<*>, snippetMw, clientScript: *}}
// */
//ss.getMiddleware = function (options) {
//    var clientScript = clientJs.serveClientScript(options);
//    var snippetMw = respMod.create(snippet.rules(options));
//
//    return {
//        middleware: [
//            {
//                id: 'bs-client',
//                path: options.getIn(["scriptPaths", "path"]),
//                fn: clientScript.fn
//            },
//            {
//                id: 'bs-client-versioned',
//                path: options.getIn(["scriptPaths", "versioned"]),
//                fn: clientScript.fn
//            },
//            {
//                path: '',
//                id: 'bs-rewrite-rules',
//                fn: snippetMw.middleware
//            }
//        ].concat(options.get('middleware').toJS())
//            .concat(serveStaticMw(options)),
//        snippetMw: snippetMw,
//        clientScript: clientScript
//    }
//};