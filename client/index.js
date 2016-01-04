"use strict";

//var etag  = require("etag");
//var fresh = require("fresh");
var fs    = require('fs');
var path  = require("path");
//var zlib  = require("zlib");

var minifiedScript   = path.join(__dirname, '/dist/index.min.js');
var unminifiedScript = path.join(__dirname, '/dist/index.js');


//module.exports.middleware = init;
//module.exports.plugin = init;
module.exports.minified = function () {
    return fs.readFileSync(minifiedScript, 'utf8');
};
module.exports.unminified = function () {
    return fs.readFileSync(unminifiedScript, 'utf8');
};
