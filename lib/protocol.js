var p = exports;
var proto = require('../protocol.json');

p.validate = function (path) {
    var args = Array.from(arguments).slice(1);
    path = path.split('.');
    var domains = proto.domains;
    var command = getCommand(domains, path);
    var payloadArgs = {};
    var errors = verifyParameters(command.command.parameters, args);

    if (!errors.length) {
        payloadArgs = command.command.parameters.reduce((all, param, i) => {
            all[param.name] = args[i];
            return all;
        }, {});
    }

    return {
        errors: errors,
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
function verifyParameters (coll, args) {
    return coll.reduce((all, param, i) => {
        return all.concat(verifySingleParameter(args[i], param));
    }, []);
}

/**
 * @param {*} item
 * @param {Object} param
 * @param {string} [parent]
 * @returns {*}
 */
function verifySingleParameter (item, param, parent) {
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
function verifyOne (val, param, parent) {
    if (val === undefined) {
        if (!param.optional) {
            return [{
                name: param.name,
                errorType: 'missing',
                parent: parent
            }];
        }
    } else if (typeof val !== param.type) {
        return [{
            name: param.name,
            errorType: 'type',
            parent: parent
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
function verifyProperties (item, props, parentName) {
    return props.reduce(function (all, prop) {
        if (prop.type === 'object' && prop.properties && typeof item === 'object' && item[prop.name]) {
            return all.concat(verifyProperties(item[prop.name], prop.properties, [parentName, prop.name].join('.')));
        }
        return all.concat(verifyOne(item[prop.name], prop, [parentName, prop.name].join('.')));
    }, []);
}

/**
 * @param {Array} domains
 * @param {Array} domainMethod
 * @returns {{domain: *, command: *}}
 */
function getCommand (domains, domainMethod) {
    var dom = domains.filter(x => x.domain === domainMethod[0])[0];
    return {
        domain: dom,
        command: dom.commands.filter(x => x.name === domainMethod[1])[0]
    }
}