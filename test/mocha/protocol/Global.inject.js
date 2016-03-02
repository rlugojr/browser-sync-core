var assert = require('chai').assert;
var proto  = require('../../../dist/protocol');

function runOne (arg) {
    return proto.validate('Global.inject', arg);
}

describe('Protocol: Global.inject', function () {
    it('can collect inject errors', function () {
        assert.equal(runOne({}).errors.length, 4);
    });
    it('can collect inject errors', function () {
        var actual = runOne({
            ext: '.css'
        });
        assert.equal(actual.errors.length, 3);
    });
    it('can collect inject errors', function () {
        var actual = runOne({
            ext: '.css',
            basename: 'styles.css'
        });
        assert.equal(actual.errors.length, 2);
    });
    it('can collect inject errors', function () {
        var actual = runOne({
            ext: '.css',
            basename: 'styles.css',
            item: {},
            path: './aspp.js'
        });
        assert.equal(actual.errors.length, 0);
    });
    it('can collect inject errors', function () {
        var actual = runOne({
            ext: '.css',
            basename: 'styles.css',
            item: {
                locator: {}
            }
        });
        assert.equal(actual.errors.length, 5);
    });
    it('can collect inject errors', function () {
        var actual = runOne({
            ext: '.css',
            basename: 'styles.css',
            item: {
                locator: {
                    source: '(.+)?.css'
                }
            }
        });
        assert.equal(actual.errors.length, 4);
    });
    it('can collect inject errors', function () {
        var actual = runOne({
            ext: '.css',
            basename: 'styles.css',
            item: {
                locator: {
                    source: '(.+)?.css',
                    global: true
                }
            }
        });
        assert.equal(actual.errors.length, 3);
        assert.equal(actual.errors[0].name, 'path');
        assert.equal(actual.errors[1].name, 'ignoreCase');
        assert.equal(actual.errors[2].name, 'multiline');
    });
    it('can collect inject errors', function () {
        var actual = runOne({ event: 'change',
            path: 'test/fixtures/css/styles.css',
            namespace: 'core',
            item: {
                match: 'test/fixtures/**/*.css',
                locator: {
                    source: 'styles(.+?)?\\.css$',
                    global: false,
                    ignoreCase: false,
                    multiline: false
                },
                options: {},
                namespace: 'core'
            },
            ext: '.css',
            basename: 'styles.css',
            type: 'inject'
        });
        assert.equal(actual.errors.length, 0);
    });
    it('can collect payload errors', function () {
        var actual = runOne({ event: 'change',
            path: 'test/fixtures/css/styles.css',
            namespace: 'core',
            item: {
                locator: {
                    source: 'styles(.+?)?\\.css$',
                    global: false,
                    ignoreCase: false,
                    multiline: true
                }
            },
            ext: '.css',
            basename: 'styles.css'
        });
        assert.equal(actual.payload.args.file.item.locator.source,     'styles(.+?)?\\.css$');
        assert.equal(actual.payload.args.file.item.locator.global,     false);
        assert.equal(actual.payload.args.file.item.locator.ignoreCase, false);
        assert.equal(actual.payload.args.file.item.locator.multiline,  true);
    });
});
