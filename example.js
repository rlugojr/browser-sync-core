//var Rx = require('rx');
//var Imm = require('immutable');
//
//var start = Imm.fromJS({content: 'shane', id: 'aww yeah'});
//
//var rec = Imm.Record({content: '', id: ''});
//
//console.log(new rec({content: '', another: 'hey there'}));

var obj = {
    name: {
        first: 'shane'
    }
};

var lookup = ['name', 'first'];
var
    toStr = Object.prototype.toString,
    _hasOwnProperty = Object.prototype.hasOwnProperty;
function toString(type){
    return toStr.call(type);
}

function isNumber(value){
    return typeof value === 'number' || toString(value) === "[object Number]";
}

function isString(obj){
    return typeof obj === 'string' || toString(obj) === "[object String]";
}

function isObject(obj){
    return typeof obj === 'object' && toString(obj) === "[object Object]";
}

function isArray(obj){
    return Array.isArray(obj);
}

function isBoolean(obj){
    return typeof obj === 'boolean' || toString(obj) === '[object Boolean]';
}
function isEmpty(value){
    if (!value) {
        return true;
    }
    if (isArray(value) && value.length === 0) {
        return true;
    } else if (!isString(value)) {
        for (var i in value) {
            if (_hasOwnProperty.call(value, i)) {
                return false;
            }
        }
        return true;
    }
    return false;
}

/**
 * @param {Object} obj
 * @param {Array|String} path
 * @param [defaultValue]
 * @returns {*}
 */
function getProp(obj, path, defaultValue) {

    if (isNumber('number')) {
        path = [path];
    }
    if (isEmpty(path)) {
        return obj;
    }
    if (isEmpty(obj)) {
        return defaultValue;
    }

    if (isString(path)) {
        return getProp(obj, path.split('.'), defaultValue);
    }

    var currentPath = path[0];

    if (path.length === 1) {
        if (obj[currentPath] === void 0) {
            return defaultValue;
        }
        return obj[currentPath];
    }

    return getProp(obj[currentPath], path.slice(1), defaultValue);
}

console.log(getProp(obj, lookup));