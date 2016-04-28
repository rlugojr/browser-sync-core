import {Middleware, RewriteRule} from "./rewrite-rules";

export default function (rules: RewriteRule[], options: Immutable.Map<string, any>): Middleware {

    console.log(rules);
    
    return (req, res, next) => {

    }
}
