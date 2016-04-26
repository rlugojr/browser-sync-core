import NodeURL  = require('url');

export interface ClientBrowser {
    type: string
}

export interface Client {
    ua: string,
    id: string|number,
    heartbeat: number,
    location: ClientLocation|any,
    browser: ClientBrowser
    options: ClientOptions
    socketId: string|number
}

export interface ClientScroll {
    x: number
    y: number
}

export interface ClientDimensions {
    width: number
    height: number
}

export interface ClientBrowserInformation {
    scroll: ClientScroll
    dimensions: ClientDimensions
}

export interface ClientRegistrationData {
    hash: string,
    sessionId: number|string,
    socketId:  number|string,
    browser: ClientBrowserInformation
}

export interface IncomingClientID {
    id: string
}
export interface IncomingClientRegistration {
    client: IncomingClientID
    data: ClientRegistrationData
}

/**
 * @param {Socket.io} client socket io client instance
 * @param {{client: {id: string}, data: object}} incoming
 * @param {Immutable.Map} clientOptions
 * @returns {Map<K, V>|Map<string, V>}
 */
export interface ClientLocation {
    referer: string
    url: NodeURL.Url
    fullPath: string
    fullUrl: string
}

export interface CodeSyncOptions {
    inject: boolean
    reload: boolean
}

export interface GhostModeOptions {
    clicks: boolean
    scroll: boolean
    forms: boolean|any
}

export interface ClientOptions {
    events: string[]
    codeSync: CodeSyncOptions
    timestamps: boolean
    scrollProportionally: boolean
    reloadOnRestart: boolean
    notify: boolean
    scrollRestoreTechnique: 'window.name' | 'cookie'
    /**
     * Clicks, Scrolls & Form inputs on any device will be mirrored to all others.
     * @property ghostMode
     * @param {Boolean} [clicks=true]
     * @param {Boolean} [scroll=true]
     * @param {Boolean} [forms=true]
     * @param {Boolean} [forms.submit=true]
     * @param {Boolean} [forms.inputs=true]
     * @param {Boolean} [forms.toggles=true]
     * @type Object
     */
    ghostMode: GhostModeOptions
    tagNames: any
}
