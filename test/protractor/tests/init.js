describe('Running E2E tests', function() {
    beforeEach(function () {
        browser.ignoreSynchronization = true;
    });
    it('Can run', function () {
        browser.get('http://www.google.com');
        expect(browser.getCurrentUrl()).toContain('google');
    });
});