var p = exports;
var proto = require('../protocol.json');

p.send = function (path) {
    var args = Array.from(arguments).slice(1);
    path = path.split('.');
    var domains = proto.domains;
    var errors  = [];
    var command = getCommand(domains, path);
    var payloadArgs = {};

    if (command.command.parameters.length) {
        var payloadArgs = command.command.parameters.reduce(function (all, param, i) {
            if (typeof args[i] !== param.type && !param.optional) {
                errors.push({
                    path: path.join('.'),
                    command: command.command,
                    domain: command.domain,
                    message: 'param ' + param.name + ' required & should be of type ' + param.type
                });
                return all;
            }
            all[param.name] = args[i];
            console.log('--------');
            console.log(all[param.name], param.properties);
            console.log('--------');
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

function getCommand (domains, domainMethod) {
    var dom = domains.filter(x => x.domain === domainMethod[0])[0];
    return {
        domain: dom,
        command: dom.commands.filter(x => x.name === domainMethod[1])[0]
    }
}