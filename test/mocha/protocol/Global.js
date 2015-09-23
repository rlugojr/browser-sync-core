var assert = require('chai').assert;
var proto  = require('../../../lib/protocol');

function runOne (arg) {
    return proto.send('Global.inject', arg);
}

describe('Protocol: Global', function () {
    //it('can collect inject errors', function () {
    //    assert.equal(runOne({}).errors.length, 3);
    //});
    //it('can collect inject errors', function () {
    //    var actual = runOne({
    //        ext: '.css'
    //    });
    //    assert.equal(actual.errors.length, 2);
    //});
    //it('can collect inject errors', function () {
    //    var actual = runOne({
    //        ext: '.css',
    //        basename: 'styles.css'
    //    });
    //    assert.equal(actual.errors.length, 1);
    //});
    //it('can collect inject errors', function () {
    //    var actual = runOne({
    //        ext: '.css',
    //        basename: 'styles.css',
    //        item: {}
    //    });
    //    assert.equal(actual.errors.length, 0);
    //});
    //it('can collect inject errors', function () {
    //    var actual = runOne({
    //        ext: '.css',
    //        basename: 'styles.css',
    //        item: {
    //            locator: {}
    //        }
    //    });
    //    assert.equal(actual.errors.length, 4);
    //});
    //it('can collect inject errors', function () {
    //    var actual = runOne({
    //        ext: '.css',
    //        basename: 'styles.css',
    //        item: {
    //            locator: {
    //                source: '(.+)?.css'
    //            }
    //        }
    //    });
    //    assert.equal(actual.errors.length, 3);
    //});
    it.only('can collect inject errors', function () {
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
        console.log(actual);
    });
});