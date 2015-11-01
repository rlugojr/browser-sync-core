var utils = exports;
var url = require('url');

utils.rewriteLinks = function rewriteLinks(userServer) {

    var host   = userServer.hostname;
    var string = host;
    var port = userServer.port;

    if (host && port) {
        if (parseInt(port, 10) !== 80) {
            string = host + ":" + port;
        }
    }

    return {
        match: new RegExp("https?://" + string + "(\/)?|('|\")(https?://|/|\\.)?" + string + "(\/)?(.*?)(?=[ ,'\"\\s])", "g"),
        fn:    function (req, res, match) {

            var proxyUrl = req.headers['host'];

            /**
             * Reject subdomains
             */
            if (match[0] === ".") {
                return match;
            }

            var captured = match[0] === "'" || match[0] === "\"" ? match[0] : "";

            /**
             * allow http https
             * @type {string}
             */
            var pre = "//";

            if (match[0] === "'" || match[0] === "\"") {
                match = match.slice(1);
            }

            /**
             * parse the url
             * @type {number|*}
             */
            var out = url.parse(match);

            /**
             * If host not set, just do a simple replace
             */
            if (!out.host) {
                string = string.replace(/^(\/)/, "");
                return captured + match.replace(string, proxyUrl);
            }

            /**
             * Only add trailing slash if one was
             * present in the original match
             */
            if (out.path === "/") {
                if (match.slice(-1) === "/") {
                    out.path = "/";
                } else {
                    out.path = "";
                }
            }

            /**
             * Finally append all of parsed url
             */
            return [
                captured,
                pre,
                proxyUrl,
                out.path || "",
                out.hash || ""
            ].join("");
        }
    };
};

/**
 * Remove 'domain' from any cookies
 * @param {Object} res
 * @param {Object} req
 * @param {Immutable.Map} config
 */
utils.checkCookies = function checkCookies(res) {
    if (typeof(res.headers["set-cookie"]) !== "undefined") {
        res.headers["set-cookie"] = res.headers["set-cookie"].map(function (item) {
            return utils.rewriteCookies(item);
        });
    }
};

var cookie = require('cookie');

/**
 * Remove the domain from any cookies.
 * @param rawCookie
 * @returns {string}
 */
utils.rewriteCookies = function rewriteCookies(rawCookie) {

    var parsed = cookie.parse(rawCookie, {
        decode: function(val) {
            // Prevent values from being decodeURIComponent transformed
            return val;
        }
    });

    var pairs =
        Object.keys(parsed)
            .filter(function (item) {
                return item !== "domain";
            })
            .map(function (key) {
                return key + "=" + parsed[key];
            });

    if (rawCookie.match(/httponly/i)) {
        pairs.push("HttpOnly");
    }

    return pairs.join("; ");
};