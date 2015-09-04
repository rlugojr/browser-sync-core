'use strict';

var Rx   = require('rx');
var path = require('path');
var isString = require('./utils').isString;
var uniqueId = require('./utils').uniqueId;
var Imm  = require('immutable');
var fs   = require('fs');
var just = Rx.Observable.just;
var zip  = Rx.Observable.zip;

module.exports.resolve = function resolve(options) {
    var plugins = options.get('plugins').reduce(function (all, item) {
        if (!isString(item)) {
            var newItem = item;
            if (isString(item.get('module'))) {
                newItem = fromString(item.get('module'));
                newItem.options = item.get('options');
            }
            return all.concat(Imm.fromJS({module: {}, options: {}, via: 'inline'}).mergeDeep(newItem));
        }
        return all.concat(fromString(item));
    }, []);
    return options.set('plugins', Imm.fromJS(plugins));
};

module.exports.namePlugins = function (options) {
    var plugins = options.get('plugins').reduce(function (all, item) {
        all[item.getIn(['module', 'plugin:name']) || uniqueId()] = item;
        return all
    }, {});
    return options.set('plugins', Imm.fromJS(plugins));
};

function fromString (item) {
    if (item.charAt(0) === '.') {
        item = path.join(process.cwd(), item);
    }
    return {module: require(item), options: {}, via: require.resolve(item)};
}
