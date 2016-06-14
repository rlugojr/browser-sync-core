import {BrowsersyncOptions} from "./browser-sync-opts";

/**
 * @module BrowserSync.options
 */
module.exports = <BrowsersyncOptions>{
    watchOptions: {
        ignoreInitial: true
    },
    clients: true,
    port: 3000,
    strict: false,
    middleware: [],
    scheme: 'http',
    logPrefix: 'BS',
    logConnections: false,
    logFileChanges: true,
    logSnippet: true,
    clientJs: [],
    rewriteRules: [],
    open: 'local',
    scrollThrottle: 0,
    scrollElements: [],
    scrollElementMapping: [],
    watchDelay: 0,
    watchThrottle: 0,
    watchDebounce: 0,
    plugins: [],
    injectChanges: true,
    minify: true,
    host: null,
    stdin: true,
    socket: {
        socketIoOptions: {
            log: false,
            pingInterval: 5000,
            path: '/browser-sync/socket.io'
        },
        socketIoClientConfig: {
            reconnectionAttempts: 50
        },
        clientPath: '/browser-sync',
        namespace: '/browser-sync'
    },
    snippetOptions: {
        async: true,
        whitelist: [],
        blacklist: [],
        id: 'bs-snippet',
        via: 'Browsersync Core',
        predicates: [function (req) {
            const acceptHeader = req.headers['accept'];
            if (!acceptHeader) {
                return false;
            }
            return acceptHeader.indexOf('html') > -1;
        }],
        fn: function (req, res, html, options) {
            const snippet = options.get('snippet');
            return html.replace(/<body[^>]*>/i, function (match) {
                return match + snippet;
            });
        },
    },
    injectFileTypes: ['css', 'png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'],
    excludedFileTypes: ['js', 'css', 'pdf', 'map', 'svg', 'ico', 'woff', 'json', 'eot', 'ttf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'mp3', '3gp', 'ogg', 'ogv', 'webm', 'm4a', 'flv', 'wmv', 'avi', 'swf', 'scss'],
    clientOptions: {
        events: [
            'scroll',
            'scroll:element',
            'input:text',
            'input:toggles',
            'form:submit',
            'form:reset',
            'click'
        ],
        codeSync: {
            inject: true,
            reload: true
        },
        timestamps: true,
        scrollProportionally: true,
        reloadOnRestart: false,
        notify: true,
        scrollRestoreTechnique: 'window.name',
        ghostMode: {
            clicks: true,
            scroll: true,
            forms: {
                submit: true,
                inputs: true,
                toggles: true
            }
        },
        tagNames: {
            'less': 'link',
            'scss': 'link',
            'css':  'link',
            'jpg':  'img',
            'jpeg': 'img',
            'png':  'img',
            'svg':  'img',
            'gif':  'img',
            'js':   'script'
        }
    }
};
