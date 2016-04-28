import {Middleware, RewriteRule} from "./rewrite-rules";
const debug = require("debug")("bs:resp-mod");

export default function (rules: RewriteRule[], options: Immutable.Map<string, any>): Middleware {

    debug(`creating middleware for ${rules.length} rules`);


    return (req, res, next) => {

        console.log(rules);

        if (res._respModifier) {
            debug("x rejecting", req.url);
            return next();
        }

        debug(`+ accept: ${req.url}`);
        
        
        next();
    }
}
