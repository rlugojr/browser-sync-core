const Immutable    = require('immutable');
const mergeOpts    = require('./transform-options').mergeOptionsWithPlugins;
const config       = require('./config');

var count          = 0;

/**
 * Pull server:middleware hooks from plugins
 * @param {Map} options
 * @returns {Map}
 */
export function merge (options) {
    return mergeOpts(options, 'rewriteRules', 'rewriteRules');
}

/**
 * Append ID to all rewrite rules
 * @param {Map} options
 * @returns {Map}
 */
export function decorate (options) {
    return options.update('rewriteRules', x => {
        return x.map(createOne);
    });
}

export function createOne (item) {
    return Immutable.Map({
        id: 'bs-rewrite-rule-' + (count += 1)
    }).mergeDeep(item);
}

/**
 *
 */
export function fromJS (coll) {
    return Immutable.fromJS(coll.map(createOne));
}

