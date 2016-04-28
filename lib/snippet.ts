import {RewriteRule} from "./rewrite-rules";

export default function (options): RewriteRule[] {
    const snippet = options.get('snippet');
    return [
        {
            id: 'bs-snippet',
            via: 'Browsersync Core',
            blacklist: options.getIn(['snippetOptions', 'blacklist']).toJS(),
            whitelist: options.getIn(['snippetOptions', 'whitelist']).toJS(),
            fn: function (req, res, data) {
                return data.replace(options.getIn(['snippetOptions', 'rule', 'match']), function (match) {
                    return match + snippet;
                });
            }
        }
    ]
}
