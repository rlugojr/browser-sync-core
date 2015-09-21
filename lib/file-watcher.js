module.exports.handleCore = function (pauser, options) {

    var injectList   = options.get('injectFileTypes').toJS();

    /**
     * none-core
     * If a plugin registers a file-watcher, but also registered
     * a fn, just call it
     */
    pauser
        .filter(x => typeof x.item.fn === 'function')
        .do(x => x.item.fn.apply(null, [x.event, x.file, x]))
        .subscribe();

    /**
     * Create a watcher that is only concerned with 'core'
     * ie: files that are provided in regular options.
     * Only list for 'change' events for now & decorate
     * with a type of either 'inject' or 'reload' depending
     * on whether we thing the resource can be 'injected'
     * @type {Rx.Observable}
     */
    return pauser
        .filter(x => x.namespace === 'core')
        .filter(x => x.event === 'change')
        .filter(x => x.item.fn === undefined)
        .map(x => {
            x.type = injectList.indexOf(x.ext.slice(1)) > -1
                ? 'inject'
                : 'reload';
            return x;
        });
};