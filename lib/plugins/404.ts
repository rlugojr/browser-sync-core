import {BrowserSync} from "../browser-sync";
const objPath = require('lodash.get');

module.exports["plugin:name"] = "Browsersync 404";
export function initAsync (bs: BrowserSync, opts: any, obs) {
    /**
     * Set a middleware, on all routes
     * that will run if the current route is
     * not picked up beforehand (like via the proxy
     * or serve static)
     */
    bs.setOption('middleware', function (mw) {
        return mw.concat({
            route: '',
            via: 'Browsersync 404 page',
            id: 'Browsersync 404 page',
            handle: function handlePath(req, res) {
                res.setHeader('Content-Type', 'text/html; charset=UTF-8');
                res.end(template(read(), {
                    req,
                    urls: bs.options.get('urls').toJS(),
                    urlList: urlList(bs.options.get('urls').toJS()),
                    clientList: getClientList(bs.clients$.getValue(), req.url)
                }));
            }
        });
    }).subscribe(function () {
        obs.done();
    });
}

/**
 * Take the Browsersync urls and generate
 * a html list
 * @param {{local: string, [external]: string}} urls
 * @returns {string}
 */
function urlList (urls) {
    return Object.keys(urls).reduce((all, key) => {
        return all + `<li>${key}, <a href="${urls[key]}">${urls[key]}</a></li>`;
    }, '');
}

/**
 * Get the currently connected browsers
 * and use their locations to form a list
 * @param {Immutable.OrderedMap} clients
 * @param url
 * @returns {string}
 */
function getClientList (clients, url) {

    const non404clients = clients
        .toList()
        .toJS()
        .filter(x => x.location.url.path !== url);

    if (non404clients.length) {
        return non404clients
            .map(x => `<li><strong>${x.id}: </strong><a href="${x.location.fullUrl}">${x.location.fullUrl}</a></li>`)
            .join('')
    }

    return `<li>no other browsers currently connected</li>`;
}

/**
 * Simple string replacements inside '{{varname}}'
 * @param {string} string
 * @param {object} data
 * @returns {string}
 */
function template(string, data) {
    return string.replace(/\{\{(.+?)\}\}/g, function () {
        return objPath(data, arguments[1], '');
    });
}

/**
 * Read the 404.html file from disk
 * @param {string} [path]
 * @returns {string}
 */
function read (path?: string) {
    return require('fs').readFileSync(path || __dirname + '/../../templates/404.html', 'utf8');
}
