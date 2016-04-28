import {RewriteRule, TransformFn} from "../rewrite-rules";

import NodeURL = require('url');
const url = require('url');

export function rewriteLinks (userServer: NodeURL.Url): TransformFn {

    var host   = userServer.hostname;
    var string = host;
    var port   = userServer.port;

    if (host && port) {
        if (parseInt(port, 10) !== 80) {
            string = host + ':' + port;
        }
    }

    const regex = new RegExp("https?:\\\\/\\\\/" + string + "|https?://" + string + "(\/)?|('|\")(https?://|/|\\.)?" + string + "(\/)?(.*?)(?=[ ,'\"\\s])", "g")

    return function (req, res, data) {
        return data.replace(regex, function (match) {
            var proxyUrl = req.headers['host'];

            /**
             * Reject subdomains
             */
            if (match[0] === '.') {
                return match;
            }

            var captured = match[0] === '\'' || match[0] === '"' ? match[0] : '';

            /**
             * allow http https
             * @type {string}
             */
            var pre = '//';

            if (match[0] === '\'' || match[0] === '"') {
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
                string = string.replace(/^(\/)/, '');
                return captured + match.replace(string, proxyUrl);
            }

            /**
             * Only add trailing slash if one was
             * present in the original match
             */
            if (out.path === '/') {
                if (match.slice(-1) === '/') {
                    out.path = '/';
                } else {
                    out.path = '';
                }
            }

            /**
             * Finally append all of parsed url
             */
            return [
                captured,
                pre,
                proxyUrl,
                out.path || '',
                out.hash || ''
            ].join('');
        })
    }
};

/**
 * Remove 'domain' from any cookies
 * @param {Object} res
 */
export function checkCookies (res) {
    if (typeof(res.headers['set-cookie']) !== 'undefined') {
        res.headers['set-cookie'] = res.headers['set-cookie'].map(function (item) {
            return rewriteCookies(item);
        });
    }
};

/**
 * Remove the domain from any cookies.
 * @param rawCookie
 * @returns {string}
 */
export function rewriteCookies (rawCookie) {

    var objCookie = (function () {
        // simple parse function (does not remove quotes)
        var obj = {};
        var pairs = rawCookie.split(/; */);

        pairs.forEach( function( pair ) {
            var eqIndex = pair.indexOf('=');

            // skip things that don't look like key=value
            if (eqIndex < 0) {
                return;
            }

            var key = pair.substr(0, eqIndex).trim();
            obj[key] = pair.substr(eqIndex + 1, pair.length).trim();
        });

        return obj;
    })();

    var pairs = Object.keys(objCookie)
        .filter(function (item) {
            return item !== 'domain';
        })
        .map(function (key) {
            return key + '=' + objCookie[key];
        });

    if (rawCookie.match(/httponly/i)) {
        pairs.push('HttpOnly');
    }

    return pairs.join('; ');
}
