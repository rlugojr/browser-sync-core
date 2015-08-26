var bs = require('./')
    .create({}, function (err, out) {
        console.log(out.options.toJS());
    });