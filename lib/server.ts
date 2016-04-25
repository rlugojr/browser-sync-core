const fs         = require('fs');
const config     = require('./config');
const middleware = require('./middleware');
const connect    = require('connect');
const http       = require('http');
const https      = require('https');

export function create (options) {

    const app = connect();
    const mw  = middleware.getMiddleware(options);

    app.stack = mw.middleware;

    const output       = getServer(app, options);
    output.snippetMw   = mw.snippetMw;

    return output;
}

/**
 * @param app
 * @param options
 * @returns {{server: HttpServer, app: function}}
 */
export function getServer (app, options) {

    return {
        // todo - fix the need for this
        snippetMw: undefined,
        server: (function () {
            if (options.get('scheme') === 'https') {
                const pfxPath = options.getIn(['https', 'pfx']);
                return pfxPath ?
                    https.createServer(getPFX(pfxPath), app) :
                    https.createServer(getKeyAndCert(options), app);
            }
            return http.createServer(app);
        })(),
        app: app
    };
}

/**
 * @param options
 * @returns {{key, cert}}
 */
function getKeyAndCert (options) {
    return {
        key:  fs.readFileSync(options.getIn(['https', 'key'])  || config.certs.key),
        cert: fs.readFileSync(options.getIn(['https', 'cert']) || config.certs.cert)
    };
}

/**
 * @param filePath
 * @returns {{pfx}}
 */
function getPFX (filePath) {
    return {
        pfx: fs.readFileSync(filePath)
    };
}
