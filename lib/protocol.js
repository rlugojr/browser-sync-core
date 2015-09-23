var p = exports;
var proto = require('../protocol.json');

p.send = function (path) {
    var args = Array.from(arguments).slice(1);
    path = path.split('.');
    var domains = proto.domains;
    var command = getCommand(domains, path);
    var payloadArgs = {};
    var errors = collectErrors(command.command.parameters, args);


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

function collectErrors (coll, args) {
    return coll.reduce((all, param) => all.concat(verifyMany(args[0], param.properties, param.name)), [])
}

function verifyMany (item, props, parentName) {
    return props.reduce(function (all, prop) {
        if (typeof item[prop.name] === 'undefined') {
            if (!prop.optional) {
                return all.concat({
                    name: prop.name,
                    errorType: 'missing',
                    parent: parentName
                });
            }
        } else if (typeof item[prop.name] !== prop.type) {
            return all.concat({
                name: prop.name,
                errorType: 'type',
                parent: parentName
            });
        } else {
            if (prop.type === 'object' && prop.properties) {
                return all.concat(verifyMany(item[prop.name], prop.properties, [parentName, prop.name].join('.'), prop.required));
            }
        }
        return all;
    }, []);
}

function getCommand (domains, domainMethod) {
    var dom = domains.filter(x => x.domain === domainMethod[0])[0];
    return {
        domain: dom,
        command: dom.commands.filter(x => x.name === domainMethod[1])[0]
    }
}