import utils from '../utils';
import {ServeStaticOptions} from "./serveStatic-opts";
const fs = require('fs');
const config = require('../config');
const path = require('path');
const middleware = require('../middleware');
const connect = require('connect');
const http = require('http');
const Immutable = require('immutable');
const serveStatic = require('serve-static');

var ssID = 1;

exports['plugin:name'] = 'Browsersync Serve Static';

export interface ServeStaticOption {
    id: string
    namespace: string
    root: string
    options: ServeStaticOptions // optional serveStatic options
    autoWatch: boolean
}

/**
 * Schema for files option
 */
const ServeStaticOption = Immutable.Record(<ServeStaticOption>{
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
    return {root, options}
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
    /**
     * If any array was given, such as
     * ['.tmp', './app']
     */
    if (Immutable.List.isList(initialOption)) {
        const out = initialOption.reduce((all, x) => {
            const item = resolveMany(x);
            if (Immutable.List.isList(item)) {
                return all.concat(item);
            }
            return all.push(item);
        }, Immutable.List([]));
        return out;
    }

    /**
     * If an object was given such as
     * {
     *   root: './app'
     * }
     */
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

    /**
     * Finally if a string was given...
     */
    if (utils.isString('string')) {
        return createOne(initialOption, 'core');
    }
}

/**
 * @param item
 * @param namespace
 * @param options
 */
function createOne (item, namespace, options?) {

    /**
     * If we're creating from a string, there cannot
     * be any options etc, so just create a default
     */
    if (utils.isString(item)) {
        return new ServeStaticOption({
            root: item,
            id: getServeStaticId(ssID++),
            namespace: namespace || 'core'
        })
            .update('options', (opt) => opt.mergeDeep(options))
    }

    /**
     * Here it must have been an object
     */
    return new ServeStaticOption({
        namespace,
        id: getServeStaticId(ssID++)
    })
    .mergeDeep(item)
    .update('options', (opt) => opt.mergeDeep(options));
}

function getServeStaticId (num) {
    return `Browsersync Serve Static (${num})`;
}
