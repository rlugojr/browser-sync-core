const fs = require('fs');
const config = require('../config');
const path = require('path');
const middleware = require('../middleware');
const connect = require('connect');
const http = require('http');
const isString = require('../utils').isString;
const Immutable = require('immutable');
const serveStatic  = require('serve-static');

var ssID = 0;

exports['plugin:name'] = 'Browsersync Serve Static';

/**
 * Schema for files option
 */
const ServeStaticOption = Immutable.Record({
    id: '',
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
exports.createOne = function (root, options) {
    return {
        root,
        options
    }
};

/**
 * Put all middlewares into {path: '', fn: fn} format
 * @param {Map} options
 * @returns {Map}
 */
exports.transformOptions = function (options) {

    if (!options.get('serveStatic')) {
        return options.set('serveStatic', Immutable.List([]));
    }

    const initial = options.get('serveStatic');
    const transformed = ((initial) => {
        const trans = resolveMany(initial);
        if (Immutable.List.isList(trans)) {
            return Immutable.List([]).concat(trans);
        }
        return Immutable.List([trans]);
    })(initial);

    return options
        .set('serveStatic', transformed)
        .update('middleware', original => generateMw(original, transformed));
};

/**
 * Using newly transformed Serve Static options,
 * create Middlewares for them in the correct format
 * @param originalMw
 * @param transformed
 * @returns {*}
 */
function generateMw (originalMw, transformed) {
    if (!transformed.size) {
        return originalMw
    }

    return originalMw.concat(
        transformed.map(x => {
            return middleware.createOne({
                id: x.get('id'),
                handle: serveStatic(x.get('root'), x.get('options').toJS())
            });
        })
    );
}

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
 */
function createOne (item, namespace, options?) {

    if (isString(item)) {
        return new ServeStaticOption({
            root: item,
            id: 'serve-static-' + String(ssID++),
            namespace: namespace || 'core'
        })
            .update('options', (opt) => opt.mergeDeep(options))
    }

    return new ServeStaticOption({
        namespace,
        id: 'serve-static-' + String(ssID++)
    })
        .mergeDeep(item)
        .update('options', (opt) => opt.mergeDeep(options));
}
