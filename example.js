var c = require('chokidar');
var w = c.watch('*.js');

setTimeout(x => w.close(), 3000);
