import chokidar = require('chokidar');
import {RewriteRule} from "./rewrite-rules";
import {ClientOptions} from "./plugins/clients";

export interface BrowsersyncOptionsMap {
    get: (path: string) => any
    getIn: (path:string[]) => any
}

interface WatchOptions extends chokidar.WatchOptions {

}

export interface BrowsersyncOptions {
    /**
     * Browsersync can watch your files as you work. Changes you make will either
     * be injected into the page (CSS & images) or will cause all browsers to do
     * a full-page refresh. See [anymatch](https://github.com/es128/anymatch) for more information on glob patterns.
     * @property watch
     * @type Array|String
     * @default []
     */
    watch?: string[]
    /**
     * File watching options that get passed along to [Chokidar](https://github.com/paulmillr/chokidar).
     * Check their docs for available options
     * @property watchOptions
     * @type Object
     * @default undefined
     * @since 2.6.0
     */
    watchOptions?: WatchOptions
        /*
         persistent: true,
         ignored: '*.txt',
         ignoreInitial: false,
         followSymlinks: true,
         cwd: '.',

         usePolling: true,
         alwaysStat: false,
         depth: undefined,
         interval: 100,

         ignorePermissionErrors: false,
         atomic: true
         */
    /**
     * Proxy an EXISTING vhost. Browsersync will wrap your vhost with a proxy URL to view your site.
     * @property proxy
     * @type String|Object|Boolean
     * @param {String} [target]
     * @param {Boolean} [ws] - Enable websocket proxying
     * @param {Function|Array} [middleware]
     * @param {Function} [reqHeaders]
     * @param {Array} [proxyRes]
     * @default false
     */
    proxy?: string|string[]

    /**
     * Should clients be tracked? Almost always this should be true
     * but in some cases you may just want the Browsersync server
     * without any sync stuff.
     */
    clients: boolean

    /**
     * @property port
     * @type Number
     * @default 3000
     */
    port?: number

    /**
     * Enable strict mode
     */
    strict?: boolean

    /**
     * Addition middleware
     */
    middleware?: any[]
    /**
     * Add additional directories from which static
     * files should be served. Should only be used in `proxy` or `snippet`
     * mode.
     * @property serveStatic
     * @type Array
     * @default []
     * @since 2.8.0
     */
    serveStatic?: string|string[]

    scheme?: 'http' | 'https'

    /**
     * Change the console logging prefix. Useful if you're creating your
     * own project based on Browsersync
     * @property logPrefix
     * @type String
     * @default BS
     * @since 1.5.1
     */
    logPrefix?: string

    /**
     * @property logConnections
     * @type Boolean
     * @default false
     */
    logConnections?: boolean

    /**
     * @property logFileChanges
     * @type Boolean
     * @default true
     */
    logFileChanges?: boolean

    /**
     * Log the snippet to the console when you're in snippet mode (no proxy/server)
     * @property logSnippet
     * @type: Boolean
     * @default true
     * @since 1.5.2
     */
    logSnippet?: boolean

    /**
     * Additional JS to be loaded into clients
     */
    clientJs?: string|string[]

    /**
     * You can control how the snippet is injected
     * onto each page via a custom regex + function.
     * You can also provide patterns for certain urls
     * that should be ignored from the snippet injection.
     * @property snippetOptions
     * @since 2.0.0
     * @param {Boolean} [async] - should the script tags have the async attribute?
     * @param {Array} [blacklist]
     * @param {Array} [whitelist]
     * @param {RegExp} [rule.match=/&lt;body&#91;^&gt;&#93;*&gt;/i]
     * @param {Function} [rule.fn=Function]
     * @type Object
     */
    snippetOptions?: SnippetOptions

    /**
     * Add additional HTML rewriting rules.
     * @property rewriteRules
     * @since 2.4.0
     * @type Array
     * @default false
     */
    rewriteRules?: any[]

    /**
     * Some features of Browsersync (such as `xip` & `tunnel`) require an internet connection, but if you're
     * working offline, you can reduce start-up time by setting this option to `false`
     * @property online
     * @type Boolean
     * @default undefined
     */
    online?: boolean

    /**
     * Decide which URL to open automatically when Browsersync starts. Defaults to 'local' if none set.
     * Can be true, `local`, `external`, `ui`, `ui-external`, `tunnel` or `false`
     * @property open
     * @type Boolean|String
     * @default true
     */
    open?: string|string[]

    /**
     * Sync the scroll position of any element
     * on the page. Add any amount of CSS selectors
     * @property scrollElements
     * @type Array
     * @default []
     * @since 2.9.0
     */
    scrollElements?: string[]

    /**
     * Sync the scroll position of any element
     * on the page - where any scrolled element
     * will cause all others to match scroll position.
     * This is helpful when a breakpoint alters which element
     * is actually scrolling
     * @property scrollElementMapping
     * @type Array
     * @default []
     * @since 2.9.0
     */
    scrollElementMapping?: string[]

    /**
     * Time, in milliseconds, to wait before
     * instruction browser to reload/inject following a
     * file change event
     * @property watchDelay
     * @type Number
     * @default 0
     */
    watchDelay?: number

    /**
     * Restrict the frequency in which reload events
     * can be emitted to connected clients
     * @property watchThrottle
     * @type Number
     * @default 0
     * @since 2.6.0
     */
    watchThrottle?: number,

    /**
     * Wait for a specified amount of event silence before emitting
     * any file-changed events
     * @property watchDebounce
     * @type Number
     * @default 0
     * @since 2.6.0
     */
    watchDebounce?: number,

    /**
     * User provided plugins
     * @property plugins
     * @type Array
     * @default []
     * @since 2.6.0
     */
    plugins?: string[]

    /**
     * @property injectChanges
     * @type Boolean
     * @default true
     */
    injectChanges?: boolean

    /**
     * Whether to minify client script, or not.
     * @property minify
     * @type Boolean
     * @default true
     */
    minify?: boolean

    /**
     * @property host
     * @type String
     * @default null
     */
    host?: string

    /**
     * Alter the script path for complete control over where the Browsersync
     * Javascript is served from. Whatever you return from this function
     * will be used as the script path.
     * @property scriptPath
     * @default undefined
     * @since 1.5.0
     * @type Function
     */
    scriptPath?: () => string

    /**
     * Configure the Socket.IO path and namespace & domain to avoid collisions.
     * @property socket
     * @param {String} [path='/browser-sync/socket.io']
     * @param {String} [clientPath='/browser-sync']
     * @param {String|Function} [namespace='/browser-sync']
     * @param {String|Function} [domain=undefined]
     * @param {String|Function} [port=undefined]
     * @param {Object} [clients.heartbeatTimeout=5000]
     * @since 1.6.2
     * @type Object
     */
    socket?: SocketOptions

    clientOptions?: ClientOptions

    injectFileTypes: string[],

    /**
     * Should Browsersync accept function calls over process.stdin 
     */
    stdin: boolean
}

interface SocketOptions {
    socketIoOptions: SocketIoOptions
    socketIoClientConfig: SocketIoClientConfig
    clientPath: string
    namespace: string
}

interface SocketIoClientConfig {
    reconnectionAttempts: number
}

interface SocketIoOptions {
    log: boolean
    pingInterval: number
    path: string
}

interface SnippetOptions extends RewriteRule {
    async: boolean
    whitelist: string[]
    blacklist: string[]
}

export interface Cleanup {
    description: string
    async: boolean
    fn: () => void
}

export interface ClientsApi {
    reload: () => void
}
