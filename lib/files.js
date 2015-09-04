var opts      = require('./incoming-options');
var files     = exports;
var Immutable = require('immutable');
var isList    = Immutable.List.isList;
var isString  = require('./utils').isString;
var isMap     = Immutable.Map.isMap;

files.merge = function (options) {
    return options.mergeDeep({
        files: options
            .get('plugins')
            .filter(function (item) {
                return item.hasIn(['options', 'files']);
            })
            .reduce(function (all, item, key) {
                all[key] = files.makeFilesArg(item.getIn(['options', 'files']));
                return all;
            }, {})
    });
};

/**
 * @param value
 * @returns {{globs: Array, objs: Array}}
 */
files.makeFilesArg = function (value) {

    var globs = [];
    var objs  = [];

    if (isString(value)) {
        globs = globs.concat(
            opts.utils.explodeFilesArg(value)
        );
    }

    if (isList(value) && value.size) {
        value.forEach(function (value) {
            if (isString(value)) {
                globs.push(value);
            } else {
                if (isMap(value)) {
                    objs.push(value);
                }
            }
        });
    }

    return {
        globs: globs,
        objs: objs
    };
};
