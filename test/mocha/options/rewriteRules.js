'use strict';

var assert = require('chai').assert;
var startup = require('../../../dist/startup').startupOptions;

describe('rewriteRules as options', function () {
    it('allows functions + object literals', function () {
        const out = startup({
            rewriteRules: [
                function (req, res, data) {
                    console.log('running');
                    return data;
                },
                {
                    id: 'MyRR',
                    predicates: [function () {
                        console.log('ere');
                    }],
                    fn: function (req, res, data) {
                        console.log('here');
                    }
                }
            ]
        }).get('rewriteRules').toJS();

        assert.equal(out.length, 2);
        assert.equal(out.filter(function (item) {
            return item.id === 'MyRR';
        }).length, 1);
    });
});
