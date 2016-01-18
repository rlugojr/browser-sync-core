const fs = require('fs');
const config = require('./config');
const path = require('path');
const middleware = require('./middleware');
const connect = require('connect');
const http = require('http');
const isString = require('./utils').isString;
const Immutable = require('immutable');

const ss = exports;

var ssID = 0;

/**
 * Schema for files option
 */
const ServeStaticOption = Immutable.Record({
    id: 0,
    namespace: '',
    root: '',
    options: Immutable.Map({}), // optional serveStatic options
    autoWatch: false
});

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
    //return options.update('serveStatic', x => Immutable.List([]).concat(x));
    return options;
};

/**
 * Put all middlewares into {path: '', fn: fn} format
 * @param {Map} options
 * @returns {Map}
 */
ss.transformOptions = function (options) {

    if (!options.get('serveStatic')) {
        return options.set('serveStatic', Immutable.List([]));
    }

    return options.update('serveStatic', ss => {
        const trans = resolveMany(ss);
        if (Immutable.List.isList(trans)) {
            return Immutable.List([]).concat(trans);
        }
        return Immutable.List([trans]);
    });
};

/**
 * Resolve 1 or many files options depending on type
 * @param initialOption
 * @param namespace
 * @returns {*}
 */
function resolveMany (initialOption) {
    if (Immutable.List.isList(initialOption)) {
        const out = initialOption.reduce((all, x) => {
            const litem = resolveMany(x);
            if (Immutable.List.isList(litem)) {
                return all.concat(litem);
            }
            return all.push(litem);
        }, Immutable.List([]));
        return out;
    }
    if (Immutable.Map.isMap(initialOption)) {
        if (Immutable.List.isList(initialOption.get('root'))) {
            return initialOption.get('root').map(root => {
                return createOne(
                    root,
                    initialOption.get('namespace'),
                    initialOption.get('options')
                );
            })
        }
        return createOne(initialOption, 'core');
    }
    if (isString('string')) {
        return createOne(initialOption, 'core');
    }
}

/**
 * @param item
 * @returns {Cursor|List<T>|Map<K, V>|Map<string, V>|*}
 */
function createOne (item, namespace, options) {

    if (isString(item)) {
        return new ServeStaticOption({
            root: item,
            id: ssID++,
            namespace: namespace || 'core'
        })
            .update('options', (opt) => opt.mergeDeep(options))
    }

    return new ServeStaticOption({
        namespace,
        id: ssID++
    })
        .mergeDeep(item)
        .update('options', (opt) => opt.mergeDeep(options));
}
