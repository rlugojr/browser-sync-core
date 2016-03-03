const logUpdate = require('log-update');
const frames = ['-', '\\', '|', '/'];
var i = 0;

const int = setInterval(() => {
    const frame = frames[i = ++i % frames.length];

    logUpdate(
        `
        ♥♥
   ${frame} unicorns ${frame}
        ♥♥
`
    );
}, 80);

setTimeout(function () {
    clearInterval(int);
    logUpdate.done()
}, 2000);
