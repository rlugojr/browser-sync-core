import NodeURL  = require('url');

export interface CookieOptions {
    stripDomain: boolean
}

export interface HttpProxyOptions {
    changeOrigin: boolean
    autoRewrite: boolean
    secure: boolean
    ws: boolean
}

export interface ProxyOption {
    id: string,
    route: string
    target: string
    rewriteRules: boolean,
    /**
     * Functions to be called on proxy response
     * with args [proxyReq, req, res, options]
     */
    proxyReq: any[],
    /**
     * Functions to be called on proxy response
     * with args [proxyRes, req, res]
     */
    proxyRes: any[],
    proxyErr: (err, proxy) => void
    url: NodeURL.Url
    options: HttpProxyOptions
    cookies: CookieOptions
    ws: boolean
}
