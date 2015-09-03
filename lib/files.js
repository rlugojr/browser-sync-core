var opts         = require('./incoming-options');

module.exports.merge = function (options) {
    return options.mergeDeep({
        files: options
            .get('plugins')
            .filter(function (item) {
                return item.hasIn(['options', 'files']);
            })
            .reduce(function (all, item, key) {
                all[key] = opts.makeFilesArg(item.getIn(['options', 'files']));
                return all;
            }, {})
    });
};