const opts           = require('./incoming-options');
const path           = require('path');
const files          = exports;
const Immutable      = require('immutable');
const isList         = Immutable.List.isList;
const isMap          = Immutable.Map.isMap;
const isString       = require('./utils').isString;
const isRegex        = require('./utils').isRegex;
const serializeRegex = require('./utils').serializeRegex;
const Rx             = require('rx');

const defaultWatchOptions = Immutable.Map({});

/**
 * Schema for files option
 */
const FilesOption = Immutable.Record({
    match:     Immutable.List([]),
    options:   Immutable.Map({}),
    fn:        undefined, // optional
    locator:   undefined, // optional
    namespace: 'core'
});

/**
 * Get an aggregated file watcher
 * @param {Map} options
 * @returns {Rx.Observable}
 */
files.getWatcher = function (options) {
    const files = options.get('files')
        .toJS()
        .map(watcherAsObservable);

    return Rx.Observable.merge(files).share();
};

/**
 * Merge core + plugins options
 * @param options
 * @returns {Map}
 */
files.merge = function (options) {
    const OPT_PATH  = ['options', 'files'];
    const coreFiles = Immutable.fromJS(incoming(options.get('files'), 'core', options.get('watchOptions')));
    const pluginFiles = options
        .get('plugins')
        .filter(x => x.hasIn(OPT_PATH))
        .reduce((all, item) => {
            return all.concat(incoming(item.getIn(OPT_PATH), item.get('name'), defaultWatchOptions));
        }, Immutable.List([]));

    return options.mergeDeep({files: coreFiles.concat(pluginFiles)});
};

/**
 * @param collection
 * @param namespace
 * @returns {*}
 */
function incoming (collection, namespace, opts) {
    return collection
        .map(item => {

            /**
             * When a string or regex given, convert to
             * file watcher object
             */
            if (isString(item)) {
                return new FilesOption({
                    match: [item],
                    options: opts
                });
            }

            /**
             * Here, an object literal was given, so we merge
             * default options & ensure `match` is an array
             */
            return new FilesOption(item)
                .update('match', x => Immutable.List([]).concat(x));
        })
        .map(x => x.set('namespace', namespace))
        .map(x => {
            if (x.hasIn(['locator'])) {
                const locator = x.getIn(['locator']);
                if (isRegex(locator)) {
                    return x.set('locator', Immutable.Map(serializeRegex(locator)))
                }
            }
            return x;
        });
}

/**
 * @param {Object} item
 * @returns {Observable}
 */
function watcherAsObservable (item) {
    return Rx.Observable.create(function (obs) {
        console.log('createing for', item.match, item.namespace);
        const watcher = require('chokidar')
            .watch(item.match, item.options)
            .on('all', function (event, file) {
                obs.onNext({
                    event: event,
                    path: file
                });
            });

        /**
         * Dispose of watcher
         */
        return function () {
            console.log('disposed for', item.match, item.namespace);
            return watcher.close();
        }
    })
    .map(decorateFileChangedEvent(item));
}

function decorateFileChangedEvent (item) {
    return function (event) {
        event.namespace = item.namespace;
        event.item      = item;
        event.ext       = path.extname(event.path).slice(1);
        event.basename  = path.basename(event.path);
        return event;
    }
}
