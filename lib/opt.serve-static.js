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

    //var defaultOptions = Immutable.Map({index: 'index.html'});
    //
    //var mw = options
    //    .get('serveStatic')
    //    .map(item => {
    //        if (isString(item)) {
    //            return Immutable.fromJS(ss.createOne(item, defaultOptions));
    //        }
    //        return Immutable
    //            .fromJS(ss.createOne('', defaultOptions))
    //            .mergeDeep(item);
    //    })
    //    .reduce((all, item) => {
    //        if (item.get('root').size) {
    //            return all.concat(Immutable.fromJS(item.get('root').map(x => {
    //                return ss.createOne(x, defaultOptions.mergeDeep(item.get('options')).toJS());
    //            })));
    //        }
    //        return all.push(item);
    //    }, Immutable.List([]));
    //
    //return options.set('serveStatic', mw);
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
        return initialOption.map(x => resolveMany(x));
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
    if (typeof initialOption === 'string') {
        return createOne(initialOption, 'core');
    }
}

/**
 * @param item
 * @returns {Cursor|List<T>|Map<K, V>|Map<string, V>|*}
 */
function createOne (item, namespace, options) {

    if (typeof item === 'string') {
        return new ServeStaticOption({
            root: item,
            id: ssID++,
            namespace: namespace || 'core'
        })
            .update('options', (opt) => opt.mergeDeep(options))
    }

    return new ServeStaticOption({namespace})
        .mergeDeep(item)
        .update('options', (opt) => opt.mergeDeep(options));

    //return new FilesOption({namespace})
    //    .mergeDeep(item
    //        .update('match', x => Immutable.List([]).concat(x))
    //        .update('id', x => watcherId++)
    //        .update('locator', locator => {
    //            if (utils.isRegex(locator)) {
    //                return Immutable.Map(utils.serializeRegex(locator))
    //            }
    //        })
    //    );
}
