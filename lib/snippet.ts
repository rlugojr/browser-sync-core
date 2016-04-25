export function rules (options) {
    return {
        rules: [snippetRegex(options)].concat(options.get('rewriteRules').toJS()),
        blacklist: options.getIn(['snippetOptions', 'blacklist']).toJS(),
        whitelist: options.getIn(['snippetOptions', 'whitelist']).toJS()
    };
}

function snippetRegex (options) {
    var fn = options.getIn(['snippetOptions', 'rule', 'fn']);
    fn     = fn.bind(null, options.get('snippet'));

    return {
        match: options.getIn(['snippetOptions', 'rule', 'match']),
        fn: fn,
        once: true,
        id: 'bs-snippet'
    };
}
