import {BrowserSync} from "../browser-sync";
import utils from '../utils';
import {FSWatcher} from "fs";
import * as path from "path";

import Immutable = require('immutable');
import Rx        = require('rx');

const chokidar   = require('chokidar');
const debug      = require('debug')('bs:watch');

const OPT_NAME   = 'watch';
let watcherUID   = 0;

/**
 * Schema for files option
 */
const FilesOption = Immutable.Record({
    match:     Immutable.List([]),
    options:   Immutable.Map({}),
    fn:        undefined, // optional
    locator:   undefined, // optional
    namespace: 'core',
    throttle:  0,
    debounce:  0,
    delay:     0,
    active:    true,
    watcherUID: 0
});

type WatchOptionKeys = "match" | "options" | "fn" | "locator" | "namespace" | "throttle" | "debounce" | "delay" | "active" | "watcherUID";
type WatchTimeKeys   = "throttle" | "debounce" | "delay";

export interface WatchOption {
    match: Immutable.List<any>
    options?: Immutable.Map<string, any>
    fn?: () => void
    locator?: () => void, // optional
    namespace: string,
    throttle: number,
    debounce: number,
    delay: number,
    active: boolean,
    watcherUID: number
    get(path: 'match') : Immutable.List<any>
    get(path: 'options') : Immutable.Map<string, any>
    get(path: 'namespace') : string
    get(path: 'watcherUID') : number
    get(path: WatchTimeKeys) : number
}

module.exports["plugin:name"] = "Browsersync File Watcher";

function fileIoWatcher (patterns: string[], options): Rx.Observable<WatchEventRaw> {
    return Rx.Observable.create<WatchEventRaw>(function (observer) {
        debug(`Setup for ${patterns}`);
        const watcher = chokidar.watch(patterns, options);
        watcher.on('all', (event, path) => {
            observer.onNext({event, path});
        });
        return () => {
            debug(`Tear down for ${patterns}`);
            watcher.close();
        }
    });
}

/**
 * @param bs
 */
export function init (bs: BrowserSync) {
    // bail early if no files options provided
    // or if the List is size zero
    if (
        !  bs.options.has(OPT_NAME)
        || bs.options.get(OPT_NAME).size === 0
    ) return;

    const scheduler = bs.options.getIn(['debug', 'scheduler']);

    const watchersFromOpts : Rx.Observable<WatchEvent>[] = bs.options
        .get(OPT_NAME)
        .toArray()
        /**
         * For each file option, create a separate watcher (chokidar) instance
         */
        .map((watchOption: WatchOption): Rx.Observable<WatchEvent> => {
            const patterns        = watchOption.get('match').toArray();
            const chokidarOptions = watchOption.get('options').toJS();
            const namespace       = watchOption.get('namespace');
            const obs             = bs.options.getIn(['debug', 'watch', 'fileIoObservables', namespace]) || fileIoWatcher(patterns, chokidarOptions);

            const operators: Array<WatchTimeKeys> = ['debounce', 'throttle', 'delay'];

            const mapped = obs.map(x => {
                return {
                    event: x.event,
                    path: x.path,
                    parsed: path.parse(x.path),
                    item: watchOption,
                    namespace,
                    watcherUID: watchOption.get('watcherUID')
                }
            });

            return applyOperators(mapped, operators, watchOption, scheduler);
        });

    /**
     * Now create an Observable from each watcher and merge
     * the values they emit into a single sequence
     */
    const watchers = Rx.Observable
        .from(watchersFromOpts).mergeAll()
        /**
         * Add an event id to every file changed
         */
        .map((watchEvent: WatchEvent, i: number) => {
            watchEvent.eventUID = i;
            return watchEvent;
        })
        .do((x: WatchEvent) => debug(`WUID:${x.watcherUID} EUID:${x.eventUID} ${x.event}, ${x.path}`))
        .share();

    /**
     * Set the bs.watchers$ property to allow outsiders to listen
     * to any events that occurs on any watcher
     */
    bs.watchers$ = watchers;

    /**
     * Handle file-watching events where the user provided
     * a custom callback function
     */
    // const watchers$ = bs.watchers$
    //     .filter((watchEventMerged: WatchEventMerged) => watchEventMerged.event.item.get('fn') !== undefined)
    //     .do((watchEventMerged: WatchEventMerged) => {
    //         const event = watchEventMerged.event;
    //         // call the function provided in the option
    //         // with the same signature as the chokidar cb
    //         // fn(eventName, filePath)
    //         event.item.get('fn').apply(bs, [event.event, event.path, event]);
    //     }).subscribe();

    // core watchers that cause either reloads/injections
    //
    // // Listen to all changes and perform either a reload/injection
    // // depending on the file type (ext)
    bs.coreWatchers$ = applyGlobalOperators(watchers, bs.options, scheduler)
        .filter((watchEvent: WatchEvent) => {
            return watchEvent.namespace  === 'core' &&
                watchEvent.item.fn       === undefined &&
                (
                    watchEvent.event  === 'change' ||
                    watchEvent.event  === 'add'
                )
        })
        /**
         * Check if this watcher is enabled/disabled
         * by looking at the options object with matching id
         */
        .withLatestFrom(bs.options$, (event, options) => ({event, options}))
        .filter((watchEventMerged: WatchEventMerged) => {

            const {eventUID, watcherUID} = watchEventMerged.event;
            const {options} = watchEventMerged;
            const watcherIsActive = options
                .get(OPT_NAME)
                .filter(watchOption => watchOption.get('watcherUID') === watcherUID)
                .getIn([0, 'active']);

            if (!watcherIsActive) {
                debug(`(eventUID:${eventUID}) ignoring event as this watcher (watcherUID:${watcherUID}) is disabled`);
            }

            return watcherIsActive;
        });
    //
    const coreSubscription$ = bs.coreWatchers$.subscribe((watchEventMerged: WatchEventMerged) => {
        const event = watchEventMerged.event;
        // If the file that changed has a ext matching
        // one in the injectFileTypes array, attempt an injection

        if (watchEventMerged.options.get('injectFileTypes').contains(event.parsed.ext.slice(1))) {
            // todo implement client methods like inject
            console.log('inject');
        } else {
            // console.log(event.event, event.namespace, event.path);
            bs.protocol$.onNext('reload');
        }
    });

    // const closeWatchers = () => bs.watchers.forEach(w => w.watcher.close());
    // const getReadyCount = () => bs.watchers.reduce((a, w) => w.watcher._bsReady ? a + 1 : a, 0);

    // Return async cleanup function
    return (cb) => {

        // bs.coreWatchers$.dispose();
        coreSubscription$.dispose();
        cb();
        // watchers$.dispose();

        // if (getReadyCount() === bs.watchers.size) {
        //     closeWatchers();
        //     cb();
        // } else {
        //     const int = setInterval(function () {
        //         if (getReadyCount() === bs.watchers.size) {
        //             closeWatchers();
        //             clearInterval(int);
        //             cb();
        //         }
        //     }, 10);
        // }
    }
}

