import Immutable = require('immutable');
const mw           = exports;
import utils from './utils';
import respMod from './resp-modifier';

const isFunction = utils.isFunction;
const clientJs   = require('./client-js');
const mergeOpts  = require('./transform-options').mergeOptionsWithPlugins;
var   count      = 0;
const OPT_NAME   = 'middleware';

export interface MiddlewareItem {
    id: string
    route: string
    handle: () => void
    via?: string
}

/**
 * Middleware option schema
 */
const MiddlewareOption = Immutable.Record(<MiddlewareItem>{
    id: '',
    route: '',
    via: '',
    handle: () => {}
});

/**
 * Pull server:middleware hooks from plugins
 * @param {Map} options
 * @returns {Map}
 */
mw.merge = function (options) {
    return mergeOpts(options, 'middleware', 'server:middleware');
};

/**
 * Put all middlewares into {id: '', route: '', handle: fn} format
 * @param {Map} options
 * @returns {Map}
 */
mw.decorate = function (options) {
    return options.update(OPT_NAME, x => x.map(createOne));
};

/**
 * @param item
 * @returns {*}
 */
function createOne (item) {
    const id = 'bs-middleware-' + (count += 1);
    if (isFunction(item)) {
        return new MiddlewareOption({
            id: id,
            handle: item
        });
    }
    return new MiddlewareOption({
        id: id
    }).mergeDeep(item);
}

module.exports.createOne = createOne;

/**
 * JS -> Immutable transformation
 */
export function fromJS(modified: MiddlewareItem[], options: Immutable.Map<string, any>) {
    return options.set(OPT_NAME, Immutable.fromJS(modified.map(createOne)));
}

/**
 * Combine default + user + plugin middlewares
 * @param options
 * @returns {{middleware: Array.<*>, snippetMw, clientScript: *}}
 */
mw.getMiddleware = function (options) {

    const rules     = [options.get('snippetOptions').toJS()].concat(options.get('rewriteRules').toJS());
    const respModMw = respMod(rules, options);
    const cli       = clientJs.getScript(options);
    
    const clientJsHandle = (req, res) => {
        res.setHeader('Content-Type', 'text/javascript');
        res.end(cli);
    };
    
    return {
        middleware: [
            {
                route: options.get('scriptPath'),
                id: 'bs-client',
                handle: clientJsHandle,
                via: 'Browsersync Core'
            },
            {
                route: '',
                id: 'bs-rewrite-rules',
                handle: respModMw,
                via: 'Browsersync Core'
            }
        ]
        .concat(options.get('middleware').toJS())
    }
};
