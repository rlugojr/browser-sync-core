var Immutable    = require('immutable');
var rr           = exports;
var mergeOpts    = require('./transform-options').mergeOptionsWithPlugins;
var config       = require('./config');
var count        = 0;
/**
 * Pull server:middleware hooks from plugins
 * @param {Map} options
 * @returns {Map}
 */
rr.merge = function (options) {
    return mergeOpts(options, 'rewriteRules', 'rewriteRules');
};

/**
 * Append ID to all rewrite rules
 * @param {Map} options
 * @returns {Map}
 */
rr.decorate = function (options) {
    return options.update('rewriteRules', x => {
        return x.map(createOne);
    });
};

function createOne (item) {
    return Immutable.Map({
        id: 'bs-rewrite-rule-' + (count += 1)
    }).mergeDeep(item);
}

/**
 *
 */
rr.fromJS = function (coll) {
    return Immutable.fromJS(coll.map(createOne));
};