function applyOperators (source: Rx.Observable<any>, items: WatchTimeKeys[], watchOption: WatchOption, scheduler: Rx.Observable<any>) {
    return items.reduce((stream$, item) => {
        const value = watchOption.get(item);
        // console.log(options); // todo add global options to item level
        // console.log(value, item.option);
        if (value > 0) {
            return stream$[item].apply(stream$, [value, scheduler]);
        }
        return stream$;
    }, source);
}

function applyGlobalOperators (source: Rx.Observable<any>, options: Immutable.Map<string, number>, scheduler: Rx.Observable<any>) {
    const items = [
        {
            option: 'watchDebounce',
            fnName: 'debounce'
        },
        {
            option: 'watchThrottle',
            fnName: 'throttle'
        },
        {
            option: 'watchDelay',
            fnName: 'delay'
        },
    ];
    return items.reduce((stream$, item) => {
        const value = options.get(item.option);
        // console.log(options); // todo add global options to item level
        // console.log(value, item.option);
        if (value > 0) {
            return stream$[item.fnName].apply(stream$, [value, scheduler]);
        }
        return stream$;
    }, source);
}

/**
 * @param options
 * @returns {*}
 */
export function transformOptions (options) {

    const PATH       = ['options', OPT_NAME];
    const globalOpts = options.get('watchOptions');
    const plugins    = options.get('plugins').filter(x => x.hasIn(PATH));
    const core       = options.get(OPT_NAME) || Immutable.List([]);

    /**
     * Bail if `files` option not given in options or
     * plugins
     */
    if (!core && !plugins.size) {
        return options;
    }

    /**
     * Just process core files option if
     * no plugins registered files options
     */
    if (!plugins.size) {
        return options.set(OPT_NAME, resolveMany(core, 'core', globalOpts));
    }

    /**
     * Create a List of files options for plugins
     * Set's the namespace of the watcher to match the
     * name of the plugin
     */
    const pluginFileOptions = plugins
        .map(x => resolveMany(x.getIn(['options', OPT_NAME]), x.get('name'), globalOpts).get(0));

    /**
     * Now merge both core & plugins files options
     */
    const coreFileOptions = resolveMany(options.get(OPT_NAME), 'core', globalOpts);

    return options.set(OPT_NAME, coreFileOptions.concat(pluginFileOptions));
}

/**
 * Resolve 1 or many files options depending on type
 */
function resolveMany (initialFilesOption: Immutable.Map<any, any>, namespace: string, globalOpts) {
    if (Immutable.List.isList(initialFilesOption)) {
        return initialFilesOption.map(x => createOne(x, namespace, globalOpts));
    }
    if (Immutable.Map.isMap(initialFilesOption)) {
        return Immutable.List([createOne(initialFilesOption, namespace, globalOpts)]);
    }
    if (typeof initialFilesOption === 'string') {
        return Immutable.List([createOne(initialFilesOption, namespace, globalOpts)]);
    }
}

/**
 * @returns {Immutable.Record}
 */
function createOne (item, namespace, globalOpts) {
    if (typeof item === 'string') {
        return new FilesOption({namespace})
            .mergeDeep({
                match: Immutable.List([item]),
                watcherUID: watcherUID++,
                options: globalOpts
            });
    }

    return new FilesOption({namespace, options: globalOpts})
        .mergeDeep(item
            .update('match', x => Immutable.List([]).concat(x))
            .update('watcherUID', x => watcherUID++)
            .update('locator', locator => {
                if (Immutable.Map.isMap(locator)) {
                    // bail if an object was already given
                    return locator;
                }
                if (utils.isRegex(locator)) {
                    return Immutable.Map(utils.serializeRegex(locator))
                }
            })
        );
}

export interface ParsedPath {
    root: string,
    dir: string,
    base: string,
    ext: string,
    name: string
}

export interface WatchEventRaw {
    event: 'add' | 'change'
    path: string
}

export interface WatchEvent extends WatchEventRaw {
    namespace: string
    parsed: ParsedPath
    watcherUID: number
    eventUID?: number
    item: any
}

export interface WatchEventMerged {
    event: WatchEvent
    options: any
}

