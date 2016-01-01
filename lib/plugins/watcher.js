const Immutable = require('immutable');
const utils     = require('../utils');
const path      = require('path');
const Rx        = require('rx');

/**
 * Schema for files option
 */
const FilesOption = Immutable.Record({
    match:     Immutable.List([]),
    options:   Immutable.Map({
        ignoreInitial: true
    }),
    fn:        undefined, // optional
    locator:   undefined, // optional
    namespace: 'core',
    throttle:  0
});



/**
 * @param bs
 * @param opts
 * @param cb
 */
module.exports.initAsync = function (bs, opts, cb) {
    // bail early if no files options provided
    // or if the List is size zero
    if (
        !  bs.options.has('files')
        || bs.options.get('files').size === 0
    ) return cb();

    // merge all files options into a single stream
    // along with the latest global options
    const watchers = getWatchers(bs.options.get('files').toJS())
        .withLatestFrom(bs.options$, (event, options) => ({event, options}));

    // simple function calls. If any files option registered a
    // callback function, just call it.
    watchers
        .filter(x => x.event.item.fn !== undefined)
        .do(x => {
            // call the function provided in the option
            // with the same signature as the chokidar cb
            // fn(eventName, filePath)
            x.event.item.fn.apply(bs, [x.event.event, x.event.path, x.event])
        }).subscribe();

    // core watchers that cause either reloads/injections
    const core$ = getCoreWatchers(watchers, bs.options.get('reloadThrottle'));

    // Listen to all changes and perform either a reload/injection
    // depending on the file type (ext)
    core$.subscribe(x => {

        // If the file that changed has a ext matching
        // one in the injectFileTypes array, attempt an injection
        if (x.options.get('injectFileTypes').contains(x.event.ext)) {
            return bs.inject(x.event);
        }

        // Otherwise, simply reload the browser
        bs.reload();
    });

    // Plugin is ready
    cb();
};

/**
 * @param watchers
 * @param throttle
 * @returns {*}
 */
function getCoreWatchers (watchers, throttle) {
    const watchers$ = watchers
        // Filter for core namespace, undefined FN
        // and event name of 'change'
        .filter((x) =>
            x.event.namespace  === 'core' &&
            x.event.item.fn    === undefined &&
            (
                x.event.event  === 'change' ||
                x.event.event  === 'add'
            )
        )
        .scan((_, x, i) => {
            x.event._i = i; // add event count
            return x;
        }, null);

    // If a global throttle option was set, apply it
    // here to all watchers$
    if (throttle > 0) {
        return watchers$.throttle(throttle);
    }

    // Otherwise, just return watchers un-throttled
    return watchers$;
}

/**
 * Get a merged sequence of watchers
 * @param {Array} files
 * @returns {Observable}
 */
function getWatchers (files) {
    return Rx.Observable.merge(
        files.map(watcherAsObservable)
    ).share();
}

/**
 * Create a single Observable sequence from a files option
 * @param {FilesOption} item
 * @returns {Observable<T>|Rx.Observable<T>}
 */
function watcherAsObservable (item) {
    return Rx.Observable.create(function (obs) {
        console.log('createing for', item.match, item.namespace);
        const watcher = require('chokidar')
            .watch(item.match, item.options)
            .on('all', function (event, file) {
                obs.onNext(decorateFileChangedEvent(event, file, item));
            });

        /**
         * Dispose of watcher
         */
        return function () {
            console.log('disposed for', item.match, item.namespace);
            return watcher.close();
        }
    });
}

/**
 * Decorate file change events
 * @param event
 * @param file
 * @param item
 * @returns {{}}
 */
function decorateFileChangedEvent (event, file, item) {
    const output = {};
    output.event     = event;
    output.namespace = item.namespace;
    output.item      = item;
    output.path      = file;
    output.ext       = path.extname(file).slice(1);
    output.basename  = path.basename(file);
    return output;
}

/**
 * @param options
 * @returns {*}
 */
module.exports.transformOptions = function (options) {

    const PATH    = ['options', 'files'];
    const plugins = options.get('plugins').filter(x => x.hasIn(PATH));
    const core    = options.get('files') || Immutable.List([]);

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
        return options.set('files', resolveMany(core, 'core'));
    }

    /**
     * Create a List of files options for plugins
     * Set's the namespace of the watcher to match the
     * name of the plugin
     */
    const pluginFileOptions = plugins
        .map(x => resolveMany(x.getIn(['options', 'files']), x.get('name')).get(0));

    /**
     * Now merge both core & plugins files options
     */
    const coreFileOptions = resolveMany(options.get('files'), 'core');
    return options.set('files', coreFileOptions.concat(pluginFileOptions));
};

/**
 * Resolve 1 or many files options depending on type
 * @param initialFilesOption
 * @param namespace
 * @returns {*}
 */
function resolveMany (initialFilesOption, namespace) {
    if (Immutable.List.isList(initialFilesOption)) {
        return initialFilesOption.map(x => createOne(x, namespace));
    }
    if (Immutable.Map.isMap(initialFilesOption)) {
        return Immutable.List([createOne(initialFilesOption, namespace)]);
    }
    if (typeof initialFilesOption === 'string') {
        return Immutable.List([createOne(initialFilesOption, namespace)]);
    }
}

/**
 * @param item
 * @returns {Cursor|List<T>|Map<K, V>|Map<string, V>|*}
 */
function createOne (item, namespace) {
    if (typeof item === 'string') {
        return new FilesOption({namespace})
            .mergeDeep({match: Immutable.List([item])});
    }

    return new FilesOption({namespace})
        .mergeDeep(item
            .update('match', x => Immutable.List([]).concat(x))
            .update('locator', locator => {
                if (utils.isRegex(locator)) {
                    return Immutable.Map(utils.serializeRegex(locator))
                }
            })
        );
}

// todo - Add cleanups
