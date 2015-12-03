const objPath = require('object-path');

function read (path) {
    return require('fs').readFileSync(path || __dirname + '/404.html', 'utf8');
}

module.exports.initAsync = function (bs, opts, done) {

    const urls          = bs.options.get('urls').toJS();

    const getClientList = (url) => {

        const clients = bs.clients$
            .getValue()
            .toList()
            .toJS()
            .filter(x => x.location.url.path !== url);

        if (clients.length) {
            return clients
                .map(x => `<li><strong>${x.id}: </strong><a href="${x.location.fullUrl}">${x.location.fullUrl}</a></li>`)
                .join('')
        }

        return `<li>no other browsers currently connected</li>`;
    };

    const urlList       = Object.keys(urls).reduce((all, key) => {
        return all + `<li>${key}, <a href="${urls[key]}">${urls[key]}</a></li>`;
    }, '');

    bs.setOption('middleware', function (mw) {
        return mw.concat({
            route: '',
            id: 'Browsersync 404 page',
            handle: function handlePath(req, res) {
                res.setHeader('Content-Type', 'text/html; charset=UTF-8');
                res.end(template(read(), {
                    req,
                    urls,
                    urlList,
                    clientList: getClientList(req.url)
                }));
            }
        });
    }).subscribe(function () {
        done();
    });
};

function template(string, data) {
    return string.replace(/\{\{(.+?)\}\}/g, function () {
        return objPath.get(data, arguments[1], '');
    });
}