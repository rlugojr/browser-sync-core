import Immutable   = require('immutable');
const mergeOpts    = require('./transform-options').mergeOptionsWithPlugins;
const config       = require('./config');
const OPT_NAME     = 'rewriteRules';
let count          = 0;

export type Middleware  = (req, res, next) => void;
export type TransformFn = (req, res, data: string) => string;

export interface RewriteRule {
    fn: Middleware
    via?: string
    id?: string
    paths?: Immutable.List<string>
    whitelist?: Immutable.List<string>
    blacklist?: Immutable.List<string>
}

const RwRule = Immutable.Record(<RewriteRule>{
    via:       'Browsersync Core',
    id:        '',
    whitelist: Immutable.List([]),
    blacklist: Immutable.List([]),
    paths:     Immutable.List([]),
    fn:        () => {}
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
