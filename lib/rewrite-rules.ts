import Immutable   = require('immutable');
const mergeOpts    = require('./transform-options').mergeOptionsWithPlugins;
const config       = require('./config');
const OPT_NAME     = 'rewriteRules';
let count          = 0;

export interface RewriteRule {
    match: string|RegExp
    fn?: (req:any, res:any, match:string) => string | string
    replace?: (req:any, res:any, match:string) => string | string
    via?: string
    id?: string
}

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

export function fromJS(modified: RewriteRule[], options: Immutable.Map<string, any>) {
    return options.set(OPT_NAME, Immutable.fromJS(modified.map(createOne)));
}
