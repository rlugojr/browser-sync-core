export interface ParsedPath {
    root: string,
    dir: string,
    base: string,
    ext: string,
    name: string
}

export interface WatchEvent {
    event: string
    path: string
    namespace: string
    parsed: ParsedPath
    ext: string
    basename: string
    watcherUID: number
    options?: any
    eventUID?: number
    item: any
}

export interface WatchEventMerged {
    event: WatchEvent
    options: any
}


export interface WatchItem {
    event: string
    match: any
    options?: any
    fn?: () => void
    locator?: () => void, // optional
    namespace: string,
    throttle: number,
    debounce: number,
    delay: number,
    active: boolean,
    watcherUID: number
}
