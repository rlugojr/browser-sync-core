var Immutable = require('immutable');
var utils     = require('../utils');

/**
 * Schema for files option
 */
const FilesOption = Immutable.Record({
    match:     Immutable.List([]),
    options:   Immutable.Map({}),
    fn:        undefined, // optional
    locator:   undefined, // optional
    namespace: 'core',
    throttle:  0
});

module.exports.initAsync = function (bs, opts, cb) {
    //console.log('er');
    console.log(bs.options.get('files').toJS());
    cb();
};

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
var count = 0;

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
    /** ---------
     *
     * File watcher
     *
     * @type {Observable}
     */
    //if (options.get('files').size) {
    //
    //    const bsWatcher = files.getWatcher(options);
    //    const watcherOffSwitch = new Rx.Subject();
    //    const stdin = Observable
    //        .fromEvent(process.stdin, 'data')
    //        .map(x => x.toString())
    //        .map(x => x.slice(null, -1));
    //
    //    const onstate = Observable.just(true);
    //    const offState = Observable.merge(watcherOffSwitch, stdin.filter(x => x === 'off'));
    //    const pauser = Observable
    //        .merge(onstate, stdin.filter(x => x === 'on'))
    //        .flatMapLatest(() => bsWatcher.takeUntil(offState));
    //
    //    /**
    //     * none-core
    //     * If a plugin registers a file-watcher, but also registered
    //     * a fn, just call it.
    //     */
    //    pauser
    //        .filter(x => typeof x.item.fn === 'function')
    //        .do(x => x.item.fn.apply(bs, [x.event, x.path, x]))
    //        .subscribe();
    //
    //    /**
    //     * Core file-watcher stream
    //     */
    //
    //    const corestream = fileWatcher.handleCore(pauser, options);
    //
    //    /**
    //     *
    //     */
    //    corestream
    //        .where(x => x.type === 'reload')
    //        .do(x => bsSocket.protocol.send('Global.reload', true))
    //        .subscribe();
    //
    //    /**
    //     *
    //     */
    //    corestream
    //        .where(x => x.type === 'inject')
    //        .do(file => bsSocket.protocol.send('Global.inject', file))
    //        .subscribe();
    //
    //    cleanups.push(function () {
    //        watcherOffSwitch.onNext(false);
    //    });
//};
