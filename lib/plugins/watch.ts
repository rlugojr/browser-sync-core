/// <reference path="./watch.d.ts" />
import {BrowserSync} from "../browser-sync";
import utils from '../utils';
import {WatchEventMerged, WatchEvent, WatchItem} from "./watch.d";
import {FSWatcher} from "fs";

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

module.exports["plugin:name"] = "Browsersync File Watcher";

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

    bs.watchers = bs.options
        .get(OPT_NAME)
        /**
         * For each file option, create a separate watcher (chokidar) instance
         */
        .map((item): {watcher: FSWatcher, item: WatchItem} => {
            const patterns = item.get('match').toJS();

            debug(`+ watcherUID:${item.get('watcherUID')} creating for patterns: ${patterns}`);

            const watch = chokidar.watch(patterns, item.get('options').toJS());
            /**
             * Add a flag when ready is called so that cleanups
             * can do correctly. Note: We do *NOT* wait for this ready
             * task to fire on every watcher before signalling that this
             * plugin is complete as the directory scans can take a
             * long time and should not hinder the startup of servers etc.
             */
            watch.on('ready', function () {
                debug(`✔ watcherUID:${item.get('watcherUID')} now ready`);
                watch._bsReady = true;
            });

            return {
                watcher: watch,
                item: item
            };
        });

    /**
     * Now create an Observable from each watcher and merge
     * the values they emit into a single sequence
     */
    const watchers = Rx.Observable.merge(
        bs.watchers.map(watcher => {
            return watcherAsObservable(
                watcher.watcher,
                watcher.item
            )
        }).toArray()) // Rx.Observable.merge needs a plain array, not a List
        .withLatestFrom(bs.options$, (event: WatchEvent, options: any) => ({event, options}))
        /**
         * Add an event id to every file changed
         */
        .map((watchEventMerged: WatchEventMerged, i) => {
            watchEventMerged.event.eventUID = i;
            return watchEventMerged;
        })
        .do((x: WatchEventMerged) => debug(`WUID:${x.event.watcherUID} EUID:${x.event.eventUID} ${x.event.event}, ${x.event.path}`))
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
    const watchers$ = bs.watchers$
        .filter((watchEventMerged: WatchEventMerged) => watchEventMerged.event.item.get('fn') !== undefined)
        .do((watchEventMerged: WatchEventMerged) => {
            const event = watchEventMerged.event;
            // call the function provided in the option
            // with the same signature as the chokidar cb
            // fn(eventName, filePath)
            event.item.get('fn').apply(bs, [event.event, event.path, event]);
        }).subscribe();

    // core watchers that cause either reloads/injections
    const core = getCoreWatchers(watchers, bs.options);

    // Listen to all changes and perform either a reload/injection
    // depending on the file type (ext)
    const core$ = bs.coreWatchers$ = core
        /**
         * Check if this watcher is enabled/disabled
         * by looking at the options object with matching id
         */
        .where((watchEventMerged: WatchEventMerged) => {
            const event = watchEventMerged.event;
            const watcherIsActive = watchEventMerged.options
                .get(OPT_NAME)
                .filter(watchOption => watchOption.get('watcherUID') === watchEventMerged.event.watcherUID)
                .getIn([0, 'active']);

            if (!watcherIsActive) {
                debug(`(eventUID:${watchEventMerged.event.eventUID}) ignoring event as this watcher (watcherUID:${watchEventMerged.event.watcherUID}) is disabled`);
            }
            return watcherIsActive;
        });

    const coreSubscription$ = core$.subscribe((watchEventMerged: WatchEventMerged) => {

        const event = watchEventMerged.event;

        // If the file that changed has a ext matching
        // one in the injectFileTypes array, attempt an injection

        if (watchEventMerged.options.get('injectFileTypes').contains(event.ext)) {
            // todo implement client methods like inject
            return bs.clients.reload();
        }

        // Otherwise, simply reload the browser
        bs.clients.reload();
    });

    const closeWatchers = () => bs.watchers.forEach(w => w.watcher.close());
    const getReadyCount = () => bs.watchers.reduce((a, w) => w.watcher._bsReady ? a + 1 : a, 0);

    // Return async cleanup function
    return (cb) => {

        coreSubscription$.dispose();
        watchers$.dispose();

        if (getReadyCount() === bs.watchers.size) {
            closeWatchers();
            cb();
        } else {
            var int = setInterval(function () {
                if (getReadyCount() === bs.watchers.size) {
                    closeWatchers();
                    clearInterval(int);
                    cb();
                }
            }, 10);
        }
    }
}

/**
 * @param watchers
 * @param options
 * @returns {*}
 */
function getCoreWatchers (watchers, options) {

    const watchers$ = watchers
        // Filter for core namespace, undefined FN
        // and event name of 'change'
        .filter((watchEventMerged: WatchEventMerged) =>
            watchEventMerged.event.namespace  === 'core' &&
            watchEventMerged.event.item.fn    === undefined &&
            (
                watchEventMerged.event.event  === 'change' ||
                watchEventMerged.event.event  === 'add'
            )
        );

    const debounce = options.get('watchDebounce');
    const throttle = options.get('watchThrottle');
    const delay    = options.get('watchDelay');

    debug(`Global Watch Debounce ${debounce}ms`);
    debug(`Global Watch Throttle ${throttle}ms`);
    debug(`Global Watch Delay    ${delay}ms`);

    const globalItems = [
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
        }
    ];

    return applyOperators(watchers$, globalItems, options);
}

/**
 * @param source
 * @param items
 * @param options
 * @returns {Observable<T>}
 */
function applyOperators (source, items, options) {
    return items.reduce((stream$, item) => {
        const value = options.get(item.option);
        if (value > 0) {
            return stream$[item.fnName].call(stream$, value);
        }
        return stream$;
    }, source);
}

/**
 * Create a single Observable sequence from a files option
 */
function watcherAsObservable (watcher: FSWatcher, item) {

    const watcherObservable$ = Rx.Observable.create(function (obs: Rx.Observer<WatchEvent>) {
        watcher.on('all', function (event, path) {
            obs.onNext({
                event,
                item,
                path,
                namespace  : item.get('namespace'),
                parsed     : require('path').parse(path),
                ext        : require('path').extname(path).slice(1),
                basename   : require('path').basename(path),
                watcherUID : item.get('watcherUID')
            });
        });
    });

    const individualWatcherItems = [
        {
            option: 'debounce',
            fnName: 'debounce'
        },
        {
            option: 'throttle',
            fnName: 'throttle'
        },
        {
            option: 'delay',
            fnName: 'delay'
        }
    ];

    return applyOperators(watcherObservable$, individualWatcherItems, item);
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
