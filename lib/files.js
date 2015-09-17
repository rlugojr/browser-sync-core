var opts      = require('./incoming-options');
var path      = require('path');
var files     = exports;
var Immutable = require('immutable');
var isList    = Immutable.List.isList;
var isString  = require('./utils').isString;
var isMap     = Immutable.Map.isMap;
var Rx        = require('rx');

var defaultWatchOptions = Immutable.Map({
    ignored:  /^([.][^.\/\\])|([\/\\]+[.][^.])/
});

/**
 * Get an aggregated file watcher
 * @param {Map} opts
 * @returns {Observable}
 */
files.getWatcher = function (options) {
    return Rx.Observable.merge(options.get('files')
            .toJS()
            .map(watcherAsObservable)
    ).publish().refCount();
};

/**
 * Merge core + plugins options
 * @param options
 * @returns {Map}
 */
files.merge = function (options) {
    var OPT_PATH  = ['options', 'files'];
    var NAME_PATH = ['module', 'plugin:name'];
    var coreFiles = Immutable.fromJS(incoming(options.get('files'), 'core', options.get('watchOptions')));
    var pluginFiles = options
        .get('plugins')
        .filter(function (item) {
            return item.hasIn(OPT_PATH);
        })
        .reduce(function (all, item, key) {
            return all.concat(incoming(item.getIn(OPT_PATH), item.getIn(NAME_PATH), defaultWatchOptions));
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
            if (isString(item))
            return Immutable.fromJS({
                match: item,
                fn: undefined,
                options: opts
            });
            return item.update('options', x => defaultWatchOptions.mergeDeep(x));
        })
        .map(x => x.set('namespace', namespace));
}

/**
 * @param {Object} item
 * @returns {Observable}
 */
function watcherAsObservable (item) {
    return Rx.Observable.create(function (obs) {
        //console.log('createing for', item.match, item.namespace);
        var watcher = require('chokidar')
            .watch(item.match, item.options)
            .on('all', function (event, file) {
                obs.onNext({
                    event: event,
                    file: file
                });
            });

        /**
         * Dispose of watcher
         */
        return function () {
            console.log('disposed for', item.match, item.namespace);
            return watcher.close();
        }
    }).map(decorateFileChangedEvent(item));
}

function decorateFileChangedEvent (item) {
    return function (event) {
        event.namespace = item.namespace;
        event.item      = item;
        event.ext       = path.extname(event.file);
        event.basename  = path.basename(event.file);
        return event;
    }
}