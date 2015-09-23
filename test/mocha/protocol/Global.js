var assert = require('chai').assert;
var proto  = require('../../../lib/protocol');

describe('Protocol: Global', function () {

    it('can collect errors', function () {
        console.log(proto.send('Global.inject', {
            basename: 'style.css',
            item: {
                locator: {
                    name: "shane"
                }
            }
        }))
    });
});