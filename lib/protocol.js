var p = exports;
var proto = require('../protocol.json');

p.send = function (path) {
    var args = Array.from(arguments).slice(1);
    path = path.split('.');
    var domains = proto.domains;
    var errors  = [];
    var command = getCommand(domains, path);
    var payloadArgs = {};
    var parameters = command.command.parameters;
    var errors = [];

    parameters.forEach(function (param, i) {
        verifyMany(args[0], param.properties);
    });

    function verifyMany (item, props, parent) {
        props.forEach(function (prop) {
            if (!item[prop.name] && !prop.optional) {
                return errors.push({
                    name: prop.name,
                    message: 'missing',
                    parent: parent
                });
            }
            if (prop.type === 'object' && prop.properties) {
                verifyMany(item[prop.name], prop.properties, 'locator');
            }
        });
    }

    return {
        errors: errors,
        payload: {
            path: path.join('.'),
            args: payloadArgs
        }
    };
};

function getCommand (domains, domainMethod) {
    var dom = domains.filter(x => x.domain === domainMethod[0])[0];
    return {
        domain: dom,
        command: dom.commands.filter(x => x.name === domainMethod[1])[0]
    }
}