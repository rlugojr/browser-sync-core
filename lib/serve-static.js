const fs = require('fs');
const config = require('./config');
const path = require('path');
const middleware = require('./middleware');
const mergeOpts    = require('./transform-options').mergeOptionsWithPlugins;
const connect = require('connect');
const http = require('http');
const isString = require('./utils').isString;
const Immutable = require('immutable');

const ss = exports;

/**
 * Serve static options can be either a bunch of string
 * pointing to directories, or it can be in the form
 * of root, options that are passed directly to the serve-static module
 *
 * eg: simple strings
 *      serveStatic: ['.tmp', './app']
 *
 * eg: simple strings mixed with options
 *      serveStatic: [
 *          '.tmp',
 *          './app',
 *          {
 *              root: 'templates',
 *              options: {extensions: ['html']}
 *          }
 *      ]
 * @param root
 * @param options
 * @returns {{root: *, options: *}}
 */
ss.createOne = function (root, options) {
    return {
        root,
        options
    }
};

/**
 * Pull server:middleware hooks from plugins
 * @param {Map} options
 * @returns {Map}
 */
ss.merge = function (options) {
    // ensure serveStatic is a list
    return options.update('serveStatic', x => Immutable.List([]).concat(x));
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
                return Immutable.fromJS(ss.createOne(item, defaultOptions));
            }
            return Immutable
                .fromJS(ss.createOne('', defaultOptions))
                .mergeDeep(item);
        })
        .reduce((all, item) => {
            if (item.get('root').size) {
                return all.concat(Immutable.fromJS(item.get('root').map(x => {
                    return ss.createOne(x, defaultOptions.mergeDeep(item.get('options')).toJS());
                })));
            }
            return all.push(item);
        }, Immutable.List([]));

    return options.set('serveStatic', mw);
};
