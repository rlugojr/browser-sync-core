var opts      = require('./incoming-options');
var files     = exports;
var Immutable = require('immutable');
var isList    = Immutable.List.isList;
var isString  = require('./utils').isString;
var isMap     = Immutable.Map.isMap;
var Rx        = require('rx');

var defaultWatchOptions = Immutable.Map({
    ignored:  /^([.][^.\/\\])|([\/\\]+[.][^.])/
});

files.merge = function (options) {
    var OPT_PATH = ['options', 'files'];
    var coreFiles = Immutable.fromJS(incoming(options.get('files'), 'core', options.get('watchOptions')));
    var pluginFiles = options
        .get('plugins')
        .filter(function (item) {
            return item.hasIn(OPT_PATH);
        })
        .reduce(function (all, item, key) {
            return all.concat(incoming(item.getIn(OPT_PATH), key, defaultWatchOptions));
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
        .filter(isString)
        .map(function (item) {
            return Immutable.fromJS({
                match: item,
                fn: undefined,
                options: opts
            });
        })
        .concat(
            collection
                .filter(function (item) {
                    return !isString(item);
                })
                .map(function (item) {
                    return item.set('options', defaultWatchOptions.mergeDeep(item.get('options')));
                })
        )
        .map(function (item) {
            return item.set('namespace', namespace);
        });
}

files.getWatcher = function (subject) {

};