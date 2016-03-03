export interface BrowserSyncOptions {
    get: (path: string) => any
    getIn: (path:string[]) => any
}
