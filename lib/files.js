var opts      = require('./incoming-options');
var files     = exports;
var Immutable = require('immutable');
var isList    = Immutable.List.isList;
var isString  = require('./utils').isString;
var isMap     = Immutable.Map.isMap;
var Rx        = require('rx');

files.merge = function (options) {
    var OPT_PATH = ['options', 'files'];
    var coreFiles = Immutable.fromJS(incoming(options.get('files'), 'core'));
    var pluginFiles = options
        .get('plugins')
        .filter(function (item) {
            return item.hasIn(OPT_PATH);
        })
        .reduce(function (all, item, key) {
            return all.concat(incoming(item.getIn(OPT_PATH), key));
        }, Immutable.List([]));

    return options.mergeDeep({files: coreFiles.concat(pluginFiles)});
};

/**
 * @param collection
 * @param namespace
 * @returns {*}
 */
function incoming (collection, namespace) {
    return collection
        .filter(isString)
        .map(function (item) {
            return Immutable.fromJS({
                match: item,
                fn: undefined,
                options: {}
            });
        })
        .concat(
            collection.filter(function (item) {
                return !isString(item);
            }))
        .map(function (item) {
            return item.set('namespace', namespace);
        });
}