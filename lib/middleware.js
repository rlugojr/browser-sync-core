var Immutable = require('immutable');
var mw        = exports;
var PLUGIN_OPT_PATH  = ['module', 'hooks', 'server:middleware'];

mw.merge = function (options) {
    var pluginMw = options.get('plugins')
        .filter(function (item) {
            return item.hasIn(PLUGIN_OPT_PATH);
        })
        .map(function (item) {
            return item.getIn(PLUGIN_OPT_PATH);
        })
        .reduce(function (all, item) {
            return all.concat(item);
        }, Immutable.List([]));

    return options.set('middleware', options.get('middleware').concat(pluginMw));
};