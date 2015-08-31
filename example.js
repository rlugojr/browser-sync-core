var bs = require('./')
    .create({
        port: 4000,
        //strict: true,
        proxy: {
            target: 'localhost:3000',
            ws: true
        }
    }, function (err, out) {
        console.log(out.options.toJS());
    });