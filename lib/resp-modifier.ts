import {Middleware, RewriteRule, TransformFn} from "./rewrite-rules";
const debug = require("debug")("bs:resp-mod");

export function isHtml (str) {
    if (!str) {
        return false;
    }
    // Test to see if start of file contents matches:
    // - Optional byte-order mark (BOM)
    // - Zero or more spaces
    // - Any sort of HTML tag, comment, or doctype tag (basically, <...>)
    return /^(\uFEFF|\uFFFE)?\s*<[^>]+>/i.test(str);
}

export default function (rules: RewriteRule[], options: Immutable.Map<string, any>): Middleware {

    debug(`creating middleware for ${rules.length} rules`);

    return (req, res, next) => {

        if (res._respModifier) {
            debug("x rejecting", req.url);
            return next();
        }

        res._respModifier = true;

        var toApply = rules
            .filter(rule => {
                if (rule.predicates.length) {
                    return rule.predicates.every(x => x.call(null, req, res, options));
                }
                return true;
            });

        const path = req.url.split('?')[0];

        if (!hasAcceptHeaders(req)) {
            debug("- no text/html headers", req.url);
            return next();
        }

        if (defaultIgnoreTypes.some(x => new RegExp(x).test(path))) {
            debug("- In default ignore types", req.url);
            return next();
        }

        if (toApply.length) {
            debug(`+ modifying: ${req.url} with ${toApply.length} rules`);
            modifyResponse(toApply);
        }

        next();

        function modifyResponse(rules) {

            var writeHead   = res.writeHead;
            var runPatches  = true;
            var write       = res.write;
            var end         = res.end;

            req.headers["accept-encoding"] = "identity";

            function restore() {
                res.writeHead = writeHead;
                res.write = write;
                res.end = end;
            }

            res.push = function (chunk) {
                res.data = (res.data || "") + chunk;
            };

            res.write = function (string, encoding) {

                if (!runPatches) {
                    return write.call(res, string, encoding);
                }

                if (string !== undefined) {
                    var body = string instanceof Buffer ? string.toString(encoding) : string;
                    // If this chunk appears to be valid, push onto the res.data stack
                    if (isHtml(body) || isHtml(res.data)) {
                        res.push(body);
                    } else {
                        restore();
                        return write.call(res, string, encoding);
                    }
                }
                return true;
            };

            res.writeHead = function () {
                if (!runPatches) {
                    return writeHead.apply(res, arguments);
                }

                var headers = arguments[arguments.length - 1];

                if (typeof headers === "object") {
                    for (var name in headers) {
                        if (/content-length/i.test(name)) {
                            delete headers[name];
                        }
                    }
                }

                if (res.getHeader("content-length")) {
                    res.removeHeader("content-length");
                }

                writeHead.apply(res, arguments);
            };

            res.end = function (string, encoding) {

                res.data = res.data || "";

                if (typeof string === "string") {
                    res.data += string;
                }

                if (string instanceof Buffer) {
                    res.data += string.toString();
                }

                if (!runPatches) {
                    return end.call(res, string, encoding);
                }

                // Check if our body is HTML, and if it does not already have the snippet.
                if (isHtml(res.data)) {
                    // Include, if necessary, replacing the entire res.data with the included snippet.
                    res.data = rules.reduce(function (string, rule) {
                        return rule.fn.call(null, req, res, string, options);
                    }, res.data);

                    runPatches = false;
                }
                if (res.data !== undefined && !res._header) {
                    res.setHeader("content-length", Buffer.byteLength(res.data, encoding));
                }
                end.call(res, res.data, encoding);
            };
        }
    }
}

export const defaultIgnoreTypes = [
    // text files
    "js", "json", "css",
    // image files
    "png", "jpg", "jpeg", "gif", "ico", "tif", "tiff", "bmp", "webp", "psd",
    // vector & font
    "svg", "woff", "ttf", "otf", "eot", "eps", "ps", "ai",
    // audio
    "mp3", "wav", "aac", "m4a", "m3u", "mid", "wma",
    // video & other media
    "mpg", "mpeg", "mp4", "m4v", "webm", "swf", "flv", "avi", "mov", "wmv",
    // document files
    "pdf", "doc", "docx", "xls", "xlsx", "pps", "ppt", "pptx", "odt", "ods", "odp", "pages", "key", "rtf", "txt", "csv",
    // data files
    "zip", "rar", "tar", "gz", "xml", "app", "exe", "jar", "dmg", "pkg", "iso"
].map(function (ext) {
    return "\\." + ext + "(\\?.*)?$";
});

function hasAcceptHeaders(req) {
    var acceptHeader = req.headers["accept"];
    if (!acceptHeader) {
        return false;
    }
    return acceptHeader.indexOf("html") > -1;
};
