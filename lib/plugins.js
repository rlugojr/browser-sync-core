'use strict';

var Rx   = require('rx');
var path = require('path');
var isString = require('./utils').isString;
var uniqueId = require('./utils').uniqueId;
var Imm  = require('immutable');
var fs   = require('fs');
var just = Rx.Observable.just;
var zip  = Rx.Observable.zip;

/**
 * @param {Map} options
 * @returns {Map}
 */
module.exports.resolve = function resolve(options) {
    return options.set('plugins', Imm.fromJS(
        options.get('plugins')
            .reduce(function (all, item) {
                if (!isString(item)) {
                    var newItem = item;
                    if (isString(item.get('module'))) {
                        newItem = fromString(item.get('module'));
                        newItem.options = item.get('options');
                    }
                    return all.concat(Imm.fromJS({module: {}, options: {}, via: 'inline'}).mergeDeep(newItem));
                }
                return all.concat(fromString(item));
            }, [])
        )
    );
};

/**
 * Given anon plugins an Addressable name
 * @param {Map} options
 * @returns {Map}
 */
module.exports.namePlugins = function (options) {
    return options.set('plugins', Imm.fromJS(
        options.get('plugins')
            .reduce(function (all, item) {
                all[item.getIn(['module', 'plugin:name']) || uniqueId()] = item;
                return all
            }, {})
        )
    );
};

/**
 * @param options
 * @param bs
 */
module.exports.initAsync = function (options, bs) {
    var plugins = options.get('plugins')
        .reduce((all, item) => {
            if (item.hasIn(['module', 'initAsync'])) {
                return all.concat(Rx.Observable.create(obs => {
                    item.getIn(['module', 'initAsync'])(bs, item.get('options').toJS(), function (err, output) {
                        if (err) {
                            return obs.onError(err);
                        }
                        obs.onNext(output);
                        obs.onCompleted();
                    });
                }));
            }
            return all;
        }, []);
    return Rx.Observable.from(plugins).concatAll();
};

/**
 * @param item
 * @returns {{module: *, options: {}, via: String}}
 */
function fromString (item) {
    if (item.charAt(0) === '.') {
        item = path.join(process.cwd(), item);
    }
    return {module: require(item), options: {}, via: require.resolve(item)};
}