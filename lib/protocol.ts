const p = exports;
const proto = require('../protocol.json');

p.validate = function (path): {errors:any[], payload:any} {
    var args = Array.prototype.slice.call(arguments).slice(1);
    path = path.split('.');
    var payloadArgs = {};
    var domains = proto.domains;
    var domain = getDomain(domains, path[0]);

    if (domain.errors.length) {
        return {
            errors: domain.errors,
            payload: {}
        };
    }

    var command = getCommand(domain.domain, path[1]);

    if (command.errors.length) {
        return {
            errors: command.errors,
            payload: {}
        };
    }

    var validateErrors = verifyParameters(command.command.parameters, args);

    if (!validateErrors.length) {
        payloadArgs = command.command.parameters.reduce(function (all, param, i) {
            all[param.name] = args[i];
            return all;
        }, {});
    }

    return {
        errors: validateErrors,
        payload: {
            path: path.join('.'),
            args: payloadArgs
        }
    };
};

/**
 * @param {Array} coll
 * @param {Array} args
 * @returns {Array}
 */
function verifyParameters(coll, args) {
    return coll.reduce(function (all, param, i) {
        var current = args[i];
        if (is('undefined', current) || !is(param.type, current)) {
            return all.concat(verifyOne(current, param, ''));
        }
        return all.concat(verifySingleParameter(args[i], param));
    }, []);
}

/**
 * @param {*} item
 * @param {Object} param
 * @param {string} [parent]
 * @returns {*}
 */
function verifySingleParameter(item, param, parent?) {
    parent = parent ? [parent, param.name].join('.') : param.name;
    if (param.type === 'object' && param.properties) {
        return verifyProperties(item, param.properties, parent);
    }
    return verifyOne(item, param, parent);
}

/**
 * Verify a single property
 * @param {*} val
 * @param {Object} param
 * @param {String} parent
 * @returns {Array}
 */
function verifyOne(val, param, parent) {
    if (val === undefined) {
        if (!param.optional) {
            return [{
                name: param.name,
                errorType: 'missing',
                path: parent,
                expectedType: param.type
            }];
        }
    } else if (!is(param.type, val)) {
        return [{
            name: param.name,
            errorType: 'type',
            path: parent,
            expectedType: param.type
        }]
    }
    return [];
}

/**
 * @param {*} item
 * @param {Object} props
 * @param {String} parentName
 * @returns {Array}
 */
function verifyProperties(item, props, parentName) {
    return props.reduce(function (all, prop) {
        if (prop.type === 'object' && prop.properties && is('object', item) && item[prop.name]) {
            return all.concat(verifyProperties(item[prop.name], prop.properties, [parentName, prop.name].join('.')));
        }
        return all.concat(verifyOne(item[prop.name], prop, [parentName, prop.name].join('.')));
    }, []);
}

/**
 * @param {Array} domains
 * @param {Array} domainName
 * @returns {Array}
 */
function getDomain(domains, domainName) {
    var dom = domains.filter(function (x) {
        return x.domain === domainName
    });
    var errors = [];
    if (!dom.length) {
        errors.push({
            errorType: 'domain-missing',
            name: domainName
        });
    }
    return {
        domain: dom[0],
        errors: errors
    }
}

/**
 * @param {Object} domain
 * @param {String} domainMethod
 * @returns {{domain: *, command: *}}
 */
function getCommand(domain, domainMethod) {
    var command = domain.commands.filter(function (x) {
        return x.name === domainMethod
    });
    var errors = [];
    if (!command.length) {
        errors.push({
            errorType: 'command-missing',
            domain: domain.domain,
            name: domainMethod
        });
    }
    return {
        command: command[0],
        errors: errors
    }
}

/**
 * More robust typechecking - taken from lodash
 * @type {{array: string, boolean: string, function: string, number: string, object: string, string: string}}
 */
var tags = {
    'array': '[object Array]',
    'boolean': '[object Boolean]',
    'function': '[object Function]',
    'number': '[object Number]',
    'object': '[object Object]',
    'string': '[object String]'
};

/**
 * @param type
 * @param value
 * @returns {boolean}
 */
function is(type, value) {
    if (type === 'undefined') {
        return value === undefined;
    }
    if (!tags[type]) {
        throw new Error('Cannot check type ' + type);
    }
    return Object.prototype.toString.call(value) === tags[type];
}
