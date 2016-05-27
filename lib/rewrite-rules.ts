import Immutable   = require('immutable');
const mergeOpts    = require('./transform-options').mergeOptionsWithPlugins;
const OPT_NAME     = 'rewriteRules';
let count          = 0;


export type Middleware    = (req, res, next) => void;
export type TransformFn   = (req, res, data: string, options: Immutable.Map<string, any>) => string;
export type Predicate     = (req, res, options: Immutable.Map<string, any>) => boolean;

export interface RewriteRule {
    fn?: TransformFn
    via?: string
    id?: string
    predicates?: Predicate[]
}

const RwRule = Immutable.Record({
    via:        '',
    id:         '',
    predicates: [],
    fn:         () => {}
});

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
export function transformOptions (options) {
    return options.update('rewriteRules', x => {
        return x.map(createOne);
    });
}

/**
 * @param item
 * @returns {Cursor|Map<K, V>|List<T>|Map<string, V>}
 */
export function createOne (item) {
    if (typeof item === 'function') {
        return new RwRule(<RewriteRule>{
            id: 'bs-rewrite-rule-' + (count += 1),
            via: 'Inline Function',
            fn: item
        });
    }
    return new RwRule({
        id: 'bs-rewrite-rule-' + (count += 1),
        via: 'Inline Function'
    }).mergeDeep(item);
}

export function fromJS(modified: RewriteRule[], options: Immutable.Map<string, any>) {
    return options.set(OPT_NAME, Immutable.fromJS(modified.map(createOne)));
}
