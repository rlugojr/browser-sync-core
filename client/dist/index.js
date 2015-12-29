(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var socket = require("./socket");
var emitter = require("./emitter");
var notify = require("./notify");
var utils = require("./browser.utils");
var merge = require("lodash.merge");
var objGet = require("lodash.get");
var storage = require("./store");

/**
 * @constructor
 */
var BrowserSync = function BrowserSync(options) {

    this.options = options;
    this.socket = socket;
    this.emitter = emitter;
    this.utils = utils;
    this.store = storage.create(options.sessionId);
    var _this = this;

    var bs = this;

    if (!this.store.get('client')) {
        this.store.set('client', {
            id: this.socket.socket.id
        });
    }

    var currentId = this.store.get('client.id');

    bs.register();

    socket.on('Options.set', function (data) {
        if (data.id === currentId) {
            console.log('received', data.options);
            merge(_this.options, data.options);
        }
    });

    socket.on('reconnect', function () {
        utils.reloadBrowser();
    });

    var resizing = false;
    var timeout = 1000;
    var int;

    utils.getWindow().addEventListener('resize', function () {
        if (!resizing) {
            resizing = true;
            int = setTimeout(function () {
                resizing = false;
                clearTimeout(int);
                bs.register();
            }, timeout);
        }
    });
};

/**
 *
 */
BrowserSync.prototype.register = function () {

    var bs = this;
    var options = this.options;

    /**
     * As per protocol, send 'client' + optional data
     */
    socket.emit('Client.register', {
        client: bs.store.get('client'),
        data: {
            hash: utils.getWindow().location.hash,
            sessionId: options.sessionId,
            socketId: bs.socket.socket.id,
            browser: {
                scroll: utils.getBrowserScrollPosition(),
                dimensions: {
                    width: utils.getDocument().documentElement.scrollWidth,
                    height: utils.getDocument().documentElement.scrollHeight
                }
            }
        }
    });
};

/**
 * Helper to check if syncing is allowed
 * @param data
 * @param optPath
 * @returns {boolean}
 */
BrowserSync.prototype.canSync = function (data, optPath) {

    data = data || {};

    if (data.override) {
        return true;
    }

    var canSync = true;

    if (optPath) {
        canSync = this.getOption(optPath);
    }

    return canSync && data.url === window.location.pathname;
};

/**
 * Helper to check if syncing is allowed
 * @returns {boolean}
 */
BrowserSync.prototype.getOption = function (path) {
    return objGet(this.options, path);
};

/**
 * @type {Function}
 */
module.exports = BrowserSync;

},{"./browser.utils":2,"./emitter":5,"./notify":16,"./socket":17,"./store":18,"lodash.get":19,"lodash.merge":23}],2:[function(require,module,exports){
"use strict";

var utils = exports;
var emitter = require('./emitter');

/**
 * @returns {window}
 */
utils.getWindow = function () {
    return window;
};

/**
 *
 * @returns {HTMLDocument}
 */
utils.getDocument = function () {
    return document;
};

/**
 * Get the current x/y position crossbow
 * @returns {{x: *, y: *}}
 */
utils.getBrowserScrollPosition = function () {

    var $window = exports.getWindow();
    var $document = exports.getDocument();
    var scrollX;
    var scrollY;
    var dElement = $document.documentElement;
    var dBody = $document.body;

    if ($window.pageYOffset !== undefined) {
        scrollX = $window.pageXOffset;
        scrollY = $window.pageYOffset;
    } else {
        scrollX = dElement.scrollLeft || dBody.scrollLeft || 0;
        scrollY = dElement.scrollTop || dBody.scrollTop || 0;
    }

    return {
        x: scrollX,
        y: scrollY
    };
};

/**
 * @returns {{x: number, y: number}}
 */
utils.getScrollSpace = function () {
    var $document = exports.getDocument();
    var dElement = $document.documentElement;
    var dBody = $document.body;
    return {
        x: dBody.scrollHeight - dElement.clientWidth,
        y: dBody.scrollHeight - dElement.clientHeight
    };
};

/**
 * Saves scroll position into cookies
 */
utils.saveScrollPosition = function () {
    var pos = utils.getBrowserScrollPosition();
    pos = [pos.x, pos.y];
    utils.getDocument.cookie = "bs_scroll_pos=" + pos.join(",");
};

/**
 * Restores scroll position from cookies
 */
utils.restoreScrollPosition = function () {
    var pos = utils.getDocument().cookie.replace(/(?:(?:^|.*;\s*)bs_scroll_pos\s*\=\s*([^;]*).*$)|^.*$/, "$1").split(",");
    utils.getWindow().scrollTo(pos[0], pos[1]);
};

/**
 * @param tagName
 * @param elem
 * @returns {*|number}
 */
utils.getElementIndex = function (tagName, elem) {
    var allElems = utils.getDocument().getElementsByTagName(tagName);
    return Array.prototype.indexOf.call(allElems, elem);
};

/**
 * Force Change event on radio & checkboxes (IE)
 */
utils.forceChange = function (elem) {
    elem.blur();
    elem.focus();
};

/**
 * @param elem
 * @returns {{tagName: (elem.tagName|*), index: *}}
 */
utils.getElementData = function (elem) {
    var tagName = elem.tagName;
    var index = utils.getElementIndex(tagName, elem);
    return {
        tagName: tagName,
        index: index
    };
};

/**
 * @param {string} tagName
 * @param {number} index
 */
utils.getSingleElement = function (tagName, index) {
    var elems = utils.getDocument().getElementsByTagName(tagName);
    return elems[index];
};

/**
 * Get the body element
 */
utils.getBody = function () {
    return utils.getDocument().getElementsByTagName("body")[0];
};

/**
 * @param {{x: number, y: number}} pos
 */
utils.setScroll = function (pos) {
    utils.getWindow().scrollTo(pos.x, pos.y);
};

/**
 * Hard reload
 */
utils.reloadBrowser = function () {
    emitter.emit("browser:hardReload");
    utils.getWindow().location.reload(true);
};

/**
 * Foreach polyfill
 * @param coll
 * @param fn
 */
utils.forEach = function (coll, fn) {
    for (var i = 0, n = coll.length; i < n; i += 1) {
        fn(coll[i], i, coll);
    }
};

/**
 * Are we dealing with old IE?
 * @returns {boolean}
 */
utils.isOldIe = function () {
    return typeof utils.getWindow().attachEvent !== "undefined";
};

},{"./emitter":5}],3:[function(require,module,exports){
"use strict";

if (!("indexOf" in Array.prototype)) {

    Array.prototype.indexOf = function (find, i) {
        if (i === undefined) {
            i = 0;
        }
        if (i < 0) {
            i += this.length;
        }
        if (i < 0) {
            i = 0;
        }
        for (var n = this.length; i < n; i += 1) {
            if (i in this && this[i] === find) {
                return i;
            }
        }
        return -1;
    };
}

},{}],4:[function(require,module,exports){
"use strict";

var events = require("./events");
var utils = require("./browser.utils");
var emitter = require("./emitter");
var sync = exports;

var options = {

    tagNames: {
        "css": "link",
        "jpg": "img",
        "jpeg": "img",
        "png": "img",
        "svg": "img",
        "gif": "img",
        "js": "script"
    },
    attrs: {
        "link": "href",
        "img": "src",
        "script": "src"
    }
};

var hiddenElem;
var OPT_PATH = "codeSync";

var current = function current() {
    return window.location.pathname;
};

/**
 * @param {BrowserSync} bs
 */
sync.init = function (bs) {

    if (bs.options.tagNames) {
        options.tagNames = bs.options.tagNames;
    }

    if (bs.options.scrollRestoreTechnique === "window.name") {
        //sync.saveScrollInName(bs);
    } else {
            sync.saveScrollInCookie(utils.getWindow(), utils.getDocument());
        }

    bs.socket.on("Global.inject", sync.reload(bs));
    bs.socket.on("Global.reload", function (hard) {
        //console.log(hard);
        if (bs.canSync({ url: current() }, OPT_PATH)) {
            sync.reloadBrowser(hard, bs);
        }
    });
};

/**
 * Use window.name to store/restore scroll position
 */
sync.saveScrollInName = function () {

    var $window = utils.getWindow();
    var saved = {};

    /**
     * Register the save event for whenever we call
     * a hard reload
     */
    emitter.on("browser:hardReload", function () {
        $window.name = $window.name + "bs=" + JSON.stringify({
            bs: {
                hardReload: true,
                scroll: utils.getBrowserScrollPosition()
            }
        });
    });

    /**
     * window.name is always a string, even when never set.
     */
    try {
        var json = $window.name.match(/bs=(.+)$/);
        if (json) {
            saved = JSON.parse(json[1]);
        }
    } catch (e) {
        saved = {};
    }

    /**
     * if the JSON was parsed correctly, try to
     * find a scroll property and restore it.
     */
    if (saved.bs && saved.bs.hardReload && saved.bs.scroll) {
        utils.setScroll(saved.bs.scroll);
    }

    console.log($window.name);

    $window.name = "";
};

/**
 * Use a cookie-drop to save scroll position of
 * @param $window
 * @param $document
 */
sync.saveScrollInCookie = function ($window, $document) {

    if (!utils.isOldIe()) {
        return;
    }

    if ($document.readyState === "complete") {
        utils.restoreScrollPosition();
    } else {
        events.manager.addEvent($document, "readystatechange", function () {
            if ($document.readyState === "complete") {
                utils.restoreScrollPosition();
            }
        });
    }

    emitter.on("browser:hardReload", utils.saveScrollPosition);
};

/**
 * @param elem
 * @param attr
 * @param options
 * @returns {{elem: HTMLElement, timeStamp: number}}
 */
sync.swapFile = function (elem, attr, options) {

    var currentValue = elem[attr];
    var timeStamp = new Date().getTime();
    var suffix = "?rel=" + timeStamp;

    var justUrl = sync.getFilenameOnly(currentValue);

    if (justUrl) {
        currentValue = justUrl[0];
    }

    if (options) {
        if (!options.timestamps) {
            suffix = "";
        }
    }

    elem[attr] = currentValue + suffix;

    var body = document.body;

    setTimeout(function () {
        if (!hiddenElem) {
            hiddenElem = document.createElement("DIV");
            body.appendChild(hiddenElem);
        } else {
            hiddenElem.style.display = "none";
            hiddenElem.style.display = "block";
        }
    }, 200);

    return {
        elem: elem,
        timeStamp: timeStamp
    };
};

sync.getFilenameOnly = function (url) {
    return (/^[^\?]+(?=\?)/.exec(url)
    );
};

/**
 * @param {BrowserSync} bs
 * @returns {*}
 */
sync.reload = function (bs) {

    /**
     * @param data - from socket
     */
    return function (data) {

        if (!bs.canSync({ url: current() }, OPT_PATH)) {
            return;
        }
        var transformedElem;
        var options = bs.options;
        var emitter = bs.emitter;
        var file = data.file;

        var domData = sync.getElems(file.ext);
        var elems = sync.getMatches(domData.elems, file.basename, domData.attr);

        if (elems.length && options.notify) {
            emitter.emit("notify", { message: "Injected: " + file.basename });
        }

        for (var i = 0, n = elems.length; i < n; i += 1) {
            transformedElem = sync.swapFile(elems[i], domData.attr, options);
        }

        return transformedElem;
    };
};

/**
 * @param fileExtension
 * @returns {*}
 */
sync.getTagName = function (fileExtension) {
    return options.tagNames[fileExtension];
};

/**
 * @param tagName
 * @returns {*}
 */
sync.getAttr = function (tagName) {
    return options.attrs[tagName];
};

/**
 * @param elems
 * @param url
 * @param attr
 * @returns {Array}
 */
sync.getMatches = function (elems, url, attr) {

    if (url[0] === "*") {
        return elems;
    }

    var matches = [];

    for (var i = 0, len = elems.length; i < len; i += 1) {
        if (elems[i][attr].indexOf(url) !== -1) {
            matches.push(elems[i]);
        }
    }

    return matches;
};

/**
 * @param fileExtension
 * @returns {{elems: NodeList, attr: *}}
 */
sync.getElems = function (fileExtension) {

    var tagName = sync.getTagName(fileExtension);
    var attr = sync.getAttr(tagName);

    return {
        elems: document.getElementsByTagName(tagName),
        attr: attr
    };
};

/**
 * @param confirm
 */
sync.reloadBrowser = function (confirm) {
    if (confirm) {
        utils.reloadBrowser();
    }
};

},{"./browser.utils":2,"./emitter":5,"./events":6}],5:[function(require,module,exports){
"use strict";

exports.events = {};

/**
 * @param name
 * @param data
 */
exports.emit = function (name, data) {
    var event = exports.events[name];
    var listeners;
    if (event && event.listeners) {
        listeners = event.listeners;
        for (var i = 0, n = listeners.length; i < n; i += 1) {
            listeners[i](data);
        }
    }
};

/**
 * @param name
 * @param func
 */
exports.on = function (name, func) {
    var events = exports.events;
    if (!events[name]) {
        events[name] = {
            listeners: [func]
        };
    } else {
        events[name].listeners.push(func);
    }
};

},{}],6:[function(require,module,exports){
"use strict";

exports._ElementCache = function () {

    var cache = {},
        guidCounter = 1,
        expando = "data" + new Date().getTime();

    this.getData = function (elem) {
        var guid = elem[expando];
        if (!guid) {
            guid = elem[expando] = guidCounter++;
            cache[guid] = {};
        }
        return cache[guid];
    };

    this.removeData = function (elem) {
        var guid = elem[expando];
        if (!guid) return;
        delete cache[guid];
        try {
            delete elem[expando];
        } catch (e) {
            if (elem.removeAttribute) {
                elem.removeAttribute(expando);
            }
        }
    };
};

/**
 * Fix an event
 * @param event
 * @returns {*}
 */
exports._fixEvent = function (event) {

    function returnTrue() {
        return true;
    }

    function returnFalse() {
        return false;
    }

    if (!event || !event.stopPropagation) {
        var old = event || window.event;

        // Clone the old object so that we can modify the values
        event = {};

        for (var prop in old) {
            event[prop] = old[prop];
        }

        // The event occurred on this element
        if (!event.target) {
            event.target = event.srcElement || document;
        }

        // Handle which other element the event is related to
        event.relatedTarget = event.fromElement === event.target ? event.toElement : event.fromElement;

        // Stop the default browser action
        event.preventDefault = function () {
            event.returnValue = false;
            event.isDefaultPrevented = returnTrue;
        };

        event.isDefaultPrevented = returnFalse;

        // Stop the event from bubbling
        event.stopPropagation = function () {
            event.cancelBubble = true;
            event.isPropagationStopped = returnTrue;
        };

        event.isPropagationStopped = returnFalse;

        // Stop the event from bubbling and executing other handlers
        event.stopImmediatePropagation = function () {
            this.isImmediatePropagationStopped = returnTrue;
            this.stopPropagation();
        };

        event.isImmediatePropagationStopped = returnFalse;

        // Handle mouse position
        if (event.clientX != null) {
            var doc = document.documentElement,
                body = document.body;

            event.pageX = event.clientX + (doc && doc.scrollLeft || body && body.scrollLeft || 0) - (doc && doc.clientLeft || body && body.clientLeft || 0);
            event.pageY = event.clientY + (doc && doc.scrollTop || body && body.scrollTop || 0) - (doc && doc.clientTop || body && body.clientTop || 0);
        }

        // Handle key presses
        event.which = event.charCode || event.keyCode;

        // Fix button for mouse clicks:
        // 0 == left; 1 == middle; 2 == right
        if (event.button != null) {
            event.button = event.button & 1 ? 0 : event.button & 4 ? 1 : event.button & 2 ? 2 : 0;
        }
    }

    return event;
};

/**
 * @constructor
 */
exports._EventManager = function (cache) {

    var nextGuid = 1;

    this.addEvent = function (elem, type, fn) {

        var data = cache.getData(elem);

        if (!data.handlers) data.handlers = {};

        if (!data.handlers[type]) data.handlers[type] = [];

        if (!fn.guid) fn.guid = nextGuid++;

        data.handlers[type].push(fn);

        if (!data.dispatcher) {
            data.disabled = false;
            data.dispatcher = function (event) {

                if (data.disabled) return;
                event = exports._fixEvent(event);

                var handlers = data.handlers[event.type];
                if (handlers) {
                    for (var n = 0; n < handlers.length; n++) {
                        handlers[n].call(elem, event);
                    }
                }
            };
        }

        if (data.handlers[type].length == 1) {
            if (document.addEventListener) {
                elem.addEventListener(type, data.dispatcher, false);
            } else if (document.attachEvent) {
                elem.attachEvent("on" + type, data.dispatcher);
            }
        }
    };

    function tidyUp(elem, type) {

        function isEmpty(object) {
            for (var prop in object) {
                return false;
            }
            return true;
        }

        var data = cache.getData(elem);

        if (data.handlers[type].length === 0) {

            delete data.handlers[type];

            if (document.removeEventListener) {
                elem.removeEventListener(type, data.dispatcher, false);
            } else if (document.detachEvent) {
                elem.detachEvent("on" + type, data.dispatcher);
            }
        }

        if (isEmpty(data.handlers)) {
            delete data.handlers;
            delete data.dispatcher;
        }

        if (isEmpty(data)) {
            cache.removeData(elem);
        }
    }

    this.removeEvent = function (elem, type, fn) {

        var data = cache.getData(elem);

        if (!data.handlers) return;

        var removeType = function removeType(t) {
            data.handlers[t] = [];
            tidyUp(elem, t);
        };

        if (!type) {
            for (var t in data.handlers) {
                removeType(t);
            }return;
        }

        var handlers = data.handlers[type];
        if (!handlers) return;

        if (!fn) {
            removeType(type);
            return;
        }

        if (fn.guid) {
            for (var n = 0; n < handlers.length; n++) {
                if (handlers[n].guid === fn.guid) {
                    handlers.splice(n--, 1);
                }
            }
        }
        tidyUp(elem, type);
    };

    this.proxy = function (context, fn) {
        if (!fn.guid) {
            fn.guid = nextGuid++;
        }
        var ret = function ret() {
            return fn.apply(context, arguments);
        };
        ret.guid = fn.guid;
        return ret;
    };
};

/**
 * Trigger a click on an element
 * @param elem
 */
exports.triggerClick = function (elem) {

    var evObj;

    if (document.createEvent) {
        window.setTimeout(function () {
            evObj = document.createEvent("MouseEvents");
            evObj.initEvent("click", true, true);
            elem.dispatchEvent(evObj);
        }, 0);
    } else {
        window.setTimeout(function () {
            if (document.createEventObject) {
                evObj = document.createEventObject();
                evObj.cancelBubble = true;
                elem.fireEvent("on" + "click", evObj);
            }
        }, 0);
    }
};

var cache = new exports._ElementCache();
var eventManager = new exports._EventManager(cache);

eventManager.triggerClick = exports.triggerClick;

exports.manager = eventManager;

},{}],7:[function(require,module,exports){
"use strict";

/**
 * This is the plugin for syncing clicks between browsers
 * @type {string}
 */

var EVENT_NAME = "click";
var OPT_PATH = "ghostMode.clicks";
exports.canEmitEvents = true;

/**
 * @param {BrowserSync} bs
 * @param eventManager
 */
exports.init = function (bs, eventManager) {
    eventManager.addEvent(document.body, EVENT_NAME, exports.browserEvent(bs));
    bs.socket.on(EVENT_NAME, exports.socketEvent(bs, eventManager));
};

/**
 * Uses event delegation to determine the clicked element
 * @param {BrowserSync} bs
 * @returns {Function}
 */
exports.browserEvent = function (bs) {

    return function (event) {

        if (exports.canEmitEvents) {

            var elem = event.target || event.srcElement;

            if (elem.type === "checkbox" || elem.type === "radio") {
                bs.utils.forceChange(elem);
                return;
            }

            bs.socket.emit(EVENT_NAME, bs.utils.getElementData(elem));
        } else {
            exports.canEmitEvents = true;
        }
    };
};

/**
 * @param {BrowserSync} bs
 * @param {manager} eventManager
 * @returns {Function}
 */
exports.socketEvent = function (bs, eventManager) {

    return function (data) {

        if (!bs.canSync(data, OPT_PATH)) {
            return false;
        }

        var elem = bs.utils.getSingleElement(data.tagName, data.index);

        if (elem) {
            exports.canEmitEvents = false;
            eventManager.triggerClick(elem);
        }
    };
};

},{}],8:[function(require,module,exports){
"use strict";

/**
 * This is the plugin for syncing clicks between browsers
 * @type {string}
 */

var EVENT_NAME = "input:text";
var OPT_PATH = "ghostMode.forms.inputs";
exports.canEmitEvents = true;

/**
 * @param {BrowserSync} bs
 * @param eventManager
 */
exports.init = function (bs, eventManager) {
    eventManager.addEvent(document.body, "keyup", exports.browserEvent(bs));
    bs.socket.on(EVENT_NAME, exports.socketEvent(bs, eventManager));
};

/**
 * @param {BrowserSync} bs
 * @returns {Function}
 */
exports.browserEvent = function (bs) {

    return function (event) {

        var elem = event.target || event.srcElement;
        var data;

        if (exports.canEmitEvents) {

            if (elem.tagName === "INPUT" || elem.tagName === "TEXTAREA") {

                data = bs.utils.getElementData(elem);
                data.value = elem.value;

                bs.socket.emit(EVENT_NAME, data);
            }
        } else {
            exports.canEmitEvents = true;
        }
    };
};

/**
 * @param {BrowserSync} bs
 * @returns {Function}
 */
exports.socketEvent = function (bs) {

    return function (data) {

        if (!bs.canSync(data, OPT_PATH)) {
            return false;
        }

        var elem = bs.utils.getSingleElement(data.tagName, data.index);

        if (elem) {
            elem.value = data.value;
            return elem;
        }

        return false;
    };
};

},{}],9:[function(require,module,exports){
"use strict";

exports.plugins = {
    "inputs": require("./ghostmode.forms.input"),
    "toggles": require("./ghostmode.forms.toggles"),
    "submit": require("./ghostmode.forms.submit")
};

/**
 * Load plugins for enabled options
 * @param bs
 */
exports.init = function (bs, eventManager) {

    var checkOpt = true;
    var options = bs.options.ghostMode.forms;

    if (options === true) {
        checkOpt = false;
    }

    function init(name) {
        exports.plugins[name].init(bs, eventManager);
    }

    for (var name in exports.plugins) {
        if (!checkOpt) {
            init(name);
        } else {
            if (options[name]) {
                init(name);
            }
        }
    }
};

},{"./ghostmode.forms.input":8,"./ghostmode.forms.submit":10,"./ghostmode.forms.toggles":11}],10:[function(require,module,exports){
"use strict";

/**
 * This is the plugin for syncing clicks between browsers
 * @type {string}
 */

var EVENT_NAME = "form:submit";
var OPT_PATH = "ghostMode.forms.submit";
exports.canEmitEvents = true;

/**
 * @param {BrowserSync} bs
 * @param eventManager
 */
exports.init = function (bs, eventManager) {
    var browserEvent = exports.browserEvent(bs);
    eventManager.addEvent(document.body, "submit", browserEvent);
    eventManager.addEvent(document.body, "reset", browserEvent);
    bs.socket.on(EVENT_NAME, exports.socketEvent(bs, eventManager));
};

/**
 * @param {BrowserSync} bs
 * @returns {Function}
 */
exports.browserEvent = function (bs) {

    return function (event) {
        if (exports.canEmitEvents) {
            var elem = event.target || event.srcElement;
            var data = bs.utils.getElementData(elem);
            data.type = event.type;
            bs.socket.emit(EVENT_NAME, data);
        } else {
            exports.canEmitEvents = true;
        }
    };
};

/**
 * @param {BrowserSync} bs
 * @returns {Function}
 */
exports.socketEvent = function (bs) {

    return function (data) {

        if (!bs.canSync(data, OPT_PATH)) {
            return false;
        }

        var elem = bs.utils.getSingleElement(data.tagName, data.index);

        exports.canEmitEvents = false;

        if (elem && data.type === "submit") {
            elem.submit();
        }

        if (elem && data.type === "reset") {
            elem.reset();
        }
        return false;
    };
};

},{}],11:[function(require,module,exports){
"use strict";

/**
 * This is the plugin for syncing clicks between browsers
 * @type {string}
 */

var EVENT_NAME = "input:toggles";
var OPT_PATH = "ghostMode.forms.toggles";
exports.canEmitEvents = true;

/**
 * @param {BrowserSync} bs
 * @param eventManager
 */
exports.init = function (bs, eventManager) {
    var browserEvent = exports.browserEvent(bs);
    exports.addEvents(eventManager, browserEvent);
    bs.socket.on(EVENT_NAME, exports.socketEvent(bs, eventManager));
};

/**
 * @param eventManager
 * @param event
 */
exports.addEvents = function (eventManager, event) {

    var elems = document.getElementsByTagName("select");
    var inputs = document.getElementsByTagName("input");

    addEvents(elems);
    addEvents(inputs);

    function addEvents(domElems) {
        for (var i = 0, n = domElems.length; i < n; i += 1) {
            eventManager.addEvent(domElems[i], "change", event);
        }
    }
};

/**
 * @param {BrowserSync} bs
 * @returns {Function}
 */
exports.browserEvent = function (bs) {

    return function (event) {

        if (exports.canEmitEvents) {
            var elem = event.target || event.srcElement;
            var data;
            if (elem.type === "radio" || elem.type === "checkbox" || elem.tagName === "SELECT") {
                data = bs.utils.getElementData(elem);
                data.type = elem.type;
                data.value = elem.value;
                data.checked = elem.checked;
                bs.socket.emit(EVENT_NAME, data);
            }
        } else {
            exports.canEmitEvents = true;
        }
    };
};

/**
 * @param {BrowserSync} bs
 * @returns {Function}
 */
exports.socketEvent = function (bs) {

    return function (data) {

        if (!bs.canSync(data, OPT_PATH)) {
            return false;
        }

        exports.canEmitEvents = false;

        var elem = bs.utils.getSingleElement(data.tagName, data.index);

        if (elem) {
            if (data.type === "radio") {
                elem.checked = true;
            }
            if (data.type === "checkbox") {
                elem.checked = data.checked;
            }
            if (data.tagName === "SELECT") {
                elem.value = data.value;
            }
            return elem;
        }
        return false;
    };
};

},{}],12:[function(require,module,exports){
"use strict";

var eventManager = require("./events").manager;

exports.plugins = {
    "scroll": require("./ghostmode.scroll"),
    "clicks": require("./ghostmode.clicks"),
    "forms": require("./ghostmode.forms"),
    "location": require("./ghostmode.location")
};

/**
 * Load plugins for enabled options
 * @param bs
 */
exports.init = function (bs) {
    for (var name in exports.plugins) {
        exports.plugins[name].init(bs, eventManager);
    }
};

},{"./events":6,"./ghostmode.clicks":7,"./ghostmode.forms":9,"./ghostmode.location":13,"./ghostmode.scroll":14}],13:[function(require,module,exports){
"use strict";

/**
 * This is the plugin for syncing location
 * @type {string}
 */

var EVENT_NAME = "browser:location";
var OPT_PATH = "ghostMode.location";
exports.canEmitEvents = true;

/**
 * @param {BrowserSync} bs
 */
exports.init = function (bs) {
    bs.socket.on(EVENT_NAME, exports.socketEvent(bs));
};

/**
 * Respond to socket event
 */
exports.socketEvent = function (bs) {

    return function (data) {

        if (!bs.canSync(data, OPT_PATH)) {
            return false;
        }

        if (data.path) {
            exports.setPath(data.path);
            /**
             * When the path contains a hash, we're
             * not reloading, but we do want to register again
             * so that subscribers see the new location
             */
            if (data.path.match(/#/)) {
                bs.register();
            }
        } else {
            exports.setUrl(data.url);
        }
    };
};

/**
 * @param url
 */
exports.setUrl = function (url) {
    window.location = url;
};

/**
 * @param path
 */
exports.setPath = function (path) {
    window.location = window.location.protocol + "//" + window.location.host + path;
};

},{}],14:[function(require,module,exports){
"use strict";

/**
 * This is the plugin for syncing scroll between devices
 * @type {string}
 */

var WINDOW_EVENT_NAME = "scroll";
var ELEMENT_EVENT_NAME = "scroll:element";
var OPT_PATH = "ghostMode.scroll";
var utils;

exports.canEmitEvents = true;

/**
 * @param {BrowserSync} bs
 * @param eventManager
 */
exports.init = function (bs, eventManager) {
    utils = bs.utils;
    var opts = bs.options;

    /**
     * Window Scroll events
     */
    eventManager.addEvent(window, WINDOW_EVENT_NAME, exports.browserEvent(bs));
    bs.socket.on(WINDOW_EVENT_NAME, exports.socketEvent(bs));

    /**
     * element Scroll Events
     */
    var cache = {};
    addElementScrollEvents("scrollElements", false);
    addElementScrollEvents("scrollElementMapping", true);
    bs.socket.on(ELEMENT_EVENT_NAME, exports.socketEventForElement(bs, cache));

    function addElementScrollEvents(key, map) {
        if (!opts[key] || !opts[key].length || !("querySelectorAll" in document)) {
            return;
        }
        utils.forEach(opts[key], function (selector) {
            var elems = document.querySelectorAll(selector) || [];
            utils.forEach(elems, function (elem) {
                var data = utils.getElementData(elem);
                data.cacheSelector = data.tagName + ":" + data.index;
                data.map = map;
                cache[data.cacheSelector] = elem;
                eventManager.addEvent(elem, WINDOW_EVENT_NAME, exports.browserEventForElement(bs, elem, data));
            });
        });
    }
};

/**
 * @param {BrowserSync} bs
 */
exports.socketEvent = function (bs) {

    return function (data) {

        if (!bs.canSync(data, OPT_PATH)) {
            return false;
        }

        var scrollSpace = utils.getScrollSpace();

        exports.canEmitEvents = false;

        if (bs.options && bs.options.scrollProportionally) {
            return window.scrollTo(0, scrollSpace.y * data.position.proportional); // % of y axis of scroll to px
        } else {
                return window.scrollTo(0, data.position.raw);
            }
    };
};

/**
 * @param bs
 */
exports.socketEventForElement = function (bs, cache) {
    return function (data) {

        if (!bs.canSync(data, OPT_PATH)) {
            return false;
        }

        exports.canEmitEvents = false;

        function scrollOne(selector, pos) {
            if (cache[selector]) {
                cache[selector].scrollTop = pos;
            }
        }

        if (data.map) {
            return Object.keys(cache).forEach(function (key) {
                scrollOne(key, data.position);
            });
        }

        scrollOne(data.elem.cacheSelector, data.position);
    };
};

/**
 * @param bs
 */
exports.browserEventForElement = function (bs, elem, data) {
    return function () {
        var canSync = exports.canEmitEvents;
        if (canSync) {
            bs.socket.emit(ELEMENT_EVENT_NAME, {
                position: elem.scrollTop,
                elem: data,
                map: data.map
            });
        }
        exports.canEmitEvents = true;
    };
};

exports.browserEvent = function (bs) {

    return function () {

        var canSync = exports.canEmitEvents;

        if (canSync) {
            bs.socket.emit(WINDOW_EVENT_NAME, {
                position: exports.getScrollPosition()
            });
        }

        exports.canEmitEvents = true;
    };
};

/**
 * @returns {{raw: number, proportional: number}}
 */
exports.getScrollPosition = function () {
    var pos = utils.getBrowserScrollPosition();
    return {
        raw: pos, // Get px of y axis of scroll
        proportional: exports.getScrollTopPercentage(pos) // Get % of y axis of scroll
    };
};

/**
 * @param {{x: number, y: number}} scrollSpace
 * @param scrollPosition
 * @returns {{x: number, y: number}}
 */
exports.getScrollPercentage = function (scrollSpace, scrollPosition) {

    var x = scrollPosition.x / scrollSpace.x;
    var y = scrollPosition.y / scrollSpace.y;

    return {
        x: x || 0,
        y: y
    };
};

/**
 * Get just the percentage of Y axis of scroll
 * @returns {number}
 */
exports.getScrollTopPercentage = function (pos) {
    var scrollSpace = utils.getScrollSpace();
    var percentage = exports.getScrollPercentage(scrollSpace, pos);
    return percentage.y;
};

},{}],15:[function(require,module,exports){
"use strict";

var socket = require("./socket");
var shims = require("./client-shims");
var notify = require("./notify");
var codeSync = require("./code-sync");
var BrowserSync = require("./browser-sync");
var ghostMode = require("./ghostmode");
var emitter = require("./emitter");
var events = require("./events");
var utils = require("./browser.utils");

var shouldReload = false;
var initialised = false;

/**
 * @param options
 */
exports.init = function (options) {
    if (shouldReload && options.reloadOnRestart) {
        utils.reloadBrowser();
    }

    var BS = window.___browserSync___ || {};

    if (!BS.client) {

        BS.client = true;

        var browserSync = new BrowserSync(options);

        // Always init on page load
        ghostMode.init(browserSync);
        codeSync.init(browserSync);

        notify.init(browserSync);

        if (options.notify) {
            notify.flash("Connected to BrowserSync as " + browserSync.store.get('client.id'));
        }
    }

    if (!initialised) {
        socket.on("disconnect", function () {
            if (options.notify) {
                notify.flash("Disconnected from BrowserSync");
            }
            shouldReload = true;
        });
        initialised = true;
    }
};

/**
 * Handle individual socket connections
 */
socket.on("connection", exports.init);

},{"./browser-sync":1,"./browser.utils":2,"./client-shims":3,"./code-sync":4,"./emitter":5,"./events":6,"./ghostmode":12,"./notify":16,"./socket":17}],16:[function(require,module,exports){
"use strict";

var scroll = require("./ghostmode.scroll");

var styles = ["display: none", "padding: 15px", "font-family: sans-serif", "position: fixed", "font-size: 0.9em", "z-index: 9999", "right: 0px", "top: 0px", "border-bottom-left-radius: 5px", "background-color: #1B2032", "margin: 0", "color: white", "text-align: center"];

var browserSync;
var elem;
var options;
var timeoutInt;

/**
 * @param {BrowserSync} bs
 * @returns {*}
 */
exports.init = function (bs) {

    browserSync = bs;
    options = bs.options;

    var cssStyles = styles;

    if (options.notify.styles) {
        cssStyles = options.notify.styles;
    }

    elem = document.createElement("DIV");
    elem.id = "__bs_notify__";
    elem.style.cssText = cssStyles.join(";");
    document.getElementsByTagName("body")[0].appendChild(elem);

    var flashFn = exports.watchEvent();

    browserSync.emitter.on("notify", flashFn);
    browserSync.socket.on("browser:notify", flashFn);

    return elem;
};

/**
 * @returns {Function}
 */
exports.watchEvent = function () {
    return function (data) {
        if (typeof data === "string") {
            return exports.flash(data);
        }
        exports.flash(data.message, data.timeout);
    };
};

/**
 *
 */
exports.getElem = function () {
    return elem;
};

/**
 * @returns {number|*}
 */
exports.getScrollTop = function () {
    return browserSync.utils.getBrowserScrollPosition().y;
};

/**
 * @param message
 * @param [timeout]
 * @returns {*}
 */
exports.flash = function (message, timeout) {

    var elem = exports.getElem();

    // return if notify was never initialised
    if (!elem) {
        return false;
    }

    elem.innerHTML = message;
    elem.style.display = "block";

    if (timeoutInt) {
        clearTimeout(timeoutInt);
        timeoutInt = undefined;
    }

    timeoutInt = window.setTimeout(function () {
        elem.style.display = "none";
    }, timeout || 2000);

    return elem;
};

},{"./ghostmode.scroll":14}],17:[function(require,module,exports){
"use strict";

/**
 * @type {{emit: emit, on: on}}
 */

var BS = window.___browserSync___ || {};
exports.socket = BS.socket || {
    emit: function emit() {},
    on: function on() {}
};

/**
 * @returns {string}
 */
exports.getPath = function () {
    return window.location.pathname;
};
/**
 * Alias for socket.emit
 * @param name
 * @param data
 */
exports.emit = function (name, data) {
    var socket = exports.socket;
    if (socket && socket.emit) {
        // send relative path of where the event is sent
        data.url = exports.getPath();
        socket.emit(name, data);
    }
};

/**
 * Alias for socket.on
 * @param name
 * @param func
 */
exports.on = function (name, func) {
    exports.socket.on(name, func);
};

},{}],18:[function(require,module,exports){
"use strict";

var utils = require('./browser.utils');
var $window = utils.getWindow();
var merge = require("lodash.merge");
var objGet = require("lodash.get");
var objSet = require("lodash.set");
var PREFIX = 'bs=';

function getFromName() {
    try {
        var json = $window.name.match(/bs=(.+)$/);
        if (json) {
            return JSON.parse(json[1]);
        }
    } catch (e) {
        console.log('Could not parse saved JSON');
    }

    return {};
}

function saveInName(incoming) {
    $window.name = PREFIX + JSON.stringify(incoming);
}

function wipeName() {
    $window.name = '';
}

function createFromId(id) {

    function get(path) {

        if (typeof path === 'string') {
            path = path.split('.');
        }

        var prev = getFromName();

        if (prev[id]) {
            return objGet(prev, [id].concat(path));
        }

        return undefined;
    }

    /**
     * @param path
     * @param value
     * @param mergeValues
     */
    function set(path, value, mergeValues) {

        var prev = getFromName();

        if (prev[id]) {
            var newValues = mergeValues ? merge({}, objGet(prev[id], path), value) : value;
            objSet(prev[id], path, newValues);
            saveInName(prev);
            return prev;
        } else {

            wipeName();
            var newSession = {};
            newSession[id] = objSet({}, path, value);
            saveInName(newSession);
            return newSession;
        }
    }

    return {
        get: get,
        set: set,
        merge: merge
    };
}

function create(id) {
    return createFromId(id);
}

module.exports.create = create;

},{"./browser.utils":2,"lodash.get":19,"lodash.merge":23,"lodash.set":40}],19:[function(require,module,exports){
/**
 * lodash 3.7.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var baseGet = require('lodash._baseget'),
    toPath = require('lodash._topath');

/**
 * Gets the property value of `path` on `object`. If the resolved value is
 * `undefined` the `defaultValue` is used in its place.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @param {*} [defaultValue] The value returned if the resolved value is `undefined`.
 * @returns {*} Returns the resolved value.
 * @example
 *
 * var object = { 'a': [{ 'b': { 'c': 3 } }] };
 *
 * _.get(object, 'a[0].b.c');
 * // => 3
 *
 * _.get(object, ['a', '0', 'b', 'c']);
 * // => 3
 *
 * _.get(object, 'a.b.c', 'default');
 * // => 'default'
 */
function get(object, path, defaultValue) {
  var result = object == null ? undefined : baseGet(object, toPath(path), path + '');
  return result === undefined ? defaultValue : result;
}

module.exports = get;

},{"lodash._baseget":20,"lodash._topath":21}],20:[function(require,module,exports){
/**
 * lodash 3.7.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * The base implementation of `get` without support for string paths
 * and default values.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array} path The path of the property to get.
 * @param {string} [pathKey] The key representation of path.
 * @returns {*} Returns the resolved value.
 */
function baseGet(object, path, pathKey) {
  if (object == null) {
    return;
  }
  if (pathKey !== undefined && pathKey in toObject(object)) {
    path = [pathKey];
  }
  var index = 0,
      length = path.length;

  while (object != null && index < length) {
    object = object[path[index++]];
  }
  return (index && index == length) ? object : undefined;
}

/**
 * Converts `value` to an object if it's not one.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {Object} Returns the object.
 */
function toObject(value) {
  return isObject(value) ? value : Object(value);
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = baseGet;

},{}],21:[function(require,module,exports){
/**
 * lodash 3.8.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var isArray = require('lodash.isarray');

/** Used to match property names within property paths. */
var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\n\\]|\\.)*?)\2)\]/g;

/** Used to match backslashes in property paths. */
var reEscapeChar = /\\(\\)?/g;

/**
 * Converts `value` to a string if it's not one. An empty string is returned
 * for `null` or `undefined` values.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  return value == null ? '' : (value + '');
}

/**
 * Converts `value` to property path array if it's not one.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {Array} Returns the property path array.
 */
function toPath(value) {
  if (isArray(value)) {
    return value;
  }
  var result = [];
  baseToString(value).replace(rePropName, function(match, number, quote, string) {
    result.push(quote ? string.replace(reEscapeChar, '$1') : (number || match));
  });
  return result;
}

module.exports = toPath;

},{"lodash.isarray":22}],22:[function(require,module,exports){
/**
 * lodash 3.0.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var arrayTag = '[object Array]',
    funcTag = '[object Function]';

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/* Native method references for those with the same name as other `lodash` methods. */
var nativeIsArray = getNative(Array, 'isArray');

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = object == null ? undefined : object[key];
  return isNative(value) ? value : undefined;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(function() { return arguments; }());
 * // => false
 */
var isArray = nativeIsArray || function(value) {
  return isObjectLike(value) && isLength(value.length) && objToString.call(value) == arrayTag;
};

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 equivalents which return 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (isFunction(value)) {
    return reIsNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && reIsHostCtor.test(value);
}

module.exports = isArray;

},{}],23:[function(require,module,exports){
/**
 * lodash 3.3.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var arrayCopy = require('lodash._arraycopy'),
    arrayEach = require('lodash._arrayeach'),
    createAssigner = require('lodash._createassigner'),
    isArguments = require('lodash.isarguments'),
    isArray = require('lodash.isarray'),
    isPlainObject = require('lodash.isplainobject'),
    isTypedArray = require('lodash.istypedarray'),
    keys = require('lodash.keys'),
    toPlainObject = require('lodash.toplainobject');

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * The base implementation of `_.merge` without support for argument juggling,
 * multiple sources, and `this` binding `customizer` functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @param {Function} [customizer] The function to customize merged values.
 * @param {Array} [stackA=[]] Tracks traversed source objects.
 * @param {Array} [stackB=[]] Associates values with source counterparts.
 * @returns {Object} Returns `object`.
 */
function baseMerge(object, source, customizer, stackA, stackB) {
  if (!isObject(object)) {
    return object;
  }
  var isSrcArr = isArrayLike(source) && (isArray(source) || isTypedArray(source)),
      props = isSrcArr ? undefined : keys(source);

  arrayEach(props || source, function(srcValue, key) {
    if (props) {
      key = srcValue;
      srcValue = source[key];
    }
    if (isObjectLike(srcValue)) {
      stackA || (stackA = []);
      stackB || (stackB = []);
      baseMergeDeep(object, source, key, baseMerge, customizer, stackA, stackB);
    }
    else {
      var value = object[key],
          result = customizer ? customizer(value, srcValue, key, object, source) : undefined,
          isCommon = result === undefined;

      if (isCommon) {
        result = srcValue;
      }
      if ((result !== undefined || (isSrcArr && !(key in object))) &&
          (isCommon || (result === result ? (result !== value) : (value === value)))) {
        object[key] = result;
      }
    }
  });
  return object;
}

/**
 * A specialized version of `baseMerge` for arrays and objects which performs
 * deep merges and tracks traversed objects enabling objects with circular
 * references to be merged.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @param {string} key The key of the value to merge.
 * @param {Function} mergeFunc The function to merge values.
 * @param {Function} [customizer] The function to customize merged values.
 * @param {Array} [stackA=[]] Tracks traversed source objects.
 * @param {Array} [stackB=[]] Associates values with source counterparts.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function baseMergeDeep(object, source, key, mergeFunc, customizer, stackA, stackB) {
  var length = stackA.length,
      srcValue = source[key];

  while (length--) {
    if (stackA[length] == srcValue) {
      object[key] = stackB[length];
      return;
    }
  }
  var value = object[key],
      result = customizer ? customizer(value, srcValue, key, object, source) : undefined,
      isCommon = result === undefined;

  if (isCommon) {
    result = srcValue;
    if (isArrayLike(srcValue) && (isArray(srcValue) || isTypedArray(srcValue))) {
      result = isArray(value)
        ? value
        : (isArrayLike(value) ? arrayCopy(value) : []);
    }
    else if (isPlainObject(srcValue) || isArguments(srcValue)) {
      result = isArguments(value)
        ? toPlainObject(value)
        : (isPlainObject(value) ? value : {});
    }
    else {
      isCommon = false;
    }
  }
  // Add the source value to the stack of traversed objects and associate
  // it with its merged value.
  stackA.push(srcValue);
  stackB.push(result);

  if (isCommon) {
    // Recursively merge objects and arrays (susceptible to call stack limits).
    object[key] = mergeFunc(result, srcValue, customizer, stackA, stackB);
  } else if (result === result ? (result !== value) : (value === value)) {
    object[key] = result;
  }
}

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Recursively merges own enumerable properties of the source object(s), that
 * don't resolve to `undefined` into the destination object. Subsequent sources
 * overwrite property assignments of previous sources. If `customizer` is
 * provided it is invoked to produce the merged values of the destination and
 * source properties. If `customizer` returns `undefined` merging is handled
 * by the method instead. The `customizer` is bound to `thisArg` and invoked
 * with five arguments: (objectValue, sourceValue, key, object, source).
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The destination object.
 * @param {...Object} [sources] The source objects.
 * @param {Function} [customizer] The function to customize assigned values.
 * @param {*} [thisArg] The `this` binding of `customizer`.
 * @returns {Object} Returns `object`.
 * @example
 *
 * var users = {
 *   'data': [{ 'user': 'barney' }, { 'user': 'fred' }]
 * };
 *
 * var ages = {
 *   'data': [{ 'age': 36 }, { 'age': 40 }]
 * };
 *
 * _.merge(users, ages);
 * // => { 'data': [{ 'user': 'barney', 'age': 36 }, { 'user': 'fred', 'age': 40 }] }
 *
 * // using a customizer callback
 * var object = {
 *   'fruits': ['apple'],
 *   'vegetables': ['beet']
 * };
 *
 * var other = {
 *   'fruits': ['banana'],
 *   'vegetables': ['carrot']
 * };
 *
 * _.merge(object, other, function(a, b) {
 *   if (_.isArray(a)) {
 *     return a.concat(b);
 *   }
 * });
 * // => { 'fruits': ['apple', 'banana'], 'vegetables': ['beet', 'carrot'] }
 */
var merge = createAssigner(baseMerge);

module.exports = merge;

},{"lodash._arraycopy":24,"lodash._arrayeach":25,"lodash._createassigner":26,"lodash.isarguments":31,"lodash.isarray":32,"lodash.isplainobject":33,"lodash.istypedarray":35,"lodash.keys":36,"lodash.toplainobject":38}],24:[function(require,module,exports){
/**
 * lodash 3.0.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.7.0 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * Copies the values of `source` to `array`.
 *
 * @private
 * @param {Array} source The array to copy values from.
 * @param {Array} [array=[]] The array to copy values to.
 * @returns {Array} Returns `array`.
 */
function arrayCopy(source, array) {
  var index = -1,
      length = source.length;

  array || (array = Array(length));
  while (++index < length) {
    array[index] = source[index];
  }
  return array;
}

module.exports = arrayCopy;

},{}],25:[function(require,module,exports){
/**
 * lodash 3.0.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.7.0 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * A specialized version of `_.forEach` for arrays without support for callback
 * shorthands or `this` binding.
 *
 * @private
 * @param {Array} array The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns `array`.
 */
function arrayEach(array, iteratee) {
  var index = -1,
      length = array.length;

  while (++index < length) {
    if (iteratee(array[index], index, array) === false) {
      break;
    }
  }
  return array;
}

module.exports = arrayEach;

},{}],26:[function(require,module,exports){
/**
 * lodash 3.1.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var bindCallback = require('lodash._bindcallback'),
    isIterateeCall = require('lodash._isiterateecall'),
    restParam = require('lodash.restparam');

/**
 * Creates a function that assigns properties of source object(s) to a given
 * destination object.
 *
 * **Note:** This function is used to create `_.assign`, `_.defaults`, and `_.merge`.
 *
 * @private
 * @param {Function} assigner The function to assign values.
 * @returns {Function} Returns the new assigner function.
 */
function createAssigner(assigner) {
  return restParam(function(object, sources) {
    var index = -1,
        length = object == null ? 0 : sources.length,
        customizer = length > 2 ? sources[length - 2] : undefined,
        guard = length > 2 ? sources[2] : undefined,
        thisArg = length > 1 ? sources[length - 1] : undefined;

    if (typeof customizer == 'function') {
      customizer = bindCallback(customizer, thisArg, 5);
      length -= 2;
    } else {
      customizer = typeof thisArg == 'function' ? thisArg : undefined;
      length -= (customizer ? 1 : 0);
    }
    if (guard && isIterateeCall(sources[0], sources[1], guard)) {
      customizer = length < 3 ? undefined : customizer;
      length = 1;
    }
    while (++index < length) {
      var source = sources[index];
      if (source) {
        assigner(object, source, customizer);
      }
    }
    return object;
  });
}

module.exports = createAssigner;

},{"lodash._bindcallback":27,"lodash._isiterateecall":28,"lodash.restparam":29}],27:[function(require,module,exports){
/**
 * lodash 3.0.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * A specialized version of `baseCallback` which only supports `this` binding
 * and specifying the number of arguments to provide to `func`.
 *
 * @private
 * @param {Function} func The function to bind.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {number} [argCount] The number of arguments to provide to `func`.
 * @returns {Function} Returns the callback.
 */
function bindCallback(func, thisArg, argCount) {
  if (typeof func != 'function') {
    return identity;
  }
  if (thisArg === undefined) {
    return func;
  }
  switch (argCount) {
    case 1: return function(value) {
      return func.call(thisArg, value);
    };
    case 3: return function(value, index, collection) {
      return func.call(thisArg, value, index, collection);
    };
    case 4: return function(accumulator, value, index, collection) {
      return func.call(thisArg, accumulator, value, index, collection);
    };
    case 5: return function(value, other, key, object, source) {
      return func.call(thisArg, value, other, key, object, source);
    };
  }
  return function() {
    return func.apply(thisArg, arguments);
  };
}

/**
 * This method returns the first argument provided to it.
 *
 * @static
 * @memberOf _
 * @category Utility
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'user': 'fred' };
 *
 * _.identity(object) === object;
 * // => true
 */
function identity(value) {
  return value;
}

module.exports = bindCallback;

},{}],28:[function(require,module,exports){
/**
 * lodash 3.0.9 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** Used to detect unsigned integer values. */
var reIsUint = /^\d+$/;

/**
 * Used as the [maximum length](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return value > -1 && value % 1 == 0 && value < length;
}

/**
 * Checks if the provided arguments are from an iteratee call.
 *
 * @private
 * @param {*} value The potential iteratee value argument.
 * @param {*} index The potential iteratee index or key argument.
 * @param {*} object The potential iteratee object argument.
 * @returns {boolean} Returns `true` if the arguments are from an iteratee call, else `false`.
 */
function isIterateeCall(value, index, object) {
  if (!isObject(object)) {
    return false;
  }
  var type = typeof index;
  if (type == 'number'
      ? (isArrayLike(object) && isIndex(index, object.length))
      : (type == 'string' && index in object)) {
    var other = object[index];
    return value === value ? (value === other) : (other !== other);
  }
  return false;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = isIterateeCall;

},{}],29:[function(require,module,exports){
/**
 * lodash 3.6.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * Creates a function that invokes `func` with the `this` binding of the
 * created function and arguments from `start` and beyond provided as an array.
 *
 * **Note:** This method is based on the [rest parameter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters).
 *
 * @static
 * @memberOf _
 * @category Function
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 * @example
 *
 * var say = _.restParam(function(what, names) {
 *   return what + ' ' + _.initial(names).join(', ') +
 *     (_.size(names) > 1 ? ', & ' : '') + _.last(names);
 * });
 *
 * say('hello', 'fred', 'barney', 'pebbles');
 * // => 'hello fred, barney, & pebbles'
 */
function restParam(func, start) {
  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  start = nativeMax(start === undefined ? (func.length - 1) : (+start || 0), 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        rest = Array(length);

    while (++index < length) {
      rest[index] = args[start + index];
    }
    switch (start) {
      case 0: return func.call(this, rest);
      case 1: return func.call(this, args[0], rest);
      case 2: return func.call(this, args[0], args[1], rest);
    }
    var otherArgs = Array(start + 1);
    index = -1;
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = rest;
    return func.apply(this, otherArgs);
  };
}

module.exports = restParam;

},{}],30:[function(require,module,exports){
/**
 * lodash 3.9.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var funcTag = '[object Function]';

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = object == null ? undefined : object[key];
  return isNative(value) ? value : undefined;
}

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 equivalents which return 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (isFunction(value)) {
    return reIsNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && reIsHostCtor.test(value);
}

module.exports = getNative;

},{}],31:[function(require,module,exports){
/**
 * lodash 3.0.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Native method references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is classified as an `arguments` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
function isArguments(value) {
  return isObjectLike(value) && isArrayLike(value) &&
    hasOwnProperty.call(value, 'callee') && !propertyIsEnumerable.call(value, 'callee');
}

module.exports = isArguments;

},{}],32:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}],33:[function(require,module,exports){
/**
 * lodash 3.2.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var baseFor = require('lodash._basefor'),
    isArguments = require('lodash.isarguments'),
    keysIn = require('lodash.keysin');

/** `Object#toString` result references. */
var objectTag = '[object Object]';

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * The base implementation of `_.forIn` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForIn(object, iteratee) {
  return baseFor(object, iteratee, keysIn);
}

/**
 * Checks if `value` is a plain object, that is, an object created by the
 * `Object` constructor or one with a `[[Prototype]]` of `null`.
 *
 * **Note:** This method assumes objects created by the `Object` constructor
 * have no inherited enumerable properties.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 * }
 *
 * _.isPlainObject(new Foo);
 * // => false
 *
 * _.isPlainObject([1, 2, 3]);
 * // => false
 *
 * _.isPlainObject({ 'x': 0, 'y': 0 });
 * // => true
 *
 * _.isPlainObject(Object.create(null));
 * // => true
 */
function isPlainObject(value) {
  var Ctor;

  // Exit early for non `Object` objects.
  if (!(isObjectLike(value) && objToString.call(value) == objectTag && !isArguments(value)) ||
      (!hasOwnProperty.call(value, 'constructor') && (Ctor = value.constructor, typeof Ctor == 'function' && !(Ctor instanceof Ctor)))) {
    return false;
  }
  // IE < 9 iterates inherited properties before own properties. If the first
  // iterated property is an object's own property then there are no inherited
  // enumerable properties.
  var result;
  // In most environments an object's own properties are iterated before
  // its inherited properties. If the last iterated property is an object's
  // own property then there are no inherited enumerable properties.
  baseForIn(value, function(subValue, key) {
    result = key;
  });
  return result === undefined || hasOwnProperty.call(value, result);
}

module.exports = isPlainObject;

},{"lodash._basefor":34,"lodash.isarguments":31,"lodash.keysin":37}],34:[function(require,module,exports){
/**
 * lodash 3.0.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * The base implementation of `baseForIn` and `baseForOwn` which iterates
 * over `object` properties returned by `keysFunc` invoking `iteratee` for
 * each property. Iteratee functions may exit iteration early by explicitly
 * returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = createBaseFor();

/**
 * Creates a base function for `_.forIn` or `_.forInRight`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var iterable = toObject(object),
        props = keysFunc(object),
        length = props.length,
        index = fromRight ? length : -1;

    while ((fromRight ? index-- : ++index < length)) {
      var key = props[index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

/**
 * Converts `value` to an object if it's not one.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {Object} Returns the object.
 */
function toObject(value) {
  return isObject(value) ? value : Object(value);
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = baseFor;

},{}],35:[function(require,module,exports){
/**
 * lodash 3.0.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    objectTag = '[object Object]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to identify `toStringTag` values of typed arrays. */
var typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
typedArrayTags[uint32Tag] = true;
typedArrayTags[argsTag] = typedArrayTags[arrayTag] =
typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
typedArrayTags[dateTag] = typedArrayTags[errorTag] =
typedArrayTags[funcTag] = typedArrayTags[mapTag] =
typedArrayTags[numberTag] = typedArrayTags[objectTag] =
typedArrayTags[regexpTag] = typedArrayTags[setTag] =
typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the [`toStringTag`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * Used as the [maximum length](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is classified as a typed array.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isTypedArray(new Uint8Array);
 * // => true
 *
 * _.isTypedArray([]);
 * // => false
 */
function isTypedArray(value) {
  return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[objToString.call(value)];
}

module.exports = isTypedArray;

},{}],36:[function(require,module,exports){
/**
 * lodash 3.1.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var getNative = require('lodash._getnative'),
    isArguments = require('lodash.isarguments'),
    isArray = require('lodash.isarray');

/** Used to detect unsigned integer values. */
var reIsUint = /^\d+$/;

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/* Native method references for those with the same name as other `lodash` methods. */
var nativeKeys = getNative(Object, 'keys');

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return value > -1 && value % 1 == 0 && value < length;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * A fallback implementation of `Object.keys` which creates an array of the
 * own enumerable property names of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function shimKeys(object) {
  var props = keysIn(object),
      propsLength = props.length,
      length = propsLength && object.length;

  var allowIndexes = !!length && isLength(length) &&
    (isArray(object) || isArguments(object));

  var index = -1,
      result = [];

  while (++index < propsLength) {
    var key = props[index];
    if ((allowIndexes && isIndex(key, length)) || hasOwnProperty.call(object, key)) {
      result.push(key);
    }
  }
  return result;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/6.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
var keys = !nativeKeys ? shimKeys : function(object) {
  var Ctor = object == null ? undefined : object.constructor;
  if ((typeof Ctor == 'function' && Ctor.prototype === object) ||
      (typeof object != 'function' && isArrayLike(object))) {
    return shimKeys(object);
  }
  return isObject(object) ? nativeKeys(object) : [];
};

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  if (object == null) {
    return [];
  }
  if (!isObject(object)) {
    object = Object(object);
  }
  var length = object.length;
  length = (length && isLength(length) &&
    (isArray(object) || isArguments(object)) && length) || 0;

  var Ctor = object.constructor,
      index = -1,
      isProto = typeof Ctor == 'function' && Ctor.prototype === object,
      result = Array(length),
      skipIndexes = length > 0;

  while (++index < length) {
    result[index] = (index + '');
  }
  for (var key in object) {
    if (!(skipIndexes && isIndex(key, length)) &&
        !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = keys;

},{"lodash._getnative":30,"lodash.isarguments":31,"lodash.isarray":32}],37:[function(require,module,exports){
/**
 * lodash 3.0.8 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var isArguments = require('lodash.isarguments'),
    isArray = require('lodash.isarray');

/** Used to detect unsigned integer values. */
var reIsUint = /^\d+$/;

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used as the [maximum length](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return value > -1 && value % 1 == 0 && value < length;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  if (object == null) {
    return [];
  }
  if (!isObject(object)) {
    object = Object(object);
  }
  var length = object.length;
  length = (length && isLength(length) &&
    (isArray(object) || isArguments(object)) && length) || 0;

  var Ctor = object.constructor,
      index = -1,
      isProto = typeof Ctor == 'function' && Ctor.prototype === object,
      result = Array(length),
      skipIndexes = length > 0;

  while (++index < length) {
    result[index] = (index + '');
  }
  for (var key in object) {
    if (!(skipIndexes && isIndex(key, length)) &&
        !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = keysIn;

},{"lodash.isarguments":31,"lodash.isarray":32}],38:[function(require,module,exports){
/**
 * lodash 3.0.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.7.0 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var baseCopy = require('lodash._basecopy'),
    keysIn = require('lodash.keysin');

/**
 * Converts `value` to a plain object flattening inherited enumerable
 * properties of `value` to own properties of the plain object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {Object} Returns the converted plain object.
 * @example
 *
 * function Foo() {
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.assign({ 'a': 1 }, new Foo);
 * // => { 'a': 1, 'b': 2 }
 *
 * _.assign({ 'a': 1 }, _.toPlainObject(new Foo));
 * // => { 'a': 1, 'b': 2, 'c': 3 }
 */
function toPlainObject(value) {
  return baseCopy(value, keysIn(value));
}

module.exports = toPlainObject;

},{"lodash._basecopy":39,"lodash.keysin":37}],39:[function(require,module,exports){
/**
 * lodash 3.0.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * Copies properties of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy properties from.
 * @param {Array} props The property names to copy.
 * @param {Object} [object={}] The object to copy properties to.
 * @returns {Object} Returns `object`.
 */
function baseCopy(source, props, object) {
  object || (object = {});

  var index = -1,
      length = props.length;

  while (++index < length) {
    var key = props[index];
    object[key] = source[key];
  }
  return object;
}

module.exports = baseCopy;

},{}],40:[function(require,module,exports){
/**
 * lodash 3.7.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var toPath = require('lodash._topath'),
    isArray = require('lodash.isarray');

/** Used to match property names within property paths. */
var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\n\\]|\\.)*?\1)\]/,
    reIsPlainProp = /^\w*$/;

/** Used to detect unsigned integer values. */
var reIsUint = /^\d+$/;

/**
 * Used as the [maximum length](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return value > -1 && value % 1 == 0 && value < length;
}

/**
 * Checks if `value` is a property name and not a property path.
 *
 * @private
 * @param {*} value The value to check.
 * @param {Object} [object] The object to query keys on.
 * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
 */
function isKey(value, object) {
  var type = typeof value;
  if ((type == 'string' && reIsPlainProp.test(value)) || type == 'number') {
    return true;
  }
  if (isArray(value)) {
    return false;
  }
  var result = !reIsDeepProp.test(value);
  return result || (object != null && value in toObject(object));
}

/**
 * Converts `value` to an object if it's not one.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {Object} Returns the object.
 */
function toObject(value) {
  return isObject(value) ? value : Object(value);
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Sets the property value of `path` on `object`. If a portion of `path`
 * does not exist it is created.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to augment.
 * @param {Array|string} path The path of the property to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns `object`.
 * @example
 *
 * var object = { 'a': [{ 'b': { 'c': 3 } }] };
 *
 * _.set(object, 'a[0].b.c', 4);
 * console.log(object.a[0].b.c);
 * // => 4
 *
 * _.set(object, 'x[0].y.z', 5);
 * console.log(object.x[0].y.z);
 * // => 5
 */
function set(object, path, value) {
  if (object == null) {
    return object;
  }
  var pathKey = (path + '');
  path = (object[pathKey] != null || isKey(path, object)) ? [pathKey] : toPath(path);

  var index = -1,
      length = path.length,
      lastIndex = length - 1,
      nested = object;

  while (nested != null && ++index < length) {
    var key = path[index];
    if (isObject(nested)) {
      if (index == lastIndex) {
        nested[key] = value;
      } else if (nested[key] == null) {
        nested[key] = isIndex(path[index + 1]) ? [] : {};
      }
    }
    nested = nested[key];
  }
  return object;
}

module.exports = set;

},{"lodash._topath":41,"lodash.isarray":42}],41:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"dup":21,"lodash.isarray":42}],42:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22}]},{},[15])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjbGllbnQvbGliL2Jyb3dzZXItc3luYy5qcyIsImNsaWVudC9saWIvYnJvd3Nlci51dGlscy5qcyIsImNsaWVudC9saWIvY2xpZW50LXNoaW1zLmpzIiwiY2xpZW50L2xpYi9jb2RlLXN5bmMuanMiLCJjbGllbnQvbGliL2VtaXR0ZXIuanMiLCJjbGllbnQvbGliL2V2ZW50cy5qcyIsImNsaWVudC9saWIvZ2hvc3Rtb2RlLmNsaWNrcy5qcyIsImNsaWVudC9saWIvZ2hvc3Rtb2RlLmZvcm1zLmlucHV0LmpzIiwiY2xpZW50L2xpYi9naG9zdG1vZGUuZm9ybXMuanMiLCJjbGllbnQvbGliL2dob3N0bW9kZS5mb3Jtcy5zdWJtaXQuanMiLCJjbGllbnQvbGliL2dob3N0bW9kZS5mb3Jtcy50b2dnbGVzLmpzIiwiY2xpZW50L2xpYi9naG9zdG1vZGUuanMiLCJjbGllbnQvbGliL2dob3N0bW9kZS5sb2NhdGlvbi5qcyIsImNsaWVudC9saWIvZ2hvc3Rtb2RlLnNjcm9sbC5qcyIsImNsaWVudC9saWIvaW5kZXguanMiLCJjbGllbnQvbGliL25vdGlmeS5qcyIsImNsaWVudC9saWIvc29ja2V0LmpzIiwiY2xpZW50L2xpYi9zdG9yZS5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2guZ2V0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC5nZXQvbm9kZV9tb2R1bGVzL2xvZGFzaC5fYmFzZWdldC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2guZ2V0L25vZGVfbW9kdWxlcy9sb2Rhc2guX3RvcGF0aC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2guZ2V0L25vZGVfbW9kdWxlcy9sb2Rhc2guX3RvcGF0aC9ub2RlX21vZHVsZXMvbG9kYXNoLmlzYXJyYXkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLm1lcmdlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC5tZXJnZS9ub2RlX21vZHVsZXMvbG9kYXNoLl9hcnJheWNvcHkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLm1lcmdlL25vZGVfbW9kdWxlcy9sb2Rhc2guX2FycmF5ZWFjaC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2gubWVyZ2Uvbm9kZV9tb2R1bGVzL2xvZGFzaC5fY3JlYXRlYXNzaWduZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLm1lcmdlL25vZGVfbW9kdWxlcy9sb2Rhc2guX2NyZWF0ZWFzc2lnbmVyL25vZGVfbW9kdWxlcy9sb2Rhc2guX2JpbmRjYWxsYmFjay9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2gubWVyZ2Uvbm9kZV9tb2R1bGVzL2xvZGFzaC5fY3JlYXRlYXNzaWduZXIvbm9kZV9tb2R1bGVzL2xvZGFzaC5faXNpdGVyYXRlZWNhbGwvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLm1lcmdlL25vZGVfbW9kdWxlcy9sb2Rhc2guX2NyZWF0ZWFzc2lnbmVyL25vZGVfbW9kdWxlcy9sb2Rhc2gucmVzdHBhcmFtL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC5tZXJnZS9ub2RlX21vZHVsZXMvbG9kYXNoLl9nZXRuYXRpdmUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLm1lcmdlL25vZGVfbW9kdWxlcy9sb2Rhc2guaXNhcmd1bWVudHMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLm1lcmdlL25vZGVfbW9kdWxlcy9sb2Rhc2guaXNwbGFpbm9iamVjdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2gubWVyZ2Uvbm9kZV9tb2R1bGVzL2xvZGFzaC5pc3BsYWlub2JqZWN0L25vZGVfbW9kdWxlcy9sb2Rhc2guX2Jhc2Vmb3IvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLm1lcmdlL25vZGVfbW9kdWxlcy9sb2Rhc2guaXN0eXBlZGFycmF5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC5tZXJnZS9ub2RlX21vZHVsZXMvbG9kYXNoLmtleXMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLm1lcmdlL25vZGVfbW9kdWxlcy9sb2Rhc2gua2V5c2luL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC5tZXJnZS9ub2RlX21vZHVsZXMvbG9kYXNoLnRvcGxhaW5vYmplY3QvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLm1lcmdlL25vZGVfbW9kdWxlcy9sb2Rhc2gudG9wbGFpbm9iamVjdC9ub2RlX21vZHVsZXMvbG9kYXNoLl9iYXNlY29weS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2guc2V0L2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUEsWUFBWSxDQUFDOztBQUViLElBQUksTUFBTSxHQUFLLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNuQyxJQUFJLE9BQU8sR0FBSSxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDcEMsSUFBSSxNQUFNLEdBQUssT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ25DLElBQUksS0FBSyxHQUFNLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQzFDLElBQUksS0FBSyxHQUFNLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN2QyxJQUFJLE1BQU0sR0FBSyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDckMsSUFBSSxPQUFPLEdBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQzs7Ozs7QUFBQyxBQUtsQyxJQUFJLFdBQVcsR0FBRyxTQUFkLFdBQVcsQ0FBYSxPQUFPLEVBQUU7O0FBRWpDLFFBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0FBQ3ZCLFFBQUksQ0FBQyxNQUFNLEdBQUksTUFBTSxDQUFDO0FBQ3RCLFFBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0FBQ3ZCLFFBQUksQ0FBQyxLQUFLLEdBQUssS0FB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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgc29ja2V0ICAgPSByZXF1aXJlKFwiLi9zb2NrZXRcIik7XG52YXIgZW1pdHRlciAgPSByZXF1aXJlKFwiLi9lbWl0dGVyXCIpO1xudmFyIG5vdGlmeSAgID0gcmVxdWlyZShcIi4vbm90aWZ5XCIpO1xudmFyIHV0aWxzICAgID0gcmVxdWlyZShcIi4vYnJvd3Nlci51dGlsc1wiKTtcbnZhciBtZXJnZSAgICA9IHJlcXVpcmUoXCJsb2Rhc2gubWVyZ2VcIik7XG52YXIgb2JqR2V0ICAgPSByZXF1aXJlKFwibG9kYXNoLmdldFwiKTtcbnZhciBzdG9yYWdlICA9IHJlcXVpcmUoXCIuL3N0b3JlXCIpO1xuXG4vKipcbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgQnJvd3NlclN5bmMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuXG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLnNvY2tldCAgPSBzb2NrZXQ7XG4gICAgdGhpcy5lbWl0dGVyID0gZW1pdHRlcjtcbiAgICB0aGlzLnV0aWxzICAgPSB1dGlscztcbiAgICB0aGlzLnN0b3JlICAgPSBzdG9yYWdlLmNyZWF0ZShvcHRpb25zLnNlc3Npb25JZCk7XG4gICAgdmFyIF90aGlzICAgID0gdGhpcztcblxuICAgIHZhciBicyA9IHRoaXM7XG5cbiAgICBpZiAoIXRoaXMuc3RvcmUuZ2V0KCdjbGllbnQnKSkge1xuICAgICAgICB0aGlzLnN0b3JlLnNldCgnY2xpZW50Jywge1xuICAgICAgICAgICAgaWQ6IHRoaXMuc29ja2V0LnNvY2tldC5pZFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB2YXIgY3VycmVudElkID0gdGhpcy5zdG9yZS5nZXQoJ2NsaWVudC5pZCcpO1xuXG4gICAgYnMucmVnaXN0ZXIoKTtcblxuICAgIHNvY2tldC5vbignT3B0aW9ucy5zZXQnLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBpZiAoZGF0YS5pZCA9PT0gY3VycmVudElkKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygncmVjZWl2ZWQnLCBkYXRhLm9wdGlvbnMpO1xuICAgICAgICAgICAgbWVyZ2UoX3RoaXMub3B0aW9ucywgZGF0YS5vcHRpb25zKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgc29ja2V0Lm9uKCdyZWNvbm5lY3QnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHV0aWxzLnJlbG9hZEJyb3dzZXIoKTtcbiAgICB9KTtcblxuICAgIHZhciByZXNpemluZyA9IGZhbHNlO1xuICAgIHZhciB0aW1lb3V0ICA9IDEwMDA7XG4gICAgdmFyIGludDtcblxuICAgIHV0aWxzLmdldFdpbmRvdygpLmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFyZXNpemluZykge1xuICAgICAgICAgICAgcmVzaXppbmcgPSB0cnVlO1xuICAgICAgICAgICAgaW50ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmVzaXppbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoaW50KTtcbiAgICAgICAgICAgICAgICBicy5yZWdpc3RlcigpO1xuICAgICAgICAgICAgfSwgdGltZW91dCk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8qKlxuICpcbiAqL1xuQnJvd3NlclN5bmMucHJvdG90eXBlLnJlZ2lzdGVyID0gZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGJzID0gdGhpcztcbiAgICB2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9ucztcblxuICAgIC8qKlxuICAgICAqIEFzIHBlciBwcm90b2NvbCwgc2VuZCAnY2xpZW50JyArIG9wdGlvbmFsIGRhdGFcbiAgICAgKi9cbiAgICBzb2NrZXQuZW1pdCgnQ2xpZW50LnJlZ2lzdGVyJywge1xuICAgICAgICBjbGllbnQ6IGJzLnN0b3JlLmdldCgnY2xpZW50JyksXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGhhc2g6IHV0aWxzLmdldFdpbmRvdygpLmxvY2F0aW9uLmhhc2gsXG4gICAgICAgICAgICBzZXNzaW9uSWQ6IG9wdGlvbnMuc2Vzc2lvbklkLFxuICAgICAgICAgICAgc29ja2V0SWQ6ICBicy5zb2NrZXQuc29ja2V0LmlkLFxuICAgICAgICAgICAgYnJvd3Nlcjoge1xuICAgICAgICAgICAgICAgIHNjcm9sbDogdXRpbHMuZ2V0QnJvd3NlclNjcm9sbFBvc2l0aW9uKCksXG4gICAgICAgICAgICAgICAgZGltZW5zaW9uczoge1xuICAgICAgICAgICAgICAgICAgICB3aWR0aDogIHV0aWxzLmdldERvY3VtZW50KCkuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFdpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHV0aWxzLmdldERvY3VtZW50KCkuZG9jdW1lbnRFbGVtZW50LnNjcm9sbEhlaWdodFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBIZWxwZXIgdG8gY2hlY2sgaWYgc3luY2luZyBpcyBhbGxvd2VkXG4gKiBAcGFyYW0gZGF0YVxuICogQHBhcmFtIG9wdFBhdGhcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5Ccm93c2VyU3luYy5wcm90b3R5cGUuY2FuU3luYyA9IGZ1bmN0aW9uIChkYXRhLCBvcHRQYXRoKSB7XG5cbiAgICBkYXRhID0gZGF0YSB8fCB7fTtcblxuICAgIGlmIChkYXRhLm92ZXJyaWRlKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHZhciBjYW5TeW5jID0gdHJ1ZTtcblxuICAgIGlmIChvcHRQYXRoKSB7XG4gICAgICAgIGNhblN5bmMgPSB0aGlzLmdldE9wdGlvbihvcHRQYXRoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2FuU3luYyAmJiBkYXRhLnVybCA9PT0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lO1xufTtcblxuLyoqXG4gKiBIZWxwZXIgdG8gY2hlY2sgaWYgc3luY2luZyBpcyBhbGxvd2VkXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuQnJvd3NlclN5bmMucHJvdG90eXBlLmdldE9wdGlvbiA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgcmV0dXJuIG9iakdldCh0aGlzLm9wdGlvbnMsIHBhdGgpO1xufTtcblxuLyoqXG4gKiBAdHlwZSB7RnVuY3Rpb259XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQnJvd3NlclN5bmM7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIHV0aWxzID0gZXhwb3J0cztcbnZhciBlbWl0dGVyID0gcmVxdWlyZSgnLi9lbWl0dGVyJyk7XG5cbi8qKlxuICogQHJldHVybnMge3dpbmRvd31cbiAqL1xudXRpbHMuZ2V0V2luZG93ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB3aW5kb3c7XG59O1xuXG4vKipcbiAqXG4gKiBAcmV0dXJucyB7SFRNTERvY3VtZW50fVxuICovXG51dGlscy5nZXREb2N1bWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQ7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgY3VycmVudCB4L3kgcG9zaXRpb24gY3Jvc3Nib3dcbiAqIEByZXR1cm5zIHt7eDogKiwgeTogKn19XG4gKi9cbnV0aWxzLmdldEJyb3dzZXJTY3JvbGxQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciAkd2luZG93ID0gZXhwb3J0cy5nZXRXaW5kb3coKTtcbiAgICB2YXIgJGRvY3VtZW50ID0gZXhwb3J0cy5nZXREb2N1bWVudCgpO1xuICAgIHZhciBzY3JvbGxYO1xuICAgIHZhciBzY3JvbGxZO1xuICAgIHZhciBkRWxlbWVudCA9ICRkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gICAgdmFyIGRCb2R5ID0gJGRvY3VtZW50LmJvZHk7XG5cbiAgICBpZiAoJHdpbmRvdy5wYWdlWU9mZnNldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHNjcm9sbFggPSAkd2luZG93LnBhZ2VYT2Zmc2V0O1xuICAgICAgICBzY3JvbGxZID0gJHdpbmRvdy5wYWdlWU9mZnNldDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBzY3JvbGxYID0gZEVsZW1lbnQuc2Nyb2xsTGVmdCB8fCBkQm9keS5zY3JvbGxMZWZ0IHx8IDA7XG4gICAgICAgIHNjcm9sbFkgPSBkRWxlbWVudC5zY3JvbGxUb3AgfHwgZEJvZHkuc2Nyb2xsVG9wIHx8IDA7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgeDogc2Nyb2xsWCxcbiAgICAgICAgeTogc2Nyb2xsWVxuICAgIH07XG59O1xuXG4vKipcbiAqIEByZXR1cm5zIHt7eDogbnVtYmVyLCB5OiBudW1iZXJ9fVxuICovXG51dGlscy5nZXRTY3JvbGxTcGFjZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgJGRvY3VtZW50ID0gZXhwb3J0cy5nZXREb2N1bWVudCgpO1xuICAgIHZhciBkRWxlbWVudCA9ICRkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gICAgdmFyIGRCb2R5ID0gJGRvY3VtZW50LmJvZHk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgeDogZEJvZHkuc2Nyb2xsSGVpZ2h0IC0gZEVsZW1lbnQuY2xpZW50V2lkdGgsXG4gICAgICAgIHk6IGRCb2R5LnNjcm9sbEhlaWdodCAtIGRFbGVtZW50LmNsaWVudEhlaWdodFxuICAgIH07XG59O1xuXG4vKipcbiAqIFNhdmVzIHNjcm9sbCBwb3NpdGlvbiBpbnRvIGNvb2tpZXNcbiAqL1xudXRpbHMuc2F2ZVNjcm9sbFBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwb3MgPSB1dGlscy5nZXRCcm93c2VyU2Nyb2xsUG9zaXRpb24oKTtcbiAgICBwb3MgPSBbcG9zLngsIHBvcy55XTtcbiAgICB1dGlscy5nZXREb2N1bWVudC5jb29raWUgPSBcImJzX3Njcm9sbF9wb3M9XCIgKyBwb3Muam9pbihcIixcIik7XG59O1xuXG4vKipcbiAqIFJlc3RvcmVzIHNjcm9sbCBwb3NpdGlvbiBmcm9tIGNvb2tpZXNcbiAqL1xudXRpbHMucmVzdG9yZVNjcm9sbFBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwb3MgPSB1dGlscy5nZXREb2N1bWVudCgpLmNvb2tpZS5yZXBsYWNlKC8oPzooPzpefC4qO1xccyopYnNfc2Nyb2xsX3Bvc1xccypcXD1cXHMqKFteO10qKS4qJCl8Xi4qJC8sIFwiJDFcIikuc3BsaXQoXCIsXCIpO1xuICAgIHV0aWxzLmdldFdpbmRvdygpLnNjcm9sbFRvKHBvc1swXSwgcG9zWzFdKTtcbn07XG5cbi8qKlxuICogQHBhcmFtIHRhZ05hbWVcbiAqIEBwYXJhbSBlbGVtXG4gKiBAcmV0dXJucyB7KnxudW1iZXJ9XG4gKi9cbnV0aWxzLmdldEVsZW1lbnRJbmRleCA9IGZ1bmN0aW9uICh0YWdOYW1lLCBlbGVtKSB7XG4gICAgdmFyIGFsbEVsZW1zID0gdXRpbHMuZ2V0RG9jdW1lbnQoKS5nZXRFbGVtZW50c0J5VGFnTmFtZSh0YWdOYW1lKTtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbChhbGxFbGVtcywgZWxlbSk7XG59O1xuXG4vKipcbiAqIEZvcmNlIENoYW5nZSBldmVudCBvbiByYWRpbyAmIGNoZWNrYm94ZXMgKElFKVxuICovXG51dGlscy5mb3JjZUNoYW5nZSA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgZWxlbS5ibHVyKCk7XG4gICAgZWxlbS5mb2N1cygpO1xufTtcblxuLyoqXG4gKiBAcGFyYW0gZWxlbVxuICogQHJldHVybnMge3t0YWdOYW1lOiAoZWxlbS50YWdOYW1lfCopLCBpbmRleDogKn19XG4gKi9cbnV0aWxzLmdldEVsZW1lbnREYXRhID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICB2YXIgdGFnTmFtZSA9IGVsZW0udGFnTmFtZTtcbiAgICB2YXIgaW5kZXggPSB1dGlscy5nZXRFbGVtZW50SW5kZXgodGFnTmFtZSwgZWxlbSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdGFnTmFtZTogdGFnTmFtZSxcbiAgICAgICAgaW5kZXg6ICAgaW5kZXhcbiAgICB9O1xufTtcblxuLyoqXG4gKiBAcGFyYW0ge3N0cmluZ30gdGFnTmFtZVxuICogQHBhcmFtIHtudW1iZXJ9IGluZGV4XG4gKi9cbnV0aWxzLmdldFNpbmdsZUVsZW1lbnQgPSBmdW5jdGlvbiAodGFnTmFtZSwgaW5kZXgpIHtcbiAgICB2YXIgZWxlbXMgPSB1dGlscy5nZXREb2N1bWVudCgpLmdldEVsZW1lbnRzQnlUYWdOYW1lKHRhZ05hbWUpO1xuICAgIHJldHVybiBlbGVtc1tpbmRleF07XG59O1xuXG4vKipcbiAqIEdldCB0aGUgYm9keSBlbGVtZW50XG4gKi9cbnV0aWxzLmdldEJvZHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHV0aWxzLmdldERvY3VtZW50KCkuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJib2R5XCIpWzBdO1xufTtcblxuLyoqXG4gKiBAcGFyYW0ge3t4OiBudW1iZXIsIHk6IG51bWJlcn19IHBvc1xuICovXG51dGlscy5zZXRTY3JvbGwgPSBmdW5jdGlvbiAocG9zKSB7XG4gICAgdXRpbHMuZ2V0V2luZG93KCkuc2Nyb2xsVG8ocG9zLngsIHBvcy55KTtcbn07XG5cbi8qKlxuICogSGFyZCByZWxvYWRcbiAqL1xudXRpbHMucmVsb2FkQnJvd3NlciA9IGZ1bmN0aW9uICgpIHtcbiAgICBlbWl0dGVyLmVtaXQoXCJicm93c2VyOmhhcmRSZWxvYWRcIik7XG4gICAgdXRpbHMuZ2V0V2luZG93KCkubG9jYXRpb24ucmVsb2FkKHRydWUpO1xufTtcblxuLyoqXG4gKiBGb3JlYWNoIHBvbHlmaWxsXG4gKiBAcGFyYW0gY29sbFxuICogQHBhcmFtIGZuXG4gKi9cbnV0aWxzLmZvckVhY2ggPSBmdW5jdGlvbiAoY29sbCwgZm4pIHtcbiAgICBmb3IgKHZhciBpID0gMCwgbiA9IGNvbGwubGVuZ3RoOyBpIDwgbjsgaSArPSAxKSB7XG4gICAgICAgIGZuKGNvbGxbaV0sIGksIGNvbGwpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQXJlIHdlIGRlYWxpbmcgd2l0aCBvbGQgSUU/XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xudXRpbHMuaXNPbGRJZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHlwZW9mIHV0aWxzLmdldFdpbmRvdygpLmF0dGFjaEV2ZW50ICE9PSBcInVuZGVmaW5lZFwiO1xufTtcbiIsImlmICghKFwiaW5kZXhPZlwiIGluIEFycmF5LnByb3RvdHlwZSkpIHtcblxuICAgIEFycmF5LnByb3RvdHlwZS5pbmRleE9mPSBmdW5jdGlvbihmaW5kLCBpKSB7XG4gICAgICAgIGlmIChpID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGkgPSAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpIDwgMCkge1xuICAgICAgICAgICAgaSArPSB0aGlzLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaSA8IDApIHtcbiAgICAgICAgICAgIGk9IDA7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgbiA9IHRoaXMubGVuZ3RoOyBpIDwgbjsgaSArPSAxKSB7XG4gICAgICAgICAgICBpZiAoaSBpbiB0aGlzICYmIHRoaXNbaV09PT1maW5kKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH07XG59IiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgZXZlbnRzICA9IHJlcXVpcmUoXCIuL2V2ZW50c1wiKTtcbnZhciB1dGlscyAgID0gcmVxdWlyZShcIi4vYnJvd3Nlci51dGlsc1wiKTtcbnZhciBlbWl0dGVyID0gcmVxdWlyZShcIi4vZW1pdHRlclwiKTtcbnZhciBzeW5jICAgID0gZXhwb3J0cztcblxudmFyIG9wdGlvbnMgPSB7XG5cbiAgICB0YWdOYW1lczoge1xuICAgICAgICBcImNzc1wiOiAgXCJsaW5rXCIsXG4gICAgICAgIFwianBnXCI6ICBcImltZ1wiLFxuICAgICAgICBcImpwZWdcIjogXCJpbWdcIixcbiAgICAgICAgXCJwbmdcIjogIFwiaW1nXCIsXG4gICAgICAgIFwic3ZnXCI6ICBcImltZ1wiLFxuICAgICAgICBcImdpZlwiOiAgXCJpbWdcIixcbiAgICAgICAgXCJqc1wiOiAgIFwic2NyaXB0XCJcbiAgICB9LFxuICAgIGF0dHJzOiB7XG4gICAgICAgIFwibGlua1wiOiAgIFwiaHJlZlwiLFxuICAgICAgICBcImltZ1wiOiAgICBcInNyY1wiLFxuICAgICAgICBcInNjcmlwdFwiOiBcInNyY1wiXG4gICAgfVxufTtcblxudmFyIGhpZGRlbkVsZW07XG52YXIgT1BUX1BBVEggPSBcImNvZGVTeW5jXCI7XG5cbnZhciBjdXJyZW50ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWU7XG59O1xuXG4vKipcbiAqIEBwYXJhbSB7QnJvd3NlclN5bmN9IGJzXG4gKi9cbnN5bmMuaW5pdCA9IGZ1bmN0aW9uIChicykge1xuXG4gICAgaWYgKGJzLm9wdGlvbnMudGFnTmFtZXMpIHtcbiAgICAgICAgb3B0aW9ucy50YWdOYW1lcyA9IGJzLm9wdGlvbnMudGFnTmFtZXM7XG4gICAgfVxuXG4gICAgaWYgKGJzLm9wdGlvbnMuc2Nyb2xsUmVzdG9yZVRlY2huaXF1ZSA9PT0gXCJ3aW5kb3cubmFtZVwiKSB7XG4gICAgICAgIC8vc3luYy5zYXZlU2Nyb2xsSW5OYW1lKGJzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBzeW5jLnNhdmVTY3JvbGxJbkNvb2tpZSh1dGlscy5nZXRXaW5kb3coKSwgdXRpbHMuZ2V0RG9jdW1lbnQoKSk7XG4gICAgfVxuXG4gICAgYnMuc29ja2V0Lm9uKFwiR2xvYmFsLmluamVjdFwiLCBzeW5jLnJlbG9hZChicykpO1xuICAgIGJzLnNvY2tldC5vbihcIkdsb2JhbC5yZWxvYWRcIiwgZnVuY3Rpb24gKGhhcmQpIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhoYXJkKTtcbiAgICAgICAgaWYgKGJzLmNhblN5bmMoe3VybDogY3VycmVudCgpfSwgT1BUX1BBVEgpKSB7XG4gICAgICAgICAgICBzeW5jLnJlbG9hZEJyb3dzZXIoaGFyZCwgYnMpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFVzZSB3aW5kb3cubmFtZSB0byBzdG9yZS9yZXN0b3JlIHNjcm9sbCBwb3NpdGlvblxuICovXG5zeW5jLnNhdmVTY3JvbGxJbk5hbWUgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgJHdpbmRvdyA9IHV0aWxzLmdldFdpbmRvdygpO1xuICAgIHZhciBzYXZlZCAgID0ge307XG5cbiAgICAvKipcbiAgICAgKiBSZWdpc3RlciB0aGUgc2F2ZSBldmVudCBmb3Igd2hlbmV2ZXIgd2UgY2FsbFxuICAgICAqIGEgaGFyZCByZWxvYWRcbiAgICAgKi9cbiAgICBlbWl0dGVyLm9uKFwiYnJvd3NlcjpoYXJkUmVsb2FkXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJHdpbmRvdy5uYW1lID0gJHdpbmRvdy5uYW1lICsgXCJicz1cIiArIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgIGJzOiB7XG4gICAgICAgICAgICAgICAgaGFyZFJlbG9hZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzY3JvbGw6ICAgICB1dGlscy5nZXRCcm93c2VyU2Nyb2xsUG9zaXRpb24oKVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIHdpbmRvdy5uYW1lIGlzIGFsd2F5cyBhIHN0cmluZywgZXZlbiB3aGVuIG5ldmVyIHNldC5cbiAgICAgKi9cbiAgICB0cnkge1xuICAgICAgICB2YXIganNvbiA9ICR3aW5kb3cubmFtZS5tYXRjaCgvYnM9KC4rKSQvKTtcbiAgICAgICAgaWYgKGpzb24pIHtcbiAgICAgICAgICAgIHNhdmVkID0gSlNPTi5wYXJzZShqc29uWzFdKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgc2F2ZWQgPSB7fTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpZiB0aGUgSlNPTiB3YXMgcGFyc2VkIGNvcnJlY3RseSwgdHJ5IHRvXG4gICAgICogZmluZCBhIHNjcm9sbCBwcm9wZXJ0eSBhbmQgcmVzdG9yZSBpdC5cbiAgICAgKi9cbiAgICBpZiAoc2F2ZWQuYnMgJiYgc2F2ZWQuYnMuaGFyZFJlbG9hZCAmJiBzYXZlZC5icy5zY3JvbGwpIHtcbiAgICAgICAgdXRpbHMuc2V0U2Nyb2xsKHNhdmVkLmJzLnNjcm9sbCk7XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coJHdpbmRvdy5uYW1lKTtcblxuICAgICR3aW5kb3cubmFtZSA9IFwiXCI7XG59O1xuXG4vKipcbiAqIFVzZSBhIGNvb2tpZS1kcm9wIHRvIHNhdmUgc2Nyb2xsIHBvc2l0aW9uIG9mXG4gKiBAcGFyYW0gJHdpbmRvd1xuICogQHBhcmFtICRkb2N1bWVudFxuICovXG5zeW5jLnNhdmVTY3JvbGxJbkNvb2tpZSA9IGZ1bmN0aW9uICgkd2luZG93LCAkZG9jdW1lbnQpIHtcblxuICAgIGlmICghdXRpbHMuaXNPbGRJZSgpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoJGRvY3VtZW50LnJlYWR5U3RhdGUgPT09IFwiY29tcGxldGVcIikge1xuICAgICAgICB1dGlscy5yZXN0b3JlU2Nyb2xsUG9zaXRpb24oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBldmVudHMubWFuYWdlci5hZGRFdmVudCgkZG9jdW1lbnQsIFwicmVhZHlzdGF0ZWNoYW5nZVwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICgkZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gXCJjb21wbGV0ZVwiKSB7XG4gICAgICAgICAgICAgICAgdXRpbHMucmVzdG9yZVNjcm9sbFBvc2l0aW9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGVtaXR0ZXIub24oXCJicm93c2VyOmhhcmRSZWxvYWRcIiwgdXRpbHMuc2F2ZVNjcm9sbFBvc2l0aW9uKTtcbn07XG5cbi8qKlxuICogQHBhcmFtIGVsZW1cbiAqIEBwYXJhbSBhdHRyXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogQHJldHVybnMge3tlbGVtOiBIVE1MRWxlbWVudCwgdGltZVN0YW1wOiBudW1iZXJ9fVxuICovXG5zeW5jLnN3YXBGaWxlID0gZnVuY3Rpb24gKGVsZW0sIGF0dHIsIG9wdGlvbnMpIHtcblxuICAgIHZhciBjdXJyZW50VmFsdWUgPSBlbGVtW2F0dHJdO1xuICAgIHZhciB0aW1lU3RhbXAgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICB2YXIgc3VmZml4ID0gXCI/cmVsPVwiICsgdGltZVN0YW1wO1xuXG4gICAgdmFyIGp1c3RVcmwgPSBzeW5jLmdldEZpbGVuYW1lT25seShjdXJyZW50VmFsdWUpO1xuXG4gICAgaWYgKGp1c3RVcmwpIHtcbiAgICAgICAgY3VycmVudFZhbHVlID0ganVzdFVybFswXTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucykge1xuICAgICAgICBpZiAoIW9wdGlvbnMudGltZXN0YW1wcykge1xuICAgICAgICAgICAgc3VmZml4ID0gXCJcIjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGVsZW1bYXR0cl0gPSBjdXJyZW50VmFsdWUgKyBzdWZmaXg7XG5cbiAgICB2YXIgYm9keSA9IGRvY3VtZW50LmJvZHk7XG5cbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFoaWRkZW5FbGVtKSB7XG4gICAgICAgICAgICBoaWRkZW5FbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIkRJVlwiKTtcbiAgICAgICAgICAgIGJvZHkuYXBwZW5kQ2hpbGQoaGlkZGVuRWxlbSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBoaWRkZW5FbGVtLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgICAgIGhpZGRlbkVsZW0uc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcbiAgICAgICAgfVxuICAgIH0sIDIwMCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBlbGVtOiBlbGVtLFxuICAgICAgICB0aW1lU3RhbXA6IHRpbWVTdGFtcFxuICAgIH07XG59O1xuXG5zeW5jLmdldEZpbGVuYW1lT25seSA9IGZ1bmN0aW9uICh1cmwpIHtcbiAgICByZXR1cm4gL15bXlxcP10rKD89XFw/KS8uZXhlYyh1cmwpO1xufTtcblxuLyoqXG4gKiBAcGFyYW0ge0Jyb3dzZXJTeW5jfSBic1xuICogQHJldHVybnMgeyp9XG4gKi9cbnN5bmMucmVsb2FkID0gZnVuY3Rpb24gKGJzKSB7XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0gZGF0YSAtIGZyb20gc29ja2V0XG4gICAgICovXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChkYXRhKSB7XG5cbiAgICAgICAgaWYgKCFicy5jYW5TeW5jKHt1cmw6IGN1cnJlbnQoKX0sIE9QVF9QQVRIKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0cmFuc2Zvcm1lZEVsZW07XG4gICAgICAgIHZhciBvcHRpb25zICAgID0gYnMub3B0aW9ucztcbiAgICAgICAgdmFyIGVtaXR0ZXIgPSBicy5lbWl0dGVyO1xuICAgICAgICB2YXIgZmlsZSA9IGRhdGEuZmlsZTtcblxuICAgICAgICB2YXIgZG9tRGF0YSA9IHN5bmMuZ2V0RWxlbXMoZmlsZS5leHQpO1xuICAgICAgICB2YXIgZWxlbXMgICA9IHN5bmMuZ2V0TWF0Y2hlcyhkb21EYXRhLmVsZW1zLCBmaWxlLmJhc2VuYW1lLCBkb21EYXRhLmF0dHIpO1xuXG4gICAgICAgIGlmIChlbGVtcy5sZW5ndGggJiYgb3B0aW9ucy5ub3RpZnkpIHtcbiAgICAgICAgICAgIGVtaXR0ZXIuZW1pdChcIm5vdGlmeVwiLCB7bWVzc2FnZTogXCJJbmplY3RlZDogXCIgKyBmaWxlLmJhc2VuYW1lfSk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGVsZW1zLmxlbmd0aDsgaSA8IG47IGkgKz0gMSkge1xuICAgICAgICAgICAgdHJhbnNmb3JtZWRFbGVtID0gc3luYy5zd2FwRmlsZShlbGVtc1tpXSwgZG9tRGF0YS5hdHRyLCBvcHRpb25zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cmFuc2Zvcm1lZEVsZW07XG4gICAgfTtcbn07XG5cbi8qKlxuICogQHBhcmFtIGZpbGVFeHRlbnNpb25cbiAqIEByZXR1cm5zIHsqfVxuICovXG5zeW5jLmdldFRhZ05hbWUgPSBmdW5jdGlvbiAoZmlsZUV4dGVuc2lvbikge1xuICAgIHJldHVybiBvcHRpb25zLnRhZ05hbWVzW2ZpbGVFeHRlbnNpb25dO1xufTtcblxuLyoqXG4gKiBAcGFyYW0gdGFnTmFtZVxuICogQHJldHVybnMgeyp9XG4gKi9cbnN5bmMuZ2V0QXR0ciA9IGZ1bmN0aW9uICh0YWdOYW1lKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuYXR0cnNbdGFnTmFtZV07XG59O1xuXG4vKipcbiAqIEBwYXJhbSBlbGVtc1xuICogQHBhcmFtIHVybFxuICogQHBhcmFtIGF0dHJcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuc3luYy5nZXRNYXRjaGVzID0gZnVuY3Rpb24gKGVsZW1zLCB1cmwsIGF0dHIpIHtcblxuICAgIGlmICh1cmxbMF0gPT09IFwiKlwiKSB7XG4gICAgICAgIHJldHVybiBlbGVtcztcbiAgICB9XG5cbiAgICB2YXIgbWF0Y2hlcyA9IFtdO1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGVsZW1zLmxlbmd0aDsgaSA8IGxlbjsgaSArPSAxKSB7XG4gICAgICAgIGlmIChlbGVtc1tpXVthdHRyXS5pbmRleE9mKHVybCkgIT09IC0xKSB7XG4gICAgICAgICAgICBtYXRjaGVzLnB1c2goZWxlbXNbaV0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG1hdGNoZXM7XG59O1xuXG4vKipcbiAqIEBwYXJhbSBmaWxlRXh0ZW5zaW9uXG4gKiBAcmV0dXJucyB7e2VsZW1zOiBOb2RlTGlzdCwgYXR0cjogKn19XG4gKi9cbnN5bmMuZ2V0RWxlbXMgPSBmdW5jdGlvbihmaWxlRXh0ZW5zaW9uKSB7XG5cbiAgICB2YXIgdGFnTmFtZSA9IHN5bmMuZ2V0VGFnTmFtZShmaWxlRXh0ZW5zaW9uKTtcbiAgICB2YXIgYXR0ciAgICA9IHN5bmMuZ2V0QXR0cih0YWdOYW1lKTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGVsZW1zOiBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSh0YWdOYW1lKSxcbiAgICAgICAgYXR0cjogYXR0clxuICAgIH07XG59O1xuXG4vKipcbiAqIEBwYXJhbSBjb25maXJtXG4gKi9cbnN5bmMucmVsb2FkQnJvd3NlciA9IGZ1bmN0aW9uIChjb25maXJtKSB7XG4gICAgaWYgKGNvbmZpcm0pIHtcbiAgICAgICAgdXRpbHMucmVsb2FkQnJvd3NlcigpO1xuICAgIH1cbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0cy5ldmVudHMgPSB7fTtcblxuLyoqXG4gKiBAcGFyYW0gbmFtZVxuICogQHBhcmFtIGRhdGFcbiAqL1xuZXhwb3J0cy5lbWl0ID0gZnVuY3Rpb24gKG5hbWUsIGRhdGEpIHtcbiAgICB2YXIgZXZlbnQgPSBleHBvcnRzLmV2ZW50c1tuYW1lXTtcbiAgICB2YXIgbGlzdGVuZXJzO1xuICAgIGlmIChldmVudCAmJiBldmVudC5saXN0ZW5lcnMpIHtcbiAgICAgICAgbGlzdGVuZXJzID0gZXZlbnQubGlzdGVuZXJzO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGxpc3RlbmVycy5sZW5ndGg7IGkgPCBuOyBpICs9IDEpIHtcbiAgICAgICAgICAgIGxpc3RlbmVyc1tpXShkYXRhKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qKlxuICogQHBhcmFtIG5hbWVcbiAqIEBwYXJhbSBmdW5jXG4gKi9cbmV4cG9ydHMub24gPSBmdW5jdGlvbiAobmFtZSwgZnVuYykge1xuICAgIHZhciBldmVudHMgPSBleHBvcnRzLmV2ZW50cztcbiAgICBpZiAoIWV2ZW50c1tuYW1lXSkge1xuICAgICAgICBldmVudHNbbmFtZV0gPSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnM6IFtmdW5jXVxuICAgICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGV2ZW50c1tuYW1lXS5saXN0ZW5lcnMucHVzaChmdW5jKTtcbiAgICB9XG59OyIsImV4cG9ydHMuX0VsZW1lbnRDYWNoZSA9IGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBjYWNoZSA9IHt9LFxuICAgICAgICBndWlkQ291bnRlciA9IDEsXG4gICAgICAgIGV4cGFuZG8gPSBcImRhdGFcIiArIChuZXcgRGF0ZSkuZ2V0VGltZSgpO1xuXG4gICAgdGhpcy5nZXREYXRhID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgdmFyIGd1aWQgPSBlbGVtW2V4cGFuZG9dO1xuICAgICAgICBpZiAoIWd1aWQpIHtcbiAgICAgICAgICAgIGd1aWQgPSBlbGVtW2V4cGFuZG9dID0gZ3VpZENvdW50ZXIrKztcbiAgICAgICAgICAgIGNhY2hlW2d1aWRdID0ge307XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNhY2hlW2d1aWRdO1xuICAgIH07XG5cbiAgICB0aGlzLnJlbW92ZURhdGEgPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICB2YXIgZ3VpZCA9IGVsZW1bZXhwYW5kb107XG4gICAgICAgIGlmICghZ3VpZCkgcmV0dXJuO1xuICAgICAgICBkZWxldGUgY2FjaGVbZ3VpZF07XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBkZWxldGUgZWxlbVtleHBhbmRvXTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGVsZW0ucmVtb3ZlQXR0cmlidXRlKSB7XG4gICAgICAgICAgICAgICAgZWxlbS5yZW1vdmVBdHRyaWJ1dGUoZXhwYW5kbyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufTtcblxuLyoqXG4gKiBGaXggYW4gZXZlbnRcbiAqIEBwYXJhbSBldmVudFxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydHMuX2ZpeEV2ZW50ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cbiAgICBmdW5jdGlvbiByZXR1cm5UcnVlKCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXR1cm5GYWxzZSgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghZXZlbnQgfHwgIWV2ZW50LnN0b3BQcm9wYWdhdGlvbikge1xuICAgICAgICB2YXIgb2xkID0gZXZlbnQgfHwgd2luZG93LmV2ZW50O1xuXG4gICAgICAgIC8vIENsb25lIHRoZSBvbGQgb2JqZWN0IHNvIHRoYXQgd2UgY2FuIG1vZGlmeSB0aGUgdmFsdWVzXG4gICAgICAgIGV2ZW50ID0ge307XG5cbiAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBvbGQpIHtcbiAgICAgICAgICAgIGV2ZW50W3Byb3BdID0gb2xkW3Byb3BdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGhlIGV2ZW50IG9jY3VycmVkIG9uIHRoaXMgZWxlbWVudFxuICAgICAgICBpZiAoIWV2ZW50LnRhcmdldCkge1xuICAgICAgICAgICAgZXZlbnQudGFyZ2V0ID0gZXZlbnQuc3JjRWxlbWVudCB8fCBkb2N1bWVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhhbmRsZSB3aGljaCBvdGhlciBlbGVtZW50IHRoZSBldmVudCBpcyByZWxhdGVkIHRvXG4gICAgICAgIGV2ZW50LnJlbGF0ZWRUYXJnZXQgPSBldmVudC5mcm9tRWxlbWVudCA9PT0gZXZlbnQudGFyZ2V0ID9cbiAgICAgICAgICAgIGV2ZW50LnRvRWxlbWVudCA6XG4gICAgICAgICAgICBldmVudC5mcm9tRWxlbWVudDtcblxuICAgICAgICAvLyBTdG9wIHRoZSBkZWZhdWx0IGJyb3dzZXIgYWN0aW9uXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZXZlbnQucmV0dXJuVmFsdWUgPSBmYWxzZTtcbiAgICAgICAgICAgIGV2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCA9IHJldHVyblRydWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgZXZlbnQuaXNEZWZhdWx0UHJldmVudGVkID0gcmV0dXJuRmFsc2U7XG5cbiAgICAgICAgLy8gU3RvcCB0aGUgZXZlbnQgZnJvbSBidWJibGluZ1xuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBldmVudC5jYW5jZWxCdWJibGUgPSB0cnVlO1xuICAgICAgICAgICAgZXZlbnQuaXNQcm9wYWdhdGlvblN0b3BwZWQgPSByZXR1cm5UcnVlO1xuICAgICAgICB9O1xuXG4gICAgICAgIGV2ZW50LmlzUHJvcGFnYXRpb25TdG9wcGVkID0gcmV0dXJuRmFsc2U7XG5cbiAgICAgICAgLy8gU3RvcCB0aGUgZXZlbnQgZnJvbSBidWJibGluZyBhbmQgZXhlY3V0aW5nIG90aGVyIGhhbmRsZXJzXG4gICAgICAgIGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuaXNJbW1lZGlhdGVQcm9wYWdhdGlvblN0b3BwZWQgPSByZXR1cm5UcnVlO1xuICAgICAgICAgICAgdGhpcy5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgfTtcblxuICAgICAgICBldmVudC5pc0ltbWVkaWF0ZVByb3BhZ2F0aW9uU3RvcHBlZCA9IHJldHVybkZhbHNlO1xuXG4gICAgICAgIC8vIEhhbmRsZSBtb3VzZSBwb3NpdGlvblxuICAgICAgICBpZiAoZXZlbnQuY2xpZW50WCAhPSBudWxsKSB7XG4gICAgICAgICAgICB2YXIgZG9jID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LCBib2R5ID0gZG9jdW1lbnQuYm9keTtcblxuICAgICAgICAgICAgZXZlbnQucGFnZVggPSBldmVudC5jbGllbnRYICtcbiAgICAgICAgICAgIChkb2MgJiYgZG9jLnNjcm9sbExlZnQgfHwgYm9keSAmJiBib2R5LnNjcm9sbExlZnQgfHwgMCkgLVxuICAgICAgICAgICAgKGRvYyAmJiBkb2MuY2xpZW50TGVmdCB8fCBib2R5ICYmIGJvZHkuY2xpZW50TGVmdCB8fCAwKTtcbiAgICAgICAgICAgIGV2ZW50LnBhZ2VZID0gZXZlbnQuY2xpZW50WSArXG4gICAgICAgICAgICAoZG9jICYmIGRvYy5zY3JvbGxUb3AgfHwgYm9keSAmJiBib2R5LnNjcm9sbFRvcCB8fCAwKSAtXG4gICAgICAgICAgICAoZG9jICYmIGRvYy5jbGllbnRUb3AgfHwgYm9keSAmJiBib2R5LmNsaWVudFRvcCB8fCAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhhbmRsZSBrZXkgcHJlc3Nlc1xuICAgICAgICBldmVudC53aGljaCA9IGV2ZW50LmNoYXJDb2RlIHx8IGV2ZW50LmtleUNvZGU7XG5cbiAgICAgICAgLy8gRml4IGJ1dHRvbiBmb3IgbW91c2UgY2xpY2tzOlxuICAgICAgICAvLyAwID09IGxlZnQ7IDEgPT0gbWlkZGxlOyAyID09IHJpZ2h0XG4gICAgICAgIGlmIChldmVudC5idXR0b24gIT0gbnVsbCkge1xuICAgICAgICAgICAgZXZlbnQuYnV0dG9uID0gKGV2ZW50LmJ1dHRvbiAmIDEgPyAwIDpcbiAgICAgICAgICAgICAgICAoZXZlbnQuYnV0dG9uICYgNCA/IDEgOlxuICAgICAgICAgICAgICAgICAgICAoZXZlbnQuYnV0dG9uICYgMiA/IDIgOiAwKSkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGV2ZW50O1xufTtcblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZXhwb3J0cy5fRXZlbnRNYW5hZ2VyID0gZnVuY3Rpb24gKGNhY2hlKSB7XG5cbiAgICB2YXIgbmV4dEd1aWQgPSAxO1xuXG4gICAgdGhpcy5hZGRFdmVudCA9IGZ1bmN0aW9uIChlbGVtLCB0eXBlLCBmbikge1xuXG4gICAgICAgIHZhciBkYXRhID0gY2FjaGUuZ2V0RGF0YShlbGVtKTtcblxuICAgICAgICBpZiAoIWRhdGEuaGFuZGxlcnMpIGRhdGEuaGFuZGxlcnMgPSB7fTtcblxuICAgICAgICBpZiAoIWRhdGEuaGFuZGxlcnNbdHlwZV0pXG4gICAgICAgICAgICBkYXRhLmhhbmRsZXJzW3R5cGVdID0gW107XG5cbiAgICAgICAgaWYgKCFmbi5ndWlkKSBmbi5ndWlkID0gbmV4dEd1aWQrKztcblxuICAgICAgICBkYXRhLmhhbmRsZXJzW3R5cGVdLnB1c2goZm4pO1xuXG4gICAgICAgIGlmICghZGF0YS5kaXNwYXRjaGVyKSB7XG4gICAgICAgICAgICBkYXRhLmRpc2FibGVkID0gZmFsc2U7XG4gICAgICAgICAgICBkYXRhLmRpc3BhdGNoZXIgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmRpc2FibGVkKSByZXR1cm47XG4gICAgICAgICAgICAgICAgZXZlbnQgPSBleHBvcnRzLl9maXhFdmVudChldmVudCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgaGFuZGxlcnMgPSBkYXRhLmhhbmRsZXJzW2V2ZW50LnR5cGVdO1xuICAgICAgICAgICAgICAgIGlmIChoYW5kbGVycykge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBuID0gMDsgbiA8IGhhbmRsZXJzLmxlbmd0aDsgbisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVyc1tuXS5jYWxsKGVsZW0sIGV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGF0YS5oYW5kbGVyc1t0eXBlXS5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgaWYgKGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICBlbGVtLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgZGF0YS5kaXNwYXRjaGVyLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChkb2N1bWVudC5hdHRhY2hFdmVudCkge1xuICAgICAgICAgICAgICAgIGVsZW0uYXR0YWNoRXZlbnQoXCJvblwiICsgdHlwZSwgZGF0YS5kaXNwYXRjaGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHRpZHlVcChlbGVtLCB0eXBlKSB7XG5cbiAgICAgICAgZnVuY3Rpb24gaXNFbXB0eShvYmplY3QpIHtcbiAgICAgICAgICAgIGZvciAodmFyIHByb3AgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZGF0YSA9IGNhY2hlLmdldERhdGEoZWxlbSk7XG5cbiAgICAgICAgaWYgKGRhdGEuaGFuZGxlcnNbdHlwZV0ubGVuZ3RoID09PSAwKSB7XG5cbiAgICAgICAgICAgIGRlbGV0ZSBkYXRhLmhhbmRsZXJzW3R5cGVdO1xuXG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICAgICAgICAgIGVsZW0ucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBkYXRhLmRpc3BhdGNoZXIsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGRvY3VtZW50LmRldGFjaEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgZWxlbS5kZXRhY2hFdmVudChcIm9uXCIgKyB0eXBlLCBkYXRhLmRpc3BhdGNoZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzRW1wdHkoZGF0YS5oYW5kbGVycykpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBkYXRhLmhhbmRsZXJzO1xuICAgICAgICAgICAgZGVsZXRlIGRhdGEuZGlzcGF0Y2hlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc0VtcHR5KGRhdGEpKSB7XG4gICAgICAgICAgICBjYWNoZS5yZW1vdmVEYXRhKGVsZW0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5yZW1vdmVFdmVudCA9IGZ1bmN0aW9uIChlbGVtLCB0eXBlLCBmbikge1xuXG4gICAgICAgIHZhciBkYXRhID0gY2FjaGUuZ2V0RGF0YShlbGVtKTtcblxuICAgICAgICBpZiAoIWRhdGEuaGFuZGxlcnMpIHJldHVybjtcblxuICAgICAgICB2YXIgcmVtb3ZlVHlwZSA9IGZ1bmN0aW9uICh0KSB7XG4gICAgICAgICAgICBkYXRhLmhhbmRsZXJzW3RdID0gW107XG4gICAgICAgICAgICB0aWR5VXAoZWxlbSwgdCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKCF0eXBlKSB7XG4gICAgICAgICAgICBmb3IgKHZhciB0IGluIGRhdGEuaGFuZGxlcnMpIHJlbW92ZVR5cGUodCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaGFuZGxlcnMgPSBkYXRhLmhhbmRsZXJzW3R5cGVdO1xuICAgICAgICBpZiAoIWhhbmRsZXJzKSByZXR1cm47XG5cbiAgICAgICAgaWYgKCFmbikge1xuICAgICAgICAgICAgcmVtb3ZlVHlwZSh0eXBlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmbi5ndWlkKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBuID0gMDsgbiA8IGhhbmRsZXJzLmxlbmd0aDsgbisrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGhhbmRsZXJzW25dLmd1aWQgPT09IGZuLmd1aWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlcnMuc3BsaWNlKG4tLSwgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRpZHlVcChlbGVtLCB0eXBlKTtcblxuICAgIH07XG5cbiAgICB0aGlzLnByb3h5ID0gZnVuY3Rpb24gKGNvbnRleHQsIGZuKSB7XG4gICAgICAgIGlmICghZm4uZ3VpZCkge1xuICAgICAgICAgICAgZm4uZ3VpZCA9IG5leHRHdWlkKys7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJldCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBmbi5hcHBseShjb250ZXh0LCBhcmd1bWVudHMpO1xuICAgICAgICB9O1xuICAgICAgICByZXQuZ3VpZCA9IGZuLmd1aWQ7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcbn07XG5cblxuXG4vKipcbiAqIFRyaWdnZXIgYSBjbGljayBvbiBhbiBlbGVtZW50XG4gKiBAcGFyYW0gZWxlbVxuICovXG5leHBvcnRzLnRyaWdnZXJDbGljayA9IGZ1bmN0aW9uIChlbGVtKSB7XG5cbiAgICB2YXIgZXZPYmo7XG5cbiAgICBpZiAoZG9jdW1lbnQuY3JlYXRlRXZlbnQpIHtcbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZXZPYmogPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIk1vdXNlRXZlbnRzXCIpO1xuICAgICAgICAgICAgZXZPYmouaW5pdEV2ZW50KFwiY2xpY2tcIiwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICAgICAgICBlbGVtLmRpc3BhdGNoRXZlbnQoZXZPYmopO1xuICAgICAgICB9LCAwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQuY3JlYXRlRXZlbnRPYmplY3QpIHtcbiAgICAgICAgICAgICAgICBldk9iaiA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50T2JqZWN0KCk7XG4gICAgICAgICAgICAgICAgZXZPYmouY2FuY2VsQnViYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBlbGVtLmZpcmVFdmVudChcIm9uXCIgKyBcImNsaWNrXCIsIGV2T2JqKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgMCk7XG4gICAgfVxufTtcblxudmFyIGNhY2hlID0gbmV3IGV4cG9ydHMuX0VsZW1lbnRDYWNoZSgpO1xudmFyIGV2ZW50TWFuYWdlciA9IG5ldyBleHBvcnRzLl9FdmVudE1hbmFnZXIoY2FjaGUpO1xuXG5ldmVudE1hbmFnZXIudHJpZ2dlckNsaWNrID0gZXhwb3J0cy50cmlnZ2VyQ2xpY2s7XG5cbmV4cG9ydHMubWFuYWdlciA9IGV2ZW50TWFuYWdlcjtcblxuXG5cbiIsIlwidXNlIHN0cmljdFwiO1xuXG4vKipcbiAqIFRoaXMgaXMgdGhlIHBsdWdpbiBmb3Igc3luY2luZyBjbGlja3MgYmV0d2VlbiBicm93c2Vyc1xuICogQHR5cGUge3N0cmluZ31cbiAqL1xudmFyIEVWRU5UX05BTUUgID0gXCJjbGlja1wiO1xudmFyIE9QVF9QQVRIICAgID0gXCJnaG9zdE1vZGUuY2xpY2tzXCI7XG5leHBvcnRzLmNhbkVtaXRFdmVudHMgPSB0cnVlO1xuXG4vKipcbiAqIEBwYXJhbSB7QnJvd3NlclN5bmN9IGJzXG4gKiBAcGFyYW0gZXZlbnRNYW5hZ2VyXG4gKi9cbmV4cG9ydHMuaW5pdCA9IGZ1bmN0aW9uIChicywgZXZlbnRNYW5hZ2VyKSB7XG4gICAgZXZlbnRNYW5hZ2VyLmFkZEV2ZW50KGRvY3VtZW50LmJvZHksIEVWRU5UX05BTUUsIGV4cG9ydHMuYnJvd3NlckV2ZW50KGJzKSk7XG4gICAgYnMuc29ja2V0Lm9uKEVWRU5UX05BTUUsIGV4cG9ydHMuc29ja2V0RXZlbnQoYnMsIGV2ZW50TWFuYWdlcikpO1xufTtcblxuLyoqXG4gKiBVc2VzIGV2ZW50IGRlbGVnYXRpb24gdG8gZGV0ZXJtaW5lIHRoZSBjbGlja2VkIGVsZW1lbnRcbiAqIEBwYXJhbSB7QnJvd3NlclN5bmN9IGJzXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gKi9cbmV4cG9ydHMuYnJvd3NlckV2ZW50ID0gZnVuY3Rpb24gKGJzKSB7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKGV2ZW50KSB7XG5cbiAgICAgICAgaWYgKGV4cG9ydHMuY2FuRW1pdEV2ZW50cykge1xuXG4gICAgICAgICAgICB2YXIgZWxlbSA9IGV2ZW50LnRhcmdldCB8fCBldmVudC5zcmNFbGVtZW50O1xuXG4gICAgICAgICAgICBpZiAoZWxlbS50eXBlID09PSBcImNoZWNrYm94XCIgfHwgZWxlbS50eXBlID09PSBcInJhZGlvXCIpIHtcbiAgICAgICAgICAgICAgICBicy51dGlscy5mb3JjZUNoYW5nZShlbGVtKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJzLnNvY2tldC5lbWl0KEVWRU5UX05BTUUsIGJzLnV0aWxzLmdldEVsZW1lbnREYXRhKGVsZW0pKTtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXhwb3J0cy5jYW5FbWl0RXZlbnRzID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH07XG59O1xuXG4vKipcbiAqIEBwYXJhbSB7QnJvd3NlclN5bmN9IGJzXG4gKiBAcGFyYW0ge21hbmFnZXJ9IGV2ZW50TWFuYWdlclxuICogQHJldHVybnMge0Z1bmN0aW9ufVxuICovXG5leHBvcnRzLnNvY2tldEV2ZW50ID0gZnVuY3Rpb24gKGJzLCBldmVudE1hbmFnZXIpIHtcblxuICAgIHJldHVybiBmdW5jdGlvbiAoZGF0YSkge1xuXG4gICAgICAgIGlmICghYnMuY2FuU3luYyhkYXRhLCBPUFRfUEFUSCkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBlbGVtID0gYnMudXRpbHMuZ2V0U2luZ2xlRWxlbWVudChkYXRhLnRhZ05hbWUsIGRhdGEuaW5kZXgpO1xuXG4gICAgICAgIGlmIChlbGVtKSB7XG4gICAgICAgICAgICBleHBvcnRzLmNhbkVtaXRFdmVudHMgPSBmYWxzZTtcbiAgICAgICAgICAgIGV2ZW50TWFuYWdlci50cmlnZ2VyQ2xpY2soZWxlbSk7XG4gICAgICAgIH1cbiAgICB9O1xufTsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyoqXG4gKiBUaGlzIGlzIHRoZSBwbHVnaW4gZm9yIHN5bmNpbmcgY2xpY2tzIGJldHdlZW4gYnJvd3NlcnNcbiAqIEB0eXBlIHtzdHJpbmd9XG4gKi9cbnZhciBFVkVOVF9OQU1FICA9IFwiaW5wdXQ6dGV4dFwiO1xudmFyIE9QVF9QQVRIICAgID0gXCJnaG9zdE1vZGUuZm9ybXMuaW5wdXRzXCI7XG5leHBvcnRzLmNhbkVtaXRFdmVudHMgPSB0cnVlO1xuXG4vKipcbiAqIEBwYXJhbSB7QnJvd3NlclN5bmN9IGJzXG4gKiBAcGFyYW0gZXZlbnRNYW5hZ2VyXG4gKi9cbmV4cG9ydHMuaW5pdCA9IGZ1bmN0aW9uIChicywgZXZlbnRNYW5hZ2VyKSB7XG4gICAgZXZlbnRNYW5hZ2VyLmFkZEV2ZW50KGRvY3VtZW50LmJvZHksIFwia2V5dXBcIiwgZXhwb3J0cy5icm93c2VyRXZlbnQoYnMpKTtcbiAgICBicy5zb2NrZXQub24oRVZFTlRfTkFNRSwgZXhwb3J0cy5zb2NrZXRFdmVudChicywgZXZlbnRNYW5hZ2VyKSk7XG59O1xuXG4vKipcbiAqIEBwYXJhbSB7QnJvd3NlclN5bmN9IGJzXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gKi9cbmV4cG9ydHMuYnJvd3NlckV2ZW50ID0gZnVuY3Rpb24gKGJzKSB7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKGV2ZW50KSB7XG5cbiAgICAgICAgdmFyIGVsZW0gPSBldmVudC50YXJnZXQgfHwgZXZlbnQuc3JjRWxlbWVudDtcbiAgICAgICAgdmFyIGRhdGE7XG5cbiAgICAgICAgaWYgKGV4cG9ydHMuY2FuRW1pdEV2ZW50cykge1xuXG4gICAgICAgICAgICBpZiAoZWxlbS50YWdOYW1lID09PSBcIklOUFVUXCIgfHwgZWxlbS50YWdOYW1lID09PSBcIlRFWFRBUkVBXCIpIHtcblxuICAgICAgICAgICAgICAgIGRhdGEgPSBicy51dGlscy5nZXRFbGVtZW50RGF0YShlbGVtKTtcbiAgICAgICAgICAgICAgICBkYXRhLnZhbHVlID0gZWxlbS52YWx1ZTtcblxuICAgICAgICAgICAgICAgIGJzLnNvY2tldC5lbWl0KEVWRU5UX05BTUUsIGRhdGEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBleHBvcnRzLmNhbkVtaXRFdmVudHMgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfTtcbn07XG5cbi8qKlxuICogQHBhcmFtIHtCcm93c2VyU3luY30gYnNcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn1cbiAqL1xuZXhwb3J0cy5zb2NrZXRFdmVudCA9IGZ1bmN0aW9uIChicykge1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChkYXRhKSB7XG5cbiAgICAgICAgaWYgKCFicy5jYW5TeW5jKGRhdGEsIE9QVF9QQVRIKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGVsZW0gPSBicy51dGlscy5nZXRTaW5nbGVFbGVtZW50KGRhdGEudGFnTmFtZSwgZGF0YS5pbmRleCk7XG5cbiAgICAgICAgaWYgKGVsZW0pIHtcbiAgICAgICAgICAgIGVsZW0udmFsdWUgPSBkYXRhLnZhbHVlO1xuICAgICAgICAgICAgcmV0dXJuIGVsZW07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmV4cG9ydHMucGx1Z2lucyA9IHtcbiAgICBcImlucHV0c1wiOiAgcmVxdWlyZShcIi4vZ2hvc3Rtb2RlLmZvcm1zLmlucHV0XCIpLFxuICAgIFwidG9nZ2xlc1wiOiByZXF1aXJlKFwiLi9naG9zdG1vZGUuZm9ybXMudG9nZ2xlc1wiKSxcbiAgICBcInN1Ym1pdFwiOiAgcmVxdWlyZShcIi4vZ2hvc3Rtb2RlLmZvcm1zLnN1Ym1pdFwiKVxufTtcblxuLyoqXG4gKiBMb2FkIHBsdWdpbnMgZm9yIGVuYWJsZWQgb3B0aW9uc1xuICogQHBhcmFtIGJzXG4gKi9cbmV4cG9ydHMuaW5pdCA9IGZ1bmN0aW9uIChicywgZXZlbnRNYW5hZ2VyKSB7XG5cbiAgICB2YXIgY2hlY2tPcHQgPSB0cnVlO1xuICAgIHZhciBvcHRpb25zID0gYnMub3B0aW9ucy5naG9zdE1vZGUuZm9ybXM7XG5cbiAgICBpZiAob3B0aW9ucyA9PT0gdHJ1ZSkge1xuICAgICAgICBjaGVja09wdCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluaXQobmFtZSkge1xuICAgICAgICBleHBvcnRzLnBsdWdpbnNbbmFtZV0uaW5pdChicywgZXZlbnRNYW5hZ2VyKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBuYW1lIGluIGV4cG9ydHMucGx1Z2lucykge1xuICAgICAgICBpZiAoIWNoZWNrT3B0KSB7XG4gICAgICAgICAgICBpbml0KG5hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKG9wdGlvbnNbbmFtZV0pIHtcbiAgICAgICAgICAgICAgICBpbml0KG5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyoqXG4gKiBUaGlzIGlzIHRoZSBwbHVnaW4gZm9yIHN5bmNpbmcgY2xpY2tzIGJldHdlZW4gYnJvd3NlcnNcbiAqIEB0eXBlIHtzdHJpbmd9XG4gKi9cbnZhciBFVkVOVF9OQU1FICA9IFwiZm9ybTpzdWJtaXRcIjtcbnZhciBPUFRfUEFUSCAgICA9IFwiZ2hvc3RNb2RlLmZvcm1zLnN1Ym1pdFwiO1xuZXhwb3J0cy5jYW5FbWl0RXZlbnRzID0gdHJ1ZTtcblxuLyoqXG4gKiBAcGFyYW0ge0Jyb3dzZXJTeW5jfSBic1xuICogQHBhcmFtIGV2ZW50TWFuYWdlclxuICovXG5leHBvcnRzLmluaXQgPSBmdW5jdGlvbiAoYnMsIGV2ZW50TWFuYWdlcikge1xuICAgIHZhciBicm93c2VyRXZlbnQgPSBleHBvcnRzLmJyb3dzZXJFdmVudChicyk7XG4gICAgZXZlbnRNYW5hZ2VyLmFkZEV2ZW50KGRvY3VtZW50LmJvZHksIFwic3VibWl0XCIsIGJyb3dzZXJFdmVudCk7XG4gICAgZXZlbnRNYW5hZ2VyLmFkZEV2ZW50KGRvY3VtZW50LmJvZHksIFwicmVzZXRcIiwgYnJvd3NlckV2ZW50KTtcbiAgICBicy5zb2NrZXQub24oRVZFTlRfTkFNRSwgZXhwb3J0cy5zb2NrZXRFdmVudChicywgZXZlbnRNYW5hZ2VyKSk7XG59O1xuXG4vKipcbiAqIEBwYXJhbSB7QnJvd3NlclN5bmN9IGJzXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gKi9cbmV4cG9ydHMuYnJvd3NlckV2ZW50ID0gZnVuY3Rpb24gKGJzKSB7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIGlmIChleHBvcnRzLmNhbkVtaXRFdmVudHMpIHtcbiAgICAgICAgICAgIHZhciBlbGVtID0gZXZlbnQudGFyZ2V0IHx8IGV2ZW50LnNyY0VsZW1lbnQ7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IGJzLnV0aWxzLmdldEVsZW1lbnREYXRhKGVsZW0pO1xuICAgICAgICAgICAgZGF0YS50eXBlID0gZXZlbnQudHlwZTtcbiAgICAgICAgICAgIGJzLnNvY2tldC5lbWl0KEVWRU5UX05BTUUsIGRhdGEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXhwb3J0cy5jYW5FbWl0RXZlbnRzID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH07XG59O1xuXG4vKipcbiAqIEBwYXJhbSB7QnJvd3NlclN5bmN9IGJzXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gKi9cbmV4cG9ydHMuc29ja2V0RXZlbnQgPSBmdW5jdGlvbiAoYnMpIHtcblxuICAgIHJldHVybiBmdW5jdGlvbiAoZGF0YSkge1xuXG4gICAgICAgIGlmICghYnMuY2FuU3luYyhkYXRhLCBPUFRfUEFUSCkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBlbGVtID0gYnMudXRpbHMuZ2V0U2luZ2xlRWxlbWVudChkYXRhLnRhZ05hbWUsIGRhdGEuaW5kZXgpO1xuXG4gICAgICAgIGV4cG9ydHMuY2FuRW1pdEV2ZW50cyA9IGZhbHNlO1xuXG4gICAgICAgIGlmIChlbGVtICYmIGRhdGEudHlwZSA9PT0gXCJzdWJtaXRcIikge1xuICAgICAgICAgICAgZWxlbS5zdWJtaXQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChlbGVtICYmIGRhdGEudHlwZSA9PT0gXCJyZXNldFwiKSB7XG4gICAgICAgICAgICBlbGVtLnJlc2V0KCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKipcbiAqIFRoaXMgaXMgdGhlIHBsdWdpbiBmb3Igc3luY2luZyBjbGlja3MgYmV0d2VlbiBicm93c2Vyc1xuICogQHR5cGUge3N0cmluZ31cbiAqL1xudmFyIEVWRU5UX05BTUUgID0gXCJpbnB1dDp0b2dnbGVzXCI7XG52YXIgT1BUX1BBVEggICAgPSBcImdob3N0TW9kZS5mb3Jtcy50b2dnbGVzXCI7XG5leHBvcnRzLmNhbkVtaXRFdmVudHMgPSB0cnVlO1xuXG4vKipcbiAqIEBwYXJhbSB7QnJvd3NlclN5bmN9IGJzXG4gKiBAcGFyYW0gZXZlbnRNYW5hZ2VyXG4gKi9cbmV4cG9ydHMuaW5pdCA9IGZ1bmN0aW9uIChicywgZXZlbnRNYW5hZ2VyKSB7XG4gICAgdmFyIGJyb3dzZXJFdmVudCA9IGV4cG9ydHMuYnJvd3NlckV2ZW50KGJzKTtcbiAgICBleHBvcnRzLmFkZEV2ZW50cyhldmVudE1hbmFnZXIsIGJyb3dzZXJFdmVudCk7XG4gICAgYnMuc29ja2V0Lm9uKEVWRU5UX05BTUUsIGV4cG9ydHMuc29ja2V0RXZlbnQoYnMsIGV2ZW50TWFuYWdlcikpO1xufTtcblxuLyoqXG4gKiBAcGFyYW0gZXZlbnRNYW5hZ2VyXG4gKiBAcGFyYW0gZXZlbnRcbiAqL1xuZXhwb3J0cy5hZGRFdmVudHMgPSBmdW5jdGlvbiAoZXZlbnRNYW5hZ2VyLCBldmVudCkge1xuXG4gICAgdmFyIGVsZW1zICAgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcInNlbGVjdFwiKTtcbiAgICB2YXIgaW5wdXRzICA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaW5wdXRcIik7XG5cbiAgICBhZGRFdmVudHMoZWxlbXMpO1xuICAgIGFkZEV2ZW50cyhpbnB1dHMpO1xuXG4gICAgZnVuY3Rpb24gYWRkRXZlbnRzKGRvbUVsZW1zKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gZG9tRWxlbXMubGVuZ3RoOyBpIDwgbjsgaSArPSAxKSB7XG4gICAgICAgICAgICBldmVudE1hbmFnZXIuYWRkRXZlbnQoZG9tRWxlbXNbaV0sIFwiY2hhbmdlXCIsIGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qKlxuICogQHBhcmFtIHtCcm93c2VyU3luY30gYnNcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn1cbiAqL1xuZXhwb3J0cy5icm93c2VyRXZlbnQgPSBmdW5jdGlvbiAoYnMpIHtcblxuICAgIHJldHVybiBmdW5jdGlvbiAoZXZlbnQpIHtcblxuICAgICAgICBpZiAoZXhwb3J0cy5jYW5FbWl0RXZlbnRzKSB7XG4gICAgICAgICAgICB2YXIgZWxlbSA9IGV2ZW50LnRhcmdldCB8fCBldmVudC5zcmNFbGVtZW50O1xuICAgICAgICAgICAgdmFyIGRhdGE7XG4gICAgICAgICAgICBpZiAoZWxlbS50eXBlID09PSBcInJhZGlvXCIgfHwgZWxlbS50eXBlID09PSBcImNoZWNrYm94XCIgfHwgZWxlbS50YWdOYW1lID09PSBcIlNFTEVDVFwiKSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IGJzLnV0aWxzLmdldEVsZW1lbnREYXRhKGVsZW0pO1xuICAgICAgICAgICAgICAgIGRhdGEudHlwZSAgICA9IGVsZW0udHlwZTtcbiAgICAgICAgICAgICAgICBkYXRhLnZhbHVlICAgPSBlbGVtLnZhbHVlO1xuICAgICAgICAgICAgICAgIGRhdGEuY2hlY2tlZCA9IGVsZW0uY2hlY2tlZDtcbiAgICAgICAgICAgICAgICBicy5zb2NrZXQuZW1pdChFVkVOVF9OQU1FLCBkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGV4cG9ydHMuY2FuRW1pdEV2ZW50cyA9IHRydWU7XG4gICAgICAgIH1cblxuICAgIH07XG59O1xuXG4vKipcbiAqIEBwYXJhbSB7QnJvd3NlclN5bmN9IGJzXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gKi9cbmV4cG9ydHMuc29ja2V0RXZlbnQgPSBmdW5jdGlvbiAoYnMpIHtcblxuICAgIHJldHVybiBmdW5jdGlvbiAoZGF0YSkge1xuXG4gICAgICAgIGlmICghYnMuY2FuU3luYyhkYXRhLCBPUFRfUEFUSCkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4cG9ydHMuY2FuRW1pdEV2ZW50cyA9IGZhbHNlO1xuXG4gICAgICAgIHZhciBlbGVtID0gYnMudXRpbHMuZ2V0U2luZ2xlRWxlbWVudChkYXRhLnRhZ05hbWUsIGRhdGEuaW5kZXgpO1xuXG4gICAgICAgIGlmIChlbGVtKSB7XG4gICAgICAgICAgICBpZiAoZGF0YS50eXBlID09PSBcInJhZGlvXCIpIHtcbiAgICAgICAgICAgICAgICBlbGVtLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEudHlwZSA9PT0gXCJjaGVja2JveFwiKSB7XG4gICAgICAgICAgICAgICAgZWxlbS5jaGVja2VkID0gZGF0YS5jaGVja2VkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEudGFnTmFtZSA9PT0gXCJTRUxFQ1RcIikge1xuICAgICAgICAgICAgICAgIGVsZW0udmFsdWUgPSBkYXRhLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGVsZW07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZXZlbnRNYW5hZ2VyID0gcmVxdWlyZShcIi4vZXZlbnRzXCIpLm1hbmFnZXI7XG5cbmV4cG9ydHMucGx1Z2lucyA9IHtcbiAgICBcInNjcm9sbFwiOiAgIHJlcXVpcmUoXCIuL2dob3N0bW9kZS5zY3JvbGxcIiksXG4gICAgXCJjbGlja3NcIjogICByZXF1aXJlKFwiLi9naG9zdG1vZGUuY2xpY2tzXCIpLFxuICAgIFwiZm9ybXNcIjogICAgcmVxdWlyZShcIi4vZ2hvc3Rtb2RlLmZvcm1zXCIpLFxuICAgIFwibG9jYXRpb25cIjogcmVxdWlyZShcIi4vZ2hvc3Rtb2RlLmxvY2F0aW9uXCIpXG59O1xuXG4vKipcbiAqIExvYWQgcGx1Z2lucyBmb3IgZW5hYmxlZCBvcHRpb25zXG4gKiBAcGFyYW0gYnNcbiAqL1xuZXhwb3J0cy5pbml0ID0gZnVuY3Rpb24gKGJzKSB7XG4gICAgZm9yICh2YXIgbmFtZSBpbiBleHBvcnRzLnBsdWdpbnMpIHtcbiAgICAgICAgZXhwb3J0cy5wbHVnaW5zW25hbWVdLmluaXQoYnMsIGV2ZW50TWFuYWdlcik7XG4gICAgfVxufTsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyoqXG4gKiBUaGlzIGlzIHRoZSBwbHVnaW4gZm9yIHN5bmNpbmcgbG9jYXRpb25cbiAqIEB0eXBlIHtzdHJpbmd9XG4gKi9cbnZhciBFVkVOVF9OQU1FID0gXCJicm93c2VyOmxvY2F0aW9uXCI7XG52YXIgT1BUX1BBVEggICA9IFwiZ2hvc3RNb2RlLmxvY2F0aW9uXCI7XG5leHBvcnRzLmNhbkVtaXRFdmVudHMgPSB0cnVlO1xuXG4vKipcbiAqIEBwYXJhbSB7QnJvd3NlclN5bmN9IGJzXG4gKi9cbmV4cG9ydHMuaW5pdCA9IGZ1bmN0aW9uIChicykge1xuICAgIGJzLnNvY2tldC5vbihFVkVOVF9OQU1FLCBleHBvcnRzLnNvY2tldEV2ZW50KGJzKSk7XG59O1xuXG4vKipcbiAqIFJlc3BvbmQgdG8gc29ja2V0IGV2ZW50XG4gKi9cbmV4cG9ydHMuc29ja2V0RXZlbnQgPSBmdW5jdGlvbiAoYnMpIHtcblxuICAgIHJldHVybiBmdW5jdGlvbiAoZGF0YSkge1xuXG4gICAgICAgIGlmICghYnMuY2FuU3luYyhkYXRhLCBPUFRfUEFUSCkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkYXRhLnBhdGgpIHtcbiAgICAgICAgICAgIGV4cG9ydHMuc2V0UGF0aChkYXRhLnBhdGgpO1xuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBXaGVuIHRoZSBwYXRoIGNvbnRhaW5zIGEgaGFzaCwgd2UncmVcbiAgICAgICAgICAgICAqIG5vdCByZWxvYWRpbmcsIGJ1dCB3ZSBkbyB3YW50IHRvIHJlZ2lzdGVyIGFnYWluXG4gICAgICAgICAgICAgKiBzbyB0aGF0IHN1YnNjcmliZXJzIHNlZSB0aGUgbmV3IGxvY2F0aW9uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlmIChkYXRhLnBhdGgubWF0Y2goLyMvKSkge1xuICAgICAgICAgICAgICAgIGJzLnJlZ2lzdGVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBleHBvcnRzLnNldFVybChkYXRhLnVybCk7XG4gICAgICAgIH1cbiAgICB9O1xufTtcblxuLyoqXG4gKiBAcGFyYW0gdXJsXG4gKi9cbmV4cG9ydHMuc2V0VXJsID0gZnVuY3Rpb24gKHVybCkge1xuICAgIHdpbmRvdy5sb2NhdGlvbiA9IHVybDtcbn07XG5cbi8qKlxuICogQHBhcmFtIHBhdGhcbiAqL1xuZXhwb3J0cy5zZXRQYXRoID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgICB3aW5kb3cubG9jYXRpb24gPSB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyB3aW5kb3cubG9jYXRpb24uaG9zdCArIHBhdGg7XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKipcbiAqIFRoaXMgaXMgdGhlIHBsdWdpbiBmb3Igc3luY2luZyBzY3JvbGwgYmV0d2VlbiBkZXZpY2VzXG4gKiBAdHlwZSB7c3RyaW5nfVxuICovXG52YXIgV0lORE9XX0VWRU5UX05BTUUgID0gXCJzY3JvbGxcIjtcbnZhciBFTEVNRU5UX0VWRU5UX05BTUUgPSBcInNjcm9sbDplbGVtZW50XCI7XG52YXIgT1BUX1BBVEggICAgICAgICAgID0gXCJnaG9zdE1vZGUuc2Nyb2xsXCI7XG52YXIgdXRpbHM7XG5cbmV4cG9ydHMuY2FuRW1pdEV2ZW50cyA9IHRydWU7XG5cbi8qKlxuICogQHBhcmFtIHtCcm93c2VyU3luY30gYnNcbiAqIEBwYXJhbSBldmVudE1hbmFnZXJcbiAqL1xuZXhwb3J0cy5pbml0ID0gZnVuY3Rpb24gKGJzLCBldmVudE1hbmFnZXIpIHtcbiAgICB1dGlscyAgICAgPSBicy51dGlscztcbiAgICB2YXIgb3B0cyAgPSBicy5vcHRpb25zO1xuXG4gICAgLyoqXG4gICAgICogV2luZG93IFNjcm9sbCBldmVudHNcbiAgICAgKi9cbiAgICBldmVudE1hbmFnZXIuYWRkRXZlbnQod2luZG93LCBXSU5ET1dfRVZFTlRfTkFNRSwgZXhwb3J0cy5icm93c2VyRXZlbnQoYnMpKTtcbiAgICBicy5zb2NrZXQub24oV0lORE9XX0VWRU5UX05BTUUsIGV4cG9ydHMuc29ja2V0RXZlbnQoYnMpKTtcblxuICAgIC8qKlxuICAgICAqIGVsZW1lbnQgU2Nyb2xsIEV2ZW50c1xuICAgICAqL1xuICAgIHZhciBjYWNoZSA9IHt9O1xuICAgIGFkZEVsZW1lbnRTY3JvbGxFdmVudHMoXCJzY3JvbGxFbGVtZW50c1wiLCBmYWxzZSk7XG4gICAgYWRkRWxlbWVudFNjcm9sbEV2ZW50cyhcInNjcm9sbEVsZW1lbnRNYXBwaW5nXCIsIHRydWUpO1xuICAgIGJzLnNvY2tldC5vbihFTEVNRU5UX0VWRU5UX05BTUUsIGV4cG9ydHMuc29ja2V0RXZlbnRGb3JFbGVtZW50KGJzLCBjYWNoZSkpO1xuXG4gICAgZnVuY3Rpb24gYWRkRWxlbWVudFNjcm9sbEV2ZW50cyAoa2V5LCBtYXApIHtcbiAgICAgICAgaWYgKCFvcHRzW2tleV0gfHwgIW9wdHNba2V5XS5sZW5ndGggfHwgIShcInF1ZXJ5U2VsZWN0b3JBbGxcIiBpbiBkb2N1bWVudCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB1dGlscy5mb3JFYWNoKG9wdHNba2V5XSwgZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICAgICAgICB2YXIgZWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSB8fCBbXTtcbiAgICAgICAgICAgIHV0aWxzLmZvckVhY2goZWxlbXMsIGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRhdGEgPSB1dGlscy5nZXRFbGVtZW50RGF0YShlbGVtKTtcbiAgICAgICAgICAgICAgICBkYXRhLmNhY2hlU2VsZWN0b3IgPSBkYXRhLnRhZ05hbWUgKyBcIjpcIiArIGRhdGEuaW5kZXg7XG4gICAgICAgICAgICAgICAgZGF0YS5tYXAgPSBtYXA7XG4gICAgICAgICAgICAgICAgY2FjaGVbZGF0YS5jYWNoZVNlbGVjdG9yXSA9IGVsZW07XG4gICAgICAgICAgICAgICAgZXZlbnRNYW5hZ2VyLmFkZEV2ZW50KGVsZW0sIFdJTkRPV19FVkVOVF9OQU1FLCBleHBvcnRzLmJyb3dzZXJFdmVudEZvckVsZW1lbnQoYnMsIGVsZW0sIGRhdGEpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEBwYXJhbSB7QnJvd3NlclN5bmN9IGJzXG4gKi9cbmV4cG9ydHMuc29ja2V0RXZlbnQgPSBmdW5jdGlvbiAoYnMpIHtcblxuICAgIHJldHVybiBmdW5jdGlvbiAoZGF0YSkge1xuXG4gICAgICAgIGlmICghYnMuY2FuU3luYyhkYXRhLCBPUFRfUEFUSCkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzY3JvbGxTcGFjZSA9IHV0aWxzLmdldFNjcm9sbFNwYWNlKCk7XG5cbiAgICAgICAgZXhwb3J0cy5jYW5FbWl0RXZlbnRzID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKGJzLm9wdGlvbnMgJiYgYnMub3B0aW9ucy5zY3JvbGxQcm9wb3J0aW9uYWxseSkge1xuICAgICAgICAgICAgcmV0dXJuIHdpbmRvdy5zY3JvbGxUbygwLCBzY3JvbGxTcGFjZS55ICogZGF0YS5wb3NpdGlvbi5wcm9wb3J0aW9uYWwpOyAvLyAlIG9mIHkgYXhpcyBvZiBzY3JvbGwgdG8gcHhcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB3aW5kb3cuc2Nyb2xsVG8oMCwgZGF0YS5wb3NpdGlvbi5yYXcpO1xuICAgICAgICB9XG4gICAgfTtcbn07XG5cbi8qKlxuICogQHBhcmFtIGJzXG4gKi9cbmV4cG9ydHMuc29ja2V0RXZlbnRGb3JFbGVtZW50ID0gZnVuY3Rpb24gKGJzLCBjYWNoZSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoZGF0YSkge1xuXG4gICAgICAgIGlmICghYnMuY2FuU3luYyhkYXRhLCBPUFRfUEFUSCkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4cG9ydHMuY2FuRW1pdEV2ZW50cyA9IGZhbHNlO1xuXG4gICAgICAgIGZ1bmN0aW9uIHNjcm9sbE9uZSAoc2VsZWN0b3IsIHBvcykge1xuICAgICAgICAgICAgaWYgKGNhY2hlW3NlbGVjdG9yXSkge1xuICAgICAgICAgICAgICAgIGNhY2hlW3NlbGVjdG9yXS5zY3JvbGxUb3AgPSBwb3M7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGF0YS5tYXApIHtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhjYWNoZSkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgc2Nyb2xsT25lKGtleSwgZGF0YS5wb3NpdGlvbik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNjcm9sbE9uZShkYXRhLmVsZW0uY2FjaGVTZWxlY3RvciwgZGF0YS5wb3NpdGlvbik7XG4gICAgfTtcbn07XG5cbi8qKlxuICogQHBhcmFtIGJzXG4gKi9cbmV4cG9ydHMuYnJvd3NlckV2ZW50Rm9yRWxlbWVudCA9IGZ1bmN0aW9uIChicywgZWxlbSwgZGF0YSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjYW5TeW5jID0gZXhwb3J0cy5jYW5FbWl0RXZlbnRzO1xuICAgICAgICBpZiAoY2FuU3luYykge1xuICAgICAgICAgICAgYnMuc29ja2V0LmVtaXQoRUxFTUVOVF9FVkVOVF9OQU1FLCB7XG4gICAgICAgICAgICAgICAgcG9zaXRpb246IGVsZW0uc2Nyb2xsVG9wLFxuICAgICAgICAgICAgICAgIGVsZW06IGRhdGEsXG4gICAgICAgICAgICAgICAgbWFwOiBkYXRhLm1hcFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZXhwb3J0cy5jYW5FbWl0RXZlbnRzID0gdHJ1ZTtcbiAgICB9O1xufTtcblxuZXhwb3J0cy5icm93c2VyRXZlbnQgPSBmdW5jdGlvbiAoYnMpIHtcblxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgdmFyIGNhblN5bmMgPSBleHBvcnRzLmNhbkVtaXRFdmVudHM7XG5cbiAgICAgICAgaWYgKGNhblN5bmMpIHtcbiAgICAgICAgICAgIGJzLnNvY2tldC5lbWl0KFdJTkRPV19FVkVOVF9OQU1FLCB7XG4gICAgICAgICAgICAgICAgcG9zaXRpb246IGV4cG9ydHMuZ2V0U2Nyb2xsUG9zaXRpb24oKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBleHBvcnRzLmNhbkVtaXRFdmVudHMgPSB0cnVlO1xuICAgIH07XG59O1xuXG5cbi8qKlxuICogQHJldHVybnMge3tyYXc6IG51bWJlciwgcHJvcG9ydGlvbmFsOiBudW1iZXJ9fVxuICovXG5leHBvcnRzLmdldFNjcm9sbFBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwb3MgPSB1dGlscy5nZXRCcm93c2VyU2Nyb2xsUG9zaXRpb24oKTtcbiAgICByZXR1cm4ge1xuICAgICAgICByYXc6IHBvcywgLy8gR2V0IHB4IG9mIHkgYXhpcyBvZiBzY3JvbGxcbiAgICAgICAgcHJvcG9ydGlvbmFsOiBleHBvcnRzLmdldFNjcm9sbFRvcFBlcmNlbnRhZ2UocG9zKSAvLyBHZXQgJSBvZiB5IGF4aXMgb2Ygc2Nyb2xsXG4gICAgfTtcbn07XG5cbi8qKlxuICogQHBhcmFtIHt7eDogbnVtYmVyLCB5OiBudW1iZXJ9fSBzY3JvbGxTcGFjZVxuICogQHBhcmFtIHNjcm9sbFBvc2l0aW9uXG4gKiBAcmV0dXJucyB7e3g6IG51bWJlciwgeTogbnVtYmVyfX1cbiAqL1xuZXhwb3J0cy5nZXRTY3JvbGxQZXJjZW50YWdlID0gZnVuY3Rpb24gKHNjcm9sbFNwYWNlLCBzY3JvbGxQb3NpdGlvbikge1xuXG4gICAgdmFyIHggPSBzY3JvbGxQb3NpdGlvbi54IC8gc2Nyb2xsU3BhY2UueDtcbiAgICB2YXIgeSA9IHNjcm9sbFBvc2l0aW9uLnkgLyBzY3JvbGxTcGFjZS55O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgeDogeCB8fCAwLFxuICAgICAgICB5OiB5XG4gICAgfTtcbn07XG5cbi8qKlxuICogR2V0IGp1c3QgdGhlIHBlcmNlbnRhZ2Ugb2YgWSBheGlzIG9mIHNjcm9sbFxuICogQHJldHVybnMge251bWJlcn1cbiAqL1xuZXhwb3J0cy5nZXRTY3JvbGxUb3BQZXJjZW50YWdlID0gZnVuY3Rpb24gKHBvcykge1xuICAgIHZhciBzY3JvbGxTcGFjZSA9IHV0aWxzLmdldFNjcm9sbFNwYWNlKCk7XG4gICAgdmFyIHBlcmNlbnRhZ2UgID0gZXhwb3J0cy5nZXRTY3JvbGxQZXJjZW50YWdlKHNjcm9sbFNwYWNlLCBwb3MpO1xuICAgIHJldHVybiBwZXJjZW50YWdlLnk7XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgc29ja2V0ICAgICAgID0gcmVxdWlyZShcIi4vc29ja2V0XCIpO1xudmFyIHNoaW1zICAgICAgICA9IHJlcXVpcmUoXCIuL2NsaWVudC1zaGltc1wiKTtcbnZhciBub3RpZnkgICAgICAgPSByZXF1aXJlKFwiLi9ub3RpZnlcIik7XG52YXIgY29kZVN5bmMgICAgID0gcmVxdWlyZShcIi4vY29kZS1zeW5jXCIpO1xudmFyIEJyb3dzZXJTeW5jICA9IHJlcXVpcmUoXCIuL2Jyb3dzZXItc3luY1wiKTtcbnZhciBnaG9zdE1vZGUgICAgPSByZXF1aXJlKFwiLi9naG9zdG1vZGVcIik7XG52YXIgZW1pdHRlciAgICAgID0gcmVxdWlyZShcIi4vZW1pdHRlclwiKTtcbnZhciBldmVudHMgICAgICAgPSByZXF1aXJlKFwiLi9ldmVudHNcIik7XG52YXIgdXRpbHMgICAgICAgID0gcmVxdWlyZShcIi4vYnJvd3Nlci51dGlsc1wiKTtcblxudmFyIHNob3VsZFJlbG9hZCA9IGZhbHNlO1xudmFyIGluaXRpYWxpc2VkICA9IGZhbHNlO1xuXG4vKipcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydHMuaW5pdCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgaWYgKHNob3VsZFJlbG9hZCAmJiBvcHRpb25zLnJlbG9hZE9uUmVzdGFydCkge1xuICAgICAgICB1dGlscy5yZWxvYWRCcm93c2VyKCk7XG4gICAgfVxuXG4gICAgdmFyIEJTID0gd2luZG93Ll9fX2Jyb3dzZXJTeW5jX19fIHx8IHt9O1xuXG4gICAgaWYgKCFCUy5jbGllbnQpIHtcblxuICAgICAgICBCUy5jbGllbnQgPSB0cnVlO1xuXG4gICAgICAgIHZhciBicm93c2VyU3luYyA9IG5ldyBCcm93c2VyU3luYyhvcHRpb25zKTtcblxuICAgICAgICAvLyBBbHdheXMgaW5pdCBvbiBwYWdlIGxvYWRcbiAgICAgICAgZ2hvc3RNb2RlLmluaXQoYnJvd3NlclN5bmMpO1xuICAgICAgICBjb2RlU3luYy5pbml0KGJyb3dzZXJTeW5jKTtcblxuICAgICAgICBub3RpZnkuaW5pdChicm93c2VyU3luYyk7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMubm90aWZ5KSB7XG4gICAgICAgICAgICBub3RpZnkuZmxhc2goXCJDb25uZWN0ZWQgdG8gQnJvd3NlclN5bmMgYXMgXCIgKyBicm93c2VyU3luYy5zdG9yZS5nZXQoJ2NsaWVudC5pZCcpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICghaW5pdGlhbGlzZWQpIHtcbiAgICAgICAgc29ja2V0Lm9uKFwiZGlzY29ubmVjdFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5ub3RpZnkpIHtcbiAgICAgICAgICAgICAgICBub3RpZnkuZmxhc2goXCJEaXNjb25uZWN0ZWQgZnJvbSBCcm93c2VyU3luY1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNob3VsZFJlbG9hZCA9IHRydWU7XG4gICAgICAgIH0pO1xuICAgICAgICBpbml0aWFsaXNlZCA9IHRydWU7XG4gICAgfVxufTtcblxuLyoqXG4gKiBIYW5kbGUgaW5kaXZpZHVhbCBzb2NrZXQgY29ubmVjdGlvbnNcbiAqL1xuc29ja2V0Lm9uKFwiY29ubmVjdGlvblwiLCBleHBvcnRzLmluaXQpO1xuXG5cbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgc2Nyb2xsID0gcmVxdWlyZShcIi4vZ2hvc3Rtb2RlLnNjcm9sbFwiKTtcblxudmFyIHN0eWxlcyA9IFtcbiAgICBcImRpc3BsYXk6IG5vbmVcIixcbiAgICBcInBhZGRpbmc6IDE1cHhcIixcbiAgICBcImZvbnQtZmFtaWx5OiBzYW5zLXNlcmlmXCIsXG4gICAgXCJwb3NpdGlvbjogZml4ZWRcIixcbiAgICBcImZvbnQtc2l6ZTogMC45ZW1cIixcbiAgICBcInotaW5kZXg6IDk5OTlcIixcbiAgICBcInJpZ2h0OiAwcHhcIixcbiAgICBcInRvcDogMHB4XCIsXG4gICAgXCJib3JkZXItYm90dG9tLWxlZnQtcmFkaXVzOiA1cHhcIixcbiAgICBcImJhY2tncm91bmQtY29sb3I6ICMxQjIwMzJcIixcbiAgICBcIm1hcmdpbjogMFwiLFxuICAgIFwiY29sb3I6IHdoaXRlXCIsXG4gICAgXCJ0ZXh0LWFsaWduOiBjZW50ZXJcIlxuXG5dO1xuXG52YXIgYnJvd3NlclN5bmM7XG52YXIgZWxlbTtcbnZhciBvcHRpb25zO1xudmFyIHRpbWVvdXRJbnQ7XG5cbi8qKlxuICogQHBhcmFtIHtCcm93c2VyU3luY30gYnNcbiAqIEByZXR1cm5zIHsqfVxuICovXG5leHBvcnRzLmluaXQgPSBmdW5jdGlvbiAoYnMpIHtcblxuICAgIGJyb3dzZXJTeW5jID0gYnM7XG4gICAgb3B0aW9ucyA9IGJzLm9wdGlvbnM7XG5cbiAgICB2YXIgY3NzU3R5bGVzID0gc3R5bGVzO1xuXG4gICAgaWYgKG9wdGlvbnMubm90aWZ5LnN0eWxlcykge1xuICAgICAgICBjc3NTdHlsZXMgPSBvcHRpb25zLm5vdGlmeS5zdHlsZXM7XG4gICAgfVxuXG4gICAgZWxlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJESVZcIik7XG4gICAgZWxlbS5pZCA9IFwiX19ic19ub3RpZnlfX1wiO1xuICAgIGVsZW0uc3R5bGUuY3NzVGV4dCA9IGNzc1N0eWxlcy5qb2luKFwiO1wiKTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImJvZHlcIilbMF0uYXBwZW5kQ2hpbGQoZWxlbSk7XG5cbiAgICB2YXIgZmxhc2hGbiA9IGV4cG9ydHMud2F0Y2hFdmVudCgpO1xuXG4gICAgYnJvd3NlclN5bmMuZW1pdHRlci5vbihcIm5vdGlmeVwiLCBmbGFzaEZuKTtcbiAgICBicm93c2VyU3luYy5zb2NrZXQub24oXCJicm93c2VyOm5vdGlmeVwiLCBmbGFzaEZuKTtcblxuICAgIHJldHVybiBlbGVtO1xufTtcblxuLyoqXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gKi9cbmV4cG9ydHMud2F0Y2hFdmVudCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRhID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICByZXR1cm4gZXhwb3J0cy5mbGFzaChkYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBleHBvcnRzLmZsYXNoKGRhdGEubWVzc2FnZSwgZGF0YS50aW1lb3V0KTtcbiAgICB9O1xufTtcblxuLyoqXG4gKlxuICovXG5leHBvcnRzLmdldEVsZW0gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGVsZW07XG59O1xuXG4vKipcbiAqIEByZXR1cm5zIHtudW1iZXJ8Kn1cbiAqL1xuZXhwb3J0cy5nZXRTY3JvbGxUb3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGJyb3dzZXJTeW5jLnV0aWxzLmdldEJyb3dzZXJTY3JvbGxQb3NpdGlvbigpLnk7XG59O1xuXG4vKipcbiAqIEBwYXJhbSBtZXNzYWdlXG4gKiBAcGFyYW0gW3RpbWVvdXRdXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0cy5mbGFzaCA9IGZ1bmN0aW9uIChtZXNzYWdlLCB0aW1lb3V0KSB7XG5cbiAgICB2YXIgZWxlbSA9IGV4cG9ydHMuZ2V0RWxlbSgpO1xuXG4gICAgLy8gcmV0dXJuIGlmIG5vdGlmeSB3YXMgbmV2ZXIgaW5pdGlhbGlzZWRcbiAgICBpZiAoIWVsZW0pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGVsZW0uaW5uZXJIVE1MID0gbWVzc2FnZTtcbiAgICBlbGVtLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XG5cbiAgICBpZiAodGltZW91dEludCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dEludCk7XG4gICAgICAgIHRpbWVvdXRJbnQgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgdGltZW91dEludCA9IHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZWxlbS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgfSwgdGltZW91dCB8fCAyMDAwKTtcblxuICAgIHJldHVybiBlbGVtO1xufTsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyoqXG4gKiBAdHlwZSB7e2VtaXQ6IGVtaXQsIG9uOiBvbn19XG4gKi9cbnZhciBCUyA9IHdpbmRvdy5fX19icm93c2VyU3luY19fXyB8fCB7fTtcbmV4cG9ydHMuc29ja2V0ID0gQlMuc29ja2V0IHx8IHtcbiAgICBlbWl0OiBmdW5jdGlvbigpe30sXG4gICAgb246IGZ1bmN0aW9uKCl7fVxufTtcblxuXG4vKipcbiAqIEByZXR1cm5zIHtzdHJpbmd9XG4gKi9cbmV4cG9ydHMuZ2V0UGF0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lO1xufTtcbi8qKlxuICogQWxpYXMgZm9yIHNvY2tldC5lbWl0XG4gKiBAcGFyYW0gbmFtZVxuICogQHBhcmFtIGRhdGFcbiAqL1xuZXhwb3J0cy5lbWl0ID0gZnVuY3Rpb24gKG5hbWUsIGRhdGEpIHtcbiAgICB2YXIgc29ja2V0ID0gZXhwb3J0cy5zb2NrZXQ7XG4gICAgaWYgKHNvY2tldCAmJiBzb2NrZXQuZW1pdCkge1xuICAgICAgICAvLyBzZW5kIHJlbGF0aXZlIHBhdGggb2Ygd2hlcmUgdGhlIGV2ZW50IGlzIHNlbnRcbiAgICAgICAgZGF0YS51cmwgPSBleHBvcnRzLmdldFBhdGgoKTtcbiAgICAgICAgc29ja2V0LmVtaXQobmFtZSwgZGF0YSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBBbGlhcyBmb3Igc29ja2V0Lm9uXG4gKiBAcGFyYW0gbmFtZVxuICogQHBhcmFtIGZ1bmNcbiAqL1xuZXhwb3J0cy5vbiA9IGZ1bmN0aW9uIChuYW1lLCBmdW5jKSB7XG4gICAgZXhwb3J0cy5zb2NrZXQub24obmFtZSwgZnVuYyk7XG59OyIsInZhciB1dGlscyAgICA9IHJlcXVpcmUoJy4vYnJvd3Nlci51dGlscycpO1xudmFyICR3aW5kb3cgID0gdXRpbHMuZ2V0V2luZG93KCk7XG52YXIgbWVyZ2UgICAgPSByZXF1aXJlKFwibG9kYXNoLm1lcmdlXCIpO1xudmFyIG9iakdldCAgID0gcmVxdWlyZShcImxvZGFzaC5nZXRcIik7XG52YXIgb2JqU2V0ICAgPSByZXF1aXJlKFwibG9kYXNoLnNldFwiKTtcbnZhciBQUkVGSVggICA9ICdicz0nO1xuXG5mdW5jdGlvbiBnZXRGcm9tTmFtZSAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgdmFyIGpzb24gPSAkd2luZG93Lm5hbWUubWF0Y2goL2JzPSguKykkLyk7XG4gICAgICAgIGlmIChqc29uKSB7XG4gICAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShqc29uWzFdKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ0NvdWxkIG5vdCBwYXJzZSBzYXZlZCBKU09OJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHt9O1xufVxuXG5mdW5jdGlvbiBzYXZlSW5OYW1lIChpbmNvbWluZykge1xuICAgICR3aW5kb3cubmFtZSA9IFBSRUZJWCArIEpTT04uc3RyaW5naWZ5KGluY29taW5nKTtcbn1cblxuZnVuY3Rpb24gd2lwZU5hbWUgKCkge1xuICAgICR3aW5kb3cubmFtZSA9ICcnO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVGcm9tSWQgKGlkKSB7XG5cbiAgICBmdW5jdGlvbiBnZXQgKHBhdGgpIHtcblxuICAgICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBwYXRoID0gcGF0aC5zcGxpdCgnLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHByZXYgPSBnZXRGcm9tTmFtZSgpO1xuXG4gICAgICAgIGlmIChwcmV2W2lkXSkge1xuICAgICAgICAgICAgcmV0dXJuIG9iakdldChwcmV2LCBbaWRdLmNvbmNhdChwYXRoKSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSBwYXRoXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogQHBhcmFtIG1lcmdlVmFsdWVzXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2V0IChwYXRoLCB2YWx1ZSwgbWVyZ2VWYWx1ZXMpIHtcblxuICAgICAgICB2YXIgcHJldiA9IGdldEZyb21OYW1lKCk7XG5cbiAgICAgICAgaWYgKHByZXZbaWRdKSB7XG4gICAgICAgICAgICB2YXIgbmV3VmFsdWVzID0gbWVyZ2VWYWx1ZXMgPyBtZXJnZSh7fSwgb2JqR2V0KHByZXZbaWRdLCBwYXRoKSwgdmFsdWUpIDogdmFsdWU7XG4gICAgICAgICAgICBvYmpTZXQocHJldltpZF0sIHBhdGgsIG5ld1ZhbHVlcyk7XG4gICAgICAgICAgICBzYXZlSW5OYW1lKHByZXYpO1xuICAgICAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgIHdpcGVOYW1lKCk7XG4gICAgICAgICAgICB2YXIgbmV3U2Vzc2lvbiA9IHt9O1xuICAgICAgICAgICAgbmV3U2Vzc2lvbltpZF0gPSBvYmpTZXQoe30sIHBhdGgsIHZhbHVlKTtcbiAgICAgICAgICAgIHNhdmVJbk5hbWUobmV3U2Vzc2lvbik7XG4gICAgICAgICAgICByZXR1cm4gbmV3U2Vzc2lvbjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGdldDogZ2V0LFxuICAgICAgICBzZXQ6IHNldCxcbiAgICAgICAgbWVyZ2U6IG1lcmdlXG4gICAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGUgKGlkKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUZyb21JZChpZCk7XG59XG5cbm1vZHVsZS5leHBvcnRzLmNyZWF0ZSA9IGNyZWF0ZTsiLCIvKipcbiAqIGxvZGFzaCAzLjcuMCAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZGVybiBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTUgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwczovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xudmFyIGJhc2VHZXQgPSByZXF1aXJlKCdsb2Rhc2guX2Jhc2VnZXQnKSxcbiAgICB0b1BhdGggPSByZXF1aXJlKCdsb2Rhc2guX3RvcGF0aCcpO1xuXG4vKipcbiAqIEdldHMgdGhlIHByb3BlcnR5IHZhbHVlIG9mIGBwYXRoYCBvbiBgb2JqZWN0YC4gSWYgdGhlIHJlc29sdmVkIHZhbHVlIGlzXG4gKiBgdW5kZWZpbmVkYCB0aGUgYGRlZmF1bHRWYWx1ZWAgaXMgdXNlZCBpbiBpdHMgcGxhY2UuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBPYmplY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBxdWVyeS5cbiAqIEBwYXJhbSB7QXJyYXl8c3RyaW5nfSBwYXRoIFRoZSBwYXRoIG9mIHRoZSBwcm9wZXJ0eSB0byBnZXQuXG4gKiBAcGFyYW0geyp9IFtkZWZhdWx0VmFsdWVdIFRoZSB2YWx1ZSByZXR1cm5lZCBpZiB0aGUgcmVzb2x2ZWQgdmFsdWUgaXMgYHVuZGVmaW5lZGAuXG4gKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgcmVzb2x2ZWQgdmFsdWUuXG4gKiBAZXhhbXBsZVxuICpcbiAqIHZhciBvYmplY3QgPSB7ICdhJzogW3sgJ2InOiB7ICdjJzogMyB9IH1dIH07XG4gKlxuICogXy5nZXQob2JqZWN0LCAnYVswXS5iLmMnKTtcbiAqIC8vID0+IDNcbiAqXG4gKiBfLmdldChvYmplY3QsIFsnYScsICcwJywgJ2InLCAnYyddKTtcbiAqIC8vID0+IDNcbiAqXG4gKiBfLmdldChvYmplY3QsICdhLmIuYycsICdkZWZhdWx0Jyk7XG4gKiAvLyA9PiAnZGVmYXVsdCdcbiAqL1xuZnVuY3Rpb24gZ2V0KG9iamVjdCwgcGF0aCwgZGVmYXVsdFZhbHVlKSB7XG4gIHZhciByZXN1bHQgPSBvYmplY3QgPT0gbnVsbCA/IHVuZGVmaW5lZCA6IGJhc2VHZXQob2JqZWN0LCB0b1BhdGgocGF0aCksIHBhdGggKyAnJyk7XG4gIHJldHVybiByZXN1bHQgPT09IHVuZGVmaW5lZCA/IGRlZmF1bHRWYWx1ZSA6IHJlc3VsdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZXQ7XG4iLCIvKipcbiAqIGxvZGFzaCAzLjcuMiAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZGVybiBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTUgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwczovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBnZXRgIHdpdGhvdXQgc3VwcG9ydCBmb3Igc3RyaW5nIHBhdGhzXG4gKiBhbmQgZGVmYXVsdCB2YWx1ZXMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBxdWVyeS5cbiAqIEBwYXJhbSB7QXJyYXl9IHBhdGggVGhlIHBhdGggb2YgdGhlIHByb3BlcnR5IHRvIGdldC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBbcGF0aEtleV0gVGhlIGtleSByZXByZXNlbnRhdGlvbiBvZiBwYXRoLlxuICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIHJlc29sdmVkIHZhbHVlLlxuICovXG5mdW5jdGlvbiBiYXNlR2V0KG9iamVjdCwgcGF0aCwgcGF0aEtleSkge1xuICBpZiAob2JqZWN0ID09IG51bGwpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKHBhdGhLZXkgIT09IHVuZGVmaW5lZCAmJiBwYXRoS2V5IGluIHRvT2JqZWN0KG9iamVjdCkpIHtcbiAgICBwYXRoID0gW3BhdGhLZXldO1xuICB9XG4gIHZhciBpbmRleCA9IDAsXG4gICAgICBsZW5ndGggPSBwYXRoLmxlbmd0aDtcblxuICB3aGlsZSAob2JqZWN0ICE9IG51bGwgJiYgaW5kZXggPCBsZW5ndGgpIHtcbiAgICBvYmplY3QgPSBvYmplY3RbcGF0aFtpbmRleCsrXV07XG4gIH1cbiAgcmV0dXJuIChpbmRleCAmJiBpbmRleCA9PSBsZW5ndGgpID8gb2JqZWN0IDogdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIGB2YWx1ZWAgdG8gYW4gb2JqZWN0IGlmIGl0J3Mgbm90IG9uZS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcHJvY2Vzcy5cbiAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgdGhlIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gdG9PYmplY3QodmFsdWUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHZhbHVlKSA/IHZhbHVlIDogT2JqZWN0KHZhbHVlKTtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyB0aGUgW2xhbmd1YWdlIHR5cGVdKGh0dHBzOi8vZXM1LmdpdGh1Yi5pby8jeDgpIG9mIGBPYmplY3RgLlxuICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzT2JqZWN0KHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdCgxKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gIC8vIEF2b2lkIGEgVjggSklUIGJ1ZyBpbiBDaHJvbWUgMTktMjAuXG4gIC8vIFNlZSBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MjI5MSBmb3IgbW9yZSBkZXRhaWxzLlxuICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgcmV0dXJuICEhdmFsdWUgJiYgKHR5cGUgPT0gJ29iamVjdCcgfHwgdHlwZSA9PSAnZnVuY3Rpb24nKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBiYXNlR2V0O1xuIiwiLyoqXG4gKiBsb2Rhc2ggMy44LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2Rlcm4gbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE1IFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTUgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBpc0FycmF5ID0gcmVxdWlyZSgnbG9kYXNoLmlzYXJyYXknKTtcblxuLyoqIFVzZWQgdG8gbWF0Y2ggcHJvcGVydHkgbmFtZXMgd2l0aGluIHByb3BlcnR5IHBhdGhzLiAqL1xudmFyIHJlUHJvcE5hbWUgPSAvW14uW1xcXV0rfFxcWyg/OigtP1xcZCsoPzpcXC5cXGQrKT8pfChbXCInXSkoKD86KD8hXFwyKVteXFxuXFxcXF18XFxcXC4pKj8pXFwyKVxcXS9nO1xuXG4vKiogVXNlZCB0byBtYXRjaCBiYWNrc2xhc2hlcyBpbiBwcm9wZXJ0eSBwYXRocy4gKi9cbnZhciByZUVzY2FwZUNoYXIgPSAvXFxcXChcXFxcKT8vZztcblxuLyoqXG4gKiBDb252ZXJ0cyBgdmFsdWVgIHRvIGEgc3RyaW5nIGlmIGl0J3Mgbm90IG9uZS4gQW4gZW1wdHkgc3RyaW5nIGlzIHJldHVybmVkXG4gKiBmb3IgYG51bGxgIG9yIGB1bmRlZmluZWRgIHZhbHVlcy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcHJvY2Vzcy5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IFJldHVybnMgdGhlIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gYmFzZVRvU3RyaW5nKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSA9PSBudWxsID8gJycgOiAodmFsdWUgKyAnJyk7XG59XG5cbi8qKlxuICogQ29udmVydHMgYHZhbHVlYCB0byBwcm9wZXJ0eSBwYXRoIGFycmF5IGlmIGl0J3Mgbm90IG9uZS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcHJvY2Vzcy5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgcHJvcGVydHkgcGF0aCBhcnJheS5cbiAqL1xuZnVuY3Rpb24gdG9QYXRoKHZhbHVlKSB7XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICB2YXIgcmVzdWx0ID0gW107XG4gIGJhc2VUb1N0cmluZyh2YWx1ZSkucmVwbGFjZShyZVByb3BOYW1lLCBmdW5jdGlvbihtYXRjaCwgbnVtYmVyLCBxdW90ZSwgc3RyaW5nKSB7XG4gICAgcmVzdWx0LnB1c2gocXVvdGUgPyBzdHJpbmcucmVwbGFjZShyZUVzY2FwZUNoYXIsICckMScpIDogKG51bWJlciB8fCBtYXRjaCkpO1xuICB9KTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB0b1BhdGg7XG4iLCIvKipcbiAqIGxvZGFzaCAzLjAuNCAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZGVybiBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTUgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwczovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xuXG4vKiogYE9iamVjdCN0b1N0cmluZ2AgcmVzdWx0IHJlZmVyZW5jZXMuICovXG52YXIgYXJyYXlUYWcgPSAnW29iamVjdCBBcnJheV0nLFxuICAgIGZ1bmNUYWcgPSAnW29iamVjdCBGdW5jdGlvbl0nO1xuXG4vKiogVXNlZCB0byBkZXRlY3QgaG9zdCBjb25zdHJ1Y3RvcnMgKFNhZmFyaSA+IDUpLiAqL1xudmFyIHJlSXNIb3N0Q3RvciA9IC9eXFxbb2JqZWN0IC4rP0NvbnN0cnVjdG9yXFxdJC87XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgb2JqZWN0LWxpa2UuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgb2JqZWN0LWxpa2UsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaXNPYmplY3RMaWtlKHZhbHVlKSB7XG4gIHJldHVybiAhIXZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0Jztcbn1cblxuLyoqIFVzZWQgZm9yIG5hdGl2ZSBtZXRob2QgcmVmZXJlbmNlcy4gKi9cbnZhciBvYmplY3RQcm90byA9IE9iamVjdC5wcm90b3R5cGU7XG5cbi8qKiBVc2VkIHRvIHJlc29sdmUgdGhlIGRlY29tcGlsZWQgc291cmNlIG9mIGZ1bmN0aW9ucy4gKi9cbnZhciBmblRvU3RyaW5nID0gRnVuY3Rpb24ucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4vKiogVXNlZCB0byBjaGVjayBvYmplY3RzIGZvciBvd24gcHJvcGVydGllcy4gKi9cbnZhciBoYXNPd25Qcm9wZXJ0eSA9IG9iamVjdFByb3RvLmhhc093blByb3BlcnR5O1xuXG4vKipcbiAqIFVzZWQgdG8gcmVzb2x2ZSB0aGUgW2B0b1N0cmluZ1RhZ2BdKGh0dHA6Ly9lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC8jc2VjLW9iamVjdC5wcm90b3R5cGUudG9zdHJpbmcpXG4gKiBvZiB2YWx1ZXMuXG4gKi9cbnZhciBvYmpUb1N0cmluZyA9IG9iamVjdFByb3RvLnRvU3RyaW5nO1xuXG4vKiogVXNlZCB0byBkZXRlY3QgaWYgYSBtZXRob2QgaXMgbmF0aXZlLiAqL1xudmFyIHJlSXNOYXRpdmUgPSBSZWdFeHAoJ14nICtcbiAgZm5Ub1N0cmluZy5jYWxsKGhhc093blByb3BlcnR5KS5yZXBsYWNlKC9bXFxcXF4kLiorPygpW1xcXXt9fF0vZywgJ1xcXFwkJicpXG4gIC5yZXBsYWNlKC9oYXNPd25Qcm9wZXJ0eXwoZnVuY3Rpb24pLio/KD89XFxcXFxcKCl8IGZvciAuKz8oPz1cXFxcXFxdKS9nLCAnJDEuKj8nKSArICckJ1xuKTtcblxuLyogTmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzIGZvciB0aG9zZSB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcy4gKi9cbnZhciBuYXRpdmVJc0FycmF5ID0gZ2V0TmF0aXZlKEFycmF5LCAnaXNBcnJheScpO1xuXG4vKipcbiAqIFVzZWQgYXMgdGhlIFttYXhpbXVtIGxlbmd0aF0oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wLyNzZWMtbnVtYmVyLm1heF9zYWZlX2ludGVnZXIpXG4gKiBvZiBhbiBhcnJheS1saWtlIHZhbHVlLlxuICovXG52YXIgTUFYX1NBRkVfSU5URUdFUiA9IDkwMDcxOTkyNTQ3NDA5OTE7XG5cbi8qKlxuICogR2V0cyB0aGUgbmF0aXZlIGZ1bmN0aW9uIGF0IGBrZXlgIG9mIGBvYmplY3RgLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gcXVlcnkuXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIG1ldGhvZCB0byBnZXQuXG4gKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgZnVuY3Rpb24gaWYgaXQncyBuYXRpdmUsIGVsc2UgYHVuZGVmaW5lZGAuXG4gKi9cbmZ1bmN0aW9uIGdldE5hdGl2ZShvYmplY3QsIGtleSkge1xuICB2YXIgdmFsdWUgPSBvYmplY3QgPT0gbnVsbCA/IHVuZGVmaW5lZCA6IG9iamVjdFtrZXldO1xuICByZXR1cm4gaXNOYXRpdmUodmFsdWUpID8gdmFsdWUgOiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSB2YWxpZCBhcnJheS1saWtlIGxlbmd0aC5cbiAqXG4gKiAqKk5vdGU6KiogVGhpcyBmdW5jdGlvbiBpcyBiYXNlZCBvbiBbYFRvTGVuZ3RoYF0oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wLyNzZWMtdG9sZW5ndGgpLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgdmFsaWQgbGVuZ3RoLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzTGVuZ3RoKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ251bWJlcicgJiYgdmFsdWUgPiAtMSAmJiB2YWx1ZSAlIDEgPT0gMCAmJiB2YWx1ZSA8PSBNQVhfU0FGRV9JTlRFR0VSO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGNsYXNzaWZpZWQgYXMgYW4gYEFycmF5YCBvYmplY3QuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGNvcnJlY3RseSBjbGFzc2lmaWVkLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNBcnJheShbMSwgMiwgM10pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNBcnJheShmdW5jdGlvbigpIHsgcmV0dXJuIGFyZ3VtZW50czsgfSgpKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbnZhciBpc0FycmF5ID0gbmF0aXZlSXNBcnJheSB8fCBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBpc0xlbmd0aCh2YWx1ZS5sZW5ndGgpICYmIG9ialRvU3RyaW5nLmNhbGwodmFsdWUpID09IGFycmF5VGFnO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGEgYEZ1bmN0aW9uYCBvYmplY3QuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGNvcnJlY3RseSBjbGFzc2lmaWVkLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNGdW5jdGlvbihfKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzRnVuY3Rpb24oL2FiYy8pO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNGdW5jdGlvbih2YWx1ZSkge1xuICAvLyBUaGUgdXNlIG9mIGBPYmplY3QjdG9TdHJpbmdgIGF2b2lkcyBpc3N1ZXMgd2l0aCB0aGUgYHR5cGVvZmAgb3BlcmF0b3JcbiAgLy8gaW4gb2xkZXIgdmVyc2lvbnMgb2YgQ2hyb21lIGFuZCBTYWZhcmkgd2hpY2ggcmV0dXJuICdmdW5jdGlvbicgZm9yIHJlZ2V4ZXNcbiAgLy8gYW5kIFNhZmFyaSA4IGVxdWl2YWxlbnRzIHdoaWNoIHJldHVybiAnb2JqZWN0JyBmb3IgdHlwZWQgYXJyYXkgY29uc3RydWN0b3JzLlxuICByZXR1cm4gaXNPYmplY3QodmFsdWUpICYmIG9ialRvU3RyaW5nLmNhbGwodmFsdWUpID09IGZ1bmNUYWc7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgdGhlIFtsYW5ndWFnZSB0eXBlXShodHRwczovL2VzNS5naXRodWIuaW8vI3g4KSBvZiBgT2JqZWN0YC5cbiAqIChlLmcuIGFycmF5cywgZnVuY3Rpb25zLCBvYmplY3RzLCByZWdleGVzLCBgbmV3IE51bWJlcigwKWAsIGFuZCBgbmV3IFN0cmluZygnJylgKVxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhbiBvYmplY3QsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc09iamVjdCh7fSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdChbMSwgMiwgM10pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QoMSk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuICAvLyBBdm9pZCBhIFY4IEpJVCBidWcgaW4gQ2hyb21lIDE5LTIwLlxuICAvLyBTZWUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTIyOTEgZm9yIG1vcmUgZGV0YWlscy5cbiAgdmFyIHR5cGUgPSB0eXBlb2YgdmFsdWU7XG4gIHJldHVybiAhIXZhbHVlICYmICh0eXBlID09ICdvYmplY3QnIHx8IHR5cGUgPT0gJ2Z1bmN0aW9uJyk7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSBuYXRpdmUgZnVuY3Rpb24uXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgbmF0aXZlIGZ1bmN0aW9uLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNOYXRpdmUoQXJyYXkucHJvdG90eXBlLnB1c2gpO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNOYXRpdmUoXyk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc05hdGl2ZSh2YWx1ZSkge1xuICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICByZXR1cm4gcmVJc05hdGl2ZS50ZXN0KGZuVG9TdHJpbmcuY2FsbCh2YWx1ZSkpO1xuICB9XG4gIHJldHVybiBpc09iamVjdExpa2UodmFsdWUpICYmIHJlSXNIb3N0Q3Rvci50ZXN0KHZhbHVlKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpc0FycmF5O1xuIiwiLyoqXG4gKiBsb2Rhc2ggMy4zLjIgKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2Rlcm4gbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE1IFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTUgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBhcnJheUNvcHkgPSByZXF1aXJlKCdsb2Rhc2guX2FycmF5Y29weScpLFxuICAgIGFycmF5RWFjaCA9IHJlcXVpcmUoJ2xvZGFzaC5fYXJyYXllYWNoJyksXG4gICAgY3JlYXRlQXNzaWduZXIgPSByZXF1aXJlKCdsb2Rhc2guX2NyZWF0ZWFzc2lnbmVyJyksXG4gICAgaXNBcmd1bWVudHMgPSByZXF1aXJlKCdsb2Rhc2guaXNhcmd1bWVudHMnKSxcbiAgICBpc0FycmF5ID0gcmVxdWlyZSgnbG9kYXNoLmlzYXJyYXknKSxcbiAgICBpc1BsYWluT2JqZWN0ID0gcmVxdWlyZSgnbG9kYXNoLmlzcGxhaW5vYmplY3QnKSxcbiAgICBpc1R5cGVkQXJyYXkgPSByZXF1aXJlKCdsb2Rhc2guaXN0eXBlZGFycmF5JyksXG4gICAga2V5cyA9IHJlcXVpcmUoJ2xvZGFzaC5rZXlzJyksXG4gICAgdG9QbGFpbk9iamVjdCA9IHJlcXVpcmUoJ2xvZGFzaC50b3BsYWlub2JqZWN0Jyk7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgb2JqZWN0LWxpa2UuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgb2JqZWN0LWxpa2UsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaXNPYmplY3RMaWtlKHZhbHVlKSB7XG4gIHJldHVybiAhIXZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0Jztcbn1cblxuLyoqXG4gKiBVc2VkIGFzIHRoZSBbbWF4aW11bSBsZW5ndGhdKGh0dHA6Ly9lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC8jc2VjLW51bWJlci5tYXhfc2FmZV9pbnRlZ2VyKVxuICogb2YgYW4gYXJyYXktbGlrZSB2YWx1ZS5cbiAqL1xudmFyIE1BWF9TQUZFX0lOVEVHRVIgPSA5MDA3MTk5MjU0NzQwOTkxO1xuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLm1lcmdlYCB3aXRob3V0IHN1cHBvcnQgZm9yIGFyZ3VtZW50IGp1Z2dsaW5nLFxuICogbXVsdGlwbGUgc291cmNlcywgYW5kIGB0aGlzYCBiaW5kaW5nIGBjdXN0b21pemVyYCBmdW5jdGlvbnMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBzb3VyY2UgVGhlIHNvdXJjZSBvYmplY3QuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY3VzdG9taXplcl0gVGhlIGZ1bmN0aW9uIHRvIGN1c3RvbWl6ZSBtZXJnZWQgdmFsdWVzLlxuICogQHBhcmFtIHtBcnJheX0gW3N0YWNrQT1bXV0gVHJhY2tzIHRyYXZlcnNlZCBzb3VyY2Ugb2JqZWN0cy5cbiAqIEBwYXJhbSB7QXJyYXl9IFtzdGFja0I9W11dIEFzc29jaWF0ZXMgdmFsdWVzIHdpdGggc291cmNlIGNvdW50ZXJwYXJ0cy5cbiAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgYG9iamVjdGAuXG4gKi9cbmZ1bmN0aW9uIGJhc2VNZXJnZShvYmplY3QsIHNvdXJjZSwgY3VzdG9taXplciwgc3RhY2tBLCBzdGFja0IpIHtcbiAgaWYgKCFpc09iamVjdChvYmplY3QpKSB7XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfVxuICB2YXIgaXNTcmNBcnIgPSBpc0FycmF5TGlrZShzb3VyY2UpICYmIChpc0FycmF5KHNvdXJjZSkgfHwgaXNUeXBlZEFycmF5KHNvdXJjZSkpLFxuICAgICAgcHJvcHMgPSBpc1NyY0FyciA/IHVuZGVmaW5lZCA6IGtleXMoc291cmNlKTtcblxuICBhcnJheUVhY2gocHJvcHMgfHwgc291cmNlLCBmdW5jdGlvbihzcmNWYWx1ZSwga2V5KSB7XG4gICAgaWYgKHByb3BzKSB7XG4gICAgICBrZXkgPSBzcmNWYWx1ZTtcbiAgICAgIHNyY1ZhbHVlID0gc291cmNlW2tleV07XG4gICAgfVxuICAgIGlmIChpc09iamVjdExpa2Uoc3JjVmFsdWUpKSB7XG4gICAgICBzdGFja0EgfHwgKHN0YWNrQSA9IFtdKTtcbiAgICAgIHN0YWNrQiB8fCAoc3RhY2tCID0gW10pO1xuICAgICAgYmFzZU1lcmdlRGVlcChvYmplY3QsIHNvdXJjZSwga2V5LCBiYXNlTWVyZ2UsIGN1c3RvbWl6ZXIsIHN0YWNrQSwgc3RhY2tCKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB2YXIgdmFsdWUgPSBvYmplY3Rba2V5XSxcbiAgICAgICAgICByZXN1bHQgPSBjdXN0b21pemVyID8gY3VzdG9taXplcih2YWx1ZSwgc3JjVmFsdWUsIGtleSwgb2JqZWN0LCBzb3VyY2UpIDogdW5kZWZpbmVkLFxuICAgICAgICAgIGlzQ29tbW9uID0gcmVzdWx0ID09PSB1bmRlZmluZWQ7XG5cbiAgICAgIGlmIChpc0NvbW1vbikge1xuICAgICAgICByZXN1bHQgPSBzcmNWYWx1ZTtcbiAgICAgIH1cbiAgICAgIGlmICgocmVzdWx0ICE9PSB1bmRlZmluZWQgfHwgKGlzU3JjQXJyICYmICEoa2V5IGluIG9iamVjdCkpKSAmJlxuICAgICAgICAgIChpc0NvbW1vbiB8fCAocmVzdWx0ID09PSByZXN1bHQgPyAocmVzdWx0ICE9PSB2YWx1ZSkgOiAodmFsdWUgPT09IHZhbHVlKSkpKSB7XG4gICAgICAgIG9iamVjdFtrZXldID0gcmVzdWx0O1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvYmplY3Q7XG59XG5cbi8qKlxuICogQSBzcGVjaWFsaXplZCB2ZXJzaW9uIG9mIGBiYXNlTWVyZ2VgIGZvciBhcnJheXMgYW5kIG9iamVjdHMgd2hpY2ggcGVyZm9ybXNcbiAqIGRlZXAgbWVyZ2VzIGFuZCB0cmFja3MgdHJhdmVyc2VkIG9iamVjdHMgZW5hYmxpbmcgb2JqZWN0cyB3aXRoIGNpcmN1bGFyXG4gKiByZWZlcmVuY2VzIHRvIGJlIG1lcmdlZC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgZGVzdGluYXRpb24gb2JqZWN0LlxuICogQHBhcmFtIHtPYmplY3R9IHNvdXJjZSBUaGUgc291cmNlIG9iamVjdC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgdmFsdWUgdG8gbWVyZ2UuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBtZXJnZUZ1bmMgVGhlIGZ1bmN0aW9uIHRvIG1lcmdlIHZhbHVlcy5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjdXN0b21pemVyXSBUaGUgZnVuY3Rpb24gdG8gY3VzdG9taXplIG1lcmdlZCB2YWx1ZXMuXG4gKiBAcGFyYW0ge0FycmF5fSBbc3RhY2tBPVtdXSBUcmFja3MgdHJhdmVyc2VkIHNvdXJjZSBvYmplY3RzLlxuICogQHBhcmFtIHtBcnJheX0gW3N0YWNrQj1bXV0gQXNzb2NpYXRlcyB2YWx1ZXMgd2l0aCBzb3VyY2UgY291bnRlcnBhcnRzLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBvYmplY3RzIGFyZSBlcXVpdmFsZW50LCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGJhc2VNZXJnZURlZXAob2JqZWN0LCBzb3VyY2UsIGtleSwgbWVyZ2VGdW5jLCBjdXN0b21pemVyLCBzdGFja0EsIHN0YWNrQikge1xuICB2YXIgbGVuZ3RoID0gc3RhY2tBLmxlbmd0aCxcbiAgICAgIHNyY1ZhbHVlID0gc291cmNlW2tleV07XG5cbiAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgaWYgKHN0YWNrQVtsZW5ndGhdID09IHNyY1ZhbHVlKSB7XG4gICAgICBvYmplY3Rba2V5XSA9IHN0YWNrQltsZW5ndGhdO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuICB2YXIgdmFsdWUgPSBvYmplY3Rba2V5XSxcbiAgICAgIHJlc3VsdCA9IGN1c3RvbWl6ZXIgPyBjdXN0b21pemVyKHZhbHVlLCBzcmNWYWx1ZSwga2V5LCBvYmplY3QsIHNvdXJjZSkgOiB1bmRlZmluZWQsXG4gICAgICBpc0NvbW1vbiA9IHJlc3VsdCA9PT0gdW5kZWZpbmVkO1xuXG4gIGlmIChpc0NvbW1vbikge1xuICAgIHJlc3VsdCA9IHNyY1ZhbHVlO1xuICAgIGlmIChpc0FycmF5TGlrZShzcmNWYWx1ZSkgJiYgKGlzQXJyYXkoc3JjVmFsdWUpIHx8IGlzVHlwZWRBcnJheShzcmNWYWx1ZSkpKSB7XG4gICAgICByZXN1bHQgPSBpc0FycmF5KHZhbHVlKVxuICAgICAgICA/IHZhbHVlXG4gICAgICAgIDogKGlzQXJyYXlMaWtlKHZhbHVlKSA/IGFycmF5Q29weSh2YWx1ZSkgOiBbXSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGlzUGxhaW5PYmplY3Qoc3JjVmFsdWUpIHx8IGlzQXJndW1lbnRzKHNyY1ZhbHVlKSkge1xuICAgICAgcmVzdWx0ID0gaXNBcmd1bWVudHModmFsdWUpXG4gICAgICAgID8gdG9QbGFpbk9iamVjdCh2YWx1ZSlcbiAgICAgICAgOiAoaXNQbGFpbk9iamVjdCh2YWx1ZSkgPyB2YWx1ZSA6IHt9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpc0NvbW1vbiA9IGZhbHNlO1xuICAgIH1cbiAgfVxuICAvLyBBZGQgdGhlIHNvdXJjZSB2YWx1ZSB0byB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMgYW5kIGFzc29jaWF0ZVxuICAvLyBpdCB3aXRoIGl0cyBtZXJnZWQgdmFsdWUuXG4gIHN0YWNrQS5wdXNoKHNyY1ZhbHVlKTtcbiAgc3RhY2tCLnB1c2gocmVzdWx0KTtcblxuICBpZiAoaXNDb21tb24pIHtcbiAgICAvLyBSZWN1cnNpdmVseSBtZXJnZSBvYmplY3RzIGFuZCBhcnJheXMgKHN1c2NlcHRpYmxlIHRvIGNhbGwgc3RhY2sgbGltaXRzKS5cbiAgICBvYmplY3Rba2V5XSA9IG1lcmdlRnVuYyhyZXN1bHQsIHNyY1ZhbHVlLCBjdXN0b21pemVyLCBzdGFja0EsIHN0YWNrQik7XG4gIH0gZWxzZSBpZiAocmVzdWx0ID09PSByZXN1bHQgPyAocmVzdWx0ICE9PSB2YWx1ZSkgOiAodmFsdWUgPT09IHZhbHVlKSkge1xuICAgIG9iamVjdFtrZXldID0gcmVzdWx0O1xuICB9XG59XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8ucHJvcGVydHlgIHdpdGhvdXQgc3VwcG9ydCBmb3IgZGVlcCBwYXRocy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSBwcm9wZXJ0eSB0byBnZXQuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gYmFzZVByb3BlcnR5KGtleSkge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgcmV0dXJuIG9iamVjdCA9PSBudWxsID8gdW5kZWZpbmVkIDogb2JqZWN0W2tleV07XG4gIH07XG59XG5cbi8qKlxuICogR2V0cyB0aGUgXCJsZW5ndGhcIiBwcm9wZXJ0eSB2YWx1ZSBvZiBgb2JqZWN0YC5cbiAqXG4gKiAqKk5vdGU6KiogVGhpcyBmdW5jdGlvbiBpcyB1c2VkIHRvIGF2b2lkIGEgW0pJVCBidWddKGh0dHBzOi8vYnVncy53ZWJraXQub3JnL3Nob3dfYnVnLmNnaT9pZD0xNDI3OTIpXG4gKiB0aGF0IGFmZmVjdHMgU2FmYXJpIG9uIGF0IGxlYXN0IGlPUyA4LjEtOC4zIEFSTTY0LlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gcXVlcnkuXG4gKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgXCJsZW5ndGhcIiB2YWx1ZS5cbiAqL1xudmFyIGdldExlbmd0aCA9IGJhc2VQcm9wZXJ0eSgnbGVuZ3RoJyk7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYXJyYXktbGlrZS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhcnJheS1saWtlLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXlMaWtlKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAhPSBudWxsICYmIGlzTGVuZ3RoKGdldExlbmd0aCh2YWx1ZSkpO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgdmFsaWQgYXJyYXktbGlrZSBsZW5ndGguXG4gKlxuICogKipOb3RlOioqIFRoaXMgZnVuY3Rpb24gaXMgYmFzZWQgb24gW2BUb0xlbmd0aGBdKGh0dHA6Ly9lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC8jc2VjLXRvbGVuZ3RoKS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIHZhbGlkIGxlbmd0aCwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc0xlbmd0aCh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09ICdudW1iZXInICYmIHZhbHVlID4gLTEgJiYgdmFsdWUgJSAxID09IDAgJiYgdmFsdWUgPD0gTUFYX1NBRkVfSU5URUdFUjtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyB0aGUgW2xhbmd1YWdlIHR5cGVdKGh0dHBzOi8vZXM1LmdpdGh1Yi5pby8jeDgpIG9mIGBPYmplY3RgLlxuICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzT2JqZWN0KHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdCgxKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gIC8vIEF2b2lkIGEgVjggSklUIGJ1ZyBpbiBDaHJvbWUgMTktMjAuXG4gIC8vIFNlZSBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MjI5MSBmb3IgbW9yZSBkZXRhaWxzLlxuICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgcmV0dXJuICEhdmFsdWUgJiYgKHR5cGUgPT0gJ29iamVjdCcgfHwgdHlwZSA9PSAnZnVuY3Rpb24nKTtcbn1cblxuLyoqXG4gKiBSZWN1cnNpdmVseSBtZXJnZXMgb3duIGVudW1lcmFibGUgcHJvcGVydGllcyBvZiB0aGUgc291cmNlIG9iamVjdChzKSwgdGhhdFxuICogZG9uJ3QgcmVzb2x2ZSB0byBgdW5kZWZpbmVkYCBpbnRvIHRoZSBkZXN0aW5hdGlvbiBvYmplY3QuIFN1YnNlcXVlbnQgc291cmNlc1xuICogb3ZlcndyaXRlIHByb3BlcnR5IGFzc2lnbm1lbnRzIG9mIHByZXZpb3VzIHNvdXJjZXMuIElmIGBjdXN0b21pemVyYCBpc1xuICogcHJvdmlkZWQgaXQgaXMgaW52b2tlZCB0byBwcm9kdWNlIHRoZSBtZXJnZWQgdmFsdWVzIG9mIHRoZSBkZXN0aW5hdGlvbiBhbmRcbiAqIHNvdXJjZSBwcm9wZXJ0aWVzLiBJZiBgY3VzdG9taXplcmAgcmV0dXJucyBgdW5kZWZpbmVkYCBtZXJnaW5nIGlzIGhhbmRsZWRcbiAqIGJ5IHRoZSBtZXRob2QgaW5zdGVhZC4gVGhlIGBjdXN0b21pemVyYCBpcyBib3VuZCB0byBgdGhpc0FyZ2AgYW5kIGludm9rZWRcbiAqIHdpdGggZml2ZSBhcmd1bWVudHM6IChvYmplY3RWYWx1ZSwgc291cmNlVmFsdWUsIGtleSwgb2JqZWN0LCBzb3VyY2UpLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgT2JqZWN0XG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBkZXN0aW5hdGlvbiBvYmplY3QuXG4gKiBAcGFyYW0gey4uLk9iamVjdH0gW3NvdXJjZXNdIFRoZSBzb3VyY2Ugb2JqZWN0cy5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjdXN0b21pemVyXSBUaGUgZnVuY3Rpb24gdG8gY3VzdG9taXplIGFzc2lnbmVkIHZhbHVlcy5cbiAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY3VzdG9taXplcmAuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIGBvYmplY3RgLlxuICogQGV4YW1wbGVcbiAqXG4gKiB2YXIgdXNlcnMgPSB7XG4gKiAgICdkYXRhJzogW3sgJ3VzZXInOiAnYmFybmV5JyB9LCB7ICd1c2VyJzogJ2ZyZWQnIH1dXG4gKiB9O1xuICpcbiAqIHZhciBhZ2VzID0ge1xuICogICAnZGF0YSc6IFt7ICdhZ2UnOiAzNiB9LCB7ICdhZ2UnOiA0MCB9XVxuICogfTtcbiAqXG4gKiBfLm1lcmdlKHVzZXJzLCBhZ2VzKTtcbiAqIC8vID0+IHsgJ2RhdGEnOiBbeyAndXNlcic6ICdiYXJuZXknLCAnYWdlJzogMzYgfSwgeyAndXNlcic6ICdmcmVkJywgJ2FnZSc6IDQwIH1dIH1cbiAqXG4gKiAvLyB1c2luZyBhIGN1c3RvbWl6ZXIgY2FsbGJhY2tcbiAqIHZhciBvYmplY3QgPSB7XG4gKiAgICdmcnVpdHMnOiBbJ2FwcGxlJ10sXG4gKiAgICd2ZWdldGFibGVzJzogWydiZWV0J11cbiAqIH07XG4gKlxuICogdmFyIG90aGVyID0ge1xuICogICAnZnJ1aXRzJzogWydiYW5hbmEnXSxcbiAqICAgJ3ZlZ2V0YWJsZXMnOiBbJ2NhcnJvdCddXG4gKiB9O1xuICpcbiAqIF8ubWVyZ2Uob2JqZWN0LCBvdGhlciwgZnVuY3Rpb24oYSwgYikge1xuICogICBpZiAoXy5pc0FycmF5KGEpKSB7XG4gKiAgICAgcmV0dXJuIGEuY29uY2F0KGIpO1xuICogICB9XG4gKiB9KTtcbiAqIC8vID0+IHsgJ2ZydWl0cyc6IFsnYXBwbGUnLCAnYmFuYW5hJ10sICd2ZWdldGFibGVzJzogWydiZWV0JywgJ2NhcnJvdCddIH1cbiAqL1xudmFyIG1lcmdlID0gY3JlYXRlQXNzaWduZXIoYmFzZU1lcmdlKTtcblxubW9kdWxlLmV4cG9ydHMgPSBtZXJnZTtcbiIsIi8qKlxuICogbG9kYXNoIDMuMC4wIChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kZXJuIG1vZHVsYXJpemUgZXhwb3J0cz1cIm5wbVwiIC1vIC4vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS43LjAgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDE1IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG5cbi8qKlxuICogQ29waWVzIHRoZSB2YWx1ZXMgb2YgYHNvdXJjZWAgdG8gYGFycmF5YC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtBcnJheX0gc291cmNlIFRoZSBhcnJheSB0byBjb3B5IHZhbHVlcyBmcm9tLlxuICogQHBhcmFtIHtBcnJheX0gW2FycmF5PVtdXSBUaGUgYXJyYXkgdG8gY29weSB2YWx1ZXMgdG8uXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYGFycmF5YC5cbiAqL1xuZnVuY3Rpb24gYXJyYXlDb3B5KHNvdXJjZSwgYXJyYXkpIHtcbiAgdmFyIGluZGV4ID0gLTEsXG4gICAgICBsZW5ndGggPSBzb3VyY2UubGVuZ3RoO1xuXG4gIGFycmF5IHx8IChhcnJheSA9IEFycmF5KGxlbmd0aCkpO1xuICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgIGFycmF5W2luZGV4XSA9IHNvdXJjZVtpbmRleF07XG4gIH1cbiAgcmV0dXJuIGFycmF5O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFycmF5Q29weTtcbiIsIi8qKlxuICogbG9kYXNoIDMuMC4wIChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kZXJuIG1vZHVsYXJpemUgZXhwb3J0cz1cIm5wbVwiIC1vIC4vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS43LjAgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDE1IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG5cbi8qKlxuICogQSBzcGVjaWFsaXplZCB2ZXJzaW9uIG9mIGBfLmZvckVhY2hgIGZvciBhcnJheXMgd2l0aG91dCBzdXBwb3J0IGZvciBjYWxsYmFja1xuICogc2hvcnRoYW5kcyBvciBgdGhpc2AgYmluZGluZy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIFRoZSBmdW5jdGlvbiBpbnZva2VkIHBlciBpdGVyYXRpb24uXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYGFycmF5YC5cbiAqL1xuZnVuY3Rpb24gYXJyYXlFYWNoKGFycmF5LCBpdGVyYXRlZSkge1xuICB2YXIgaW5kZXggPSAtMSxcbiAgICAgIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcblxuICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgIGlmIChpdGVyYXRlZShhcnJheVtpbmRleF0sIGluZGV4LCBhcnJheSkgPT09IGZhbHNlKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGFycmF5O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFycmF5RWFjaDtcbiIsIi8qKlxuICogbG9kYXNoIDMuMS4xIChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kZXJuIG1vZHVsYXJpemUgZXhwb3J0cz1cIm5wbVwiIC1vIC4vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS44LjMgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDE1IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG52YXIgYmluZENhbGxiYWNrID0gcmVxdWlyZSgnbG9kYXNoLl9iaW5kY2FsbGJhY2snKSxcbiAgICBpc0l0ZXJhdGVlQ2FsbCA9IHJlcXVpcmUoJ2xvZGFzaC5faXNpdGVyYXRlZWNhbGwnKSxcbiAgICByZXN0UGFyYW0gPSByZXF1aXJlKCdsb2Rhc2gucmVzdHBhcmFtJyk7XG5cbi8qKlxuICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHRoYXQgYXNzaWducyBwcm9wZXJ0aWVzIG9mIHNvdXJjZSBvYmplY3QocykgdG8gYSBnaXZlblxuICogZGVzdGluYXRpb24gb2JqZWN0LlxuICpcbiAqICoqTm90ZToqKiBUaGlzIGZ1bmN0aW9uIGlzIHVzZWQgdG8gY3JlYXRlIGBfLmFzc2lnbmAsIGBfLmRlZmF1bHRzYCwgYW5kIGBfLm1lcmdlYC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gYXNzaWduZXIgVGhlIGZ1bmN0aW9uIHRvIGFzc2lnbiB2YWx1ZXMuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBhc3NpZ25lciBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlQXNzaWduZXIoYXNzaWduZXIpIHtcbiAgcmV0dXJuIHJlc3RQYXJhbShmdW5jdGlvbihvYmplY3QsIHNvdXJjZXMpIHtcbiAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgbGVuZ3RoID0gb2JqZWN0ID09IG51bGwgPyAwIDogc291cmNlcy5sZW5ndGgsXG4gICAgICAgIGN1c3RvbWl6ZXIgPSBsZW5ndGggPiAyID8gc291cmNlc1tsZW5ndGggLSAyXSA6IHVuZGVmaW5lZCxcbiAgICAgICAgZ3VhcmQgPSBsZW5ndGggPiAyID8gc291cmNlc1syXSA6IHVuZGVmaW5lZCxcbiAgICAgICAgdGhpc0FyZyA9IGxlbmd0aCA+IDEgPyBzb3VyY2VzW2xlbmd0aCAtIDFdIDogdW5kZWZpbmVkO1xuXG4gICAgaWYgKHR5cGVvZiBjdXN0b21pemVyID09ICdmdW5jdGlvbicpIHtcbiAgICAgIGN1c3RvbWl6ZXIgPSBiaW5kQ2FsbGJhY2soY3VzdG9taXplciwgdGhpc0FyZywgNSk7XG4gICAgICBsZW5ndGggLT0gMjtcbiAgICB9IGVsc2Uge1xuICAgICAgY3VzdG9taXplciA9IHR5cGVvZiB0aGlzQXJnID09ICdmdW5jdGlvbicgPyB0aGlzQXJnIDogdW5kZWZpbmVkO1xuICAgICAgbGVuZ3RoIC09IChjdXN0b21pemVyID8gMSA6IDApO1xuICAgIH1cbiAgICBpZiAoZ3VhcmQgJiYgaXNJdGVyYXRlZUNhbGwoc291cmNlc1swXSwgc291cmNlc1sxXSwgZ3VhcmQpKSB7XG4gICAgICBjdXN0b21pemVyID0gbGVuZ3RoIDwgMyA/IHVuZGVmaW5lZCA6IGN1c3RvbWl6ZXI7XG4gICAgICBsZW5ndGggPSAxO1xuICAgIH1cbiAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgdmFyIHNvdXJjZSA9IHNvdXJjZXNbaW5kZXhdO1xuICAgICAgaWYgKHNvdXJjZSkge1xuICAgICAgICBhc3NpZ25lcihvYmplY3QsIHNvdXJjZSwgY3VzdG9taXplcik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmplY3Q7XG4gIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZUFzc2lnbmVyO1xuIiwiLyoqXG4gKiBsb2Rhc2ggMy4wLjEgKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2Rlcm4gbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE1IFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTUgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cblxuLyoqXG4gKiBBIHNwZWNpYWxpemVkIHZlcnNpb24gb2YgYGJhc2VDYWxsYmFja2Agd2hpY2ggb25seSBzdXBwb3J0cyBgdGhpc2AgYmluZGluZ1xuICogYW5kIHNwZWNpZnlpbmcgdGhlIG51bWJlciBvZiBhcmd1bWVudHMgdG8gcHJvdmlkZSB0byBgZnVuY2AuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGJpbmQuXG4gKiBAcGFyYW0geyp9IHRoaXNBcmcgVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBmdW5jYC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBbYXJnQ291bnRdIFRoZSBudW1iZXIgb2YgYXJndW1lbnRzIHRvIHByb3ZpZGUgdG8gYGZ1bmNgLlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBjYWxsYmFjay5cbiAqL1xuZnVuY3Rpb24gYmluZENhbGxiYWNrKGZ1bmMsIHRoaXNBcmcsIGFyZ0NvdW50KSB7XG4gIGlmICh0eXBlb2YgZnVuYyAhPSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGlkZW50aXR5O1xuICB9XG4gIGlmICh0aGlzQXJnID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gZnVuYztcbiAgfVxuICBzd2l0Y2ggKGFyZ0NvdW50KSB7XG4gICAgY2FzZSAxOiByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiBmdW5jLmNhbGwodGhpc0FyZywgdmFsdWUpO1xuICAgIH07XG4gICAgY2FzZSAzOiByZXR1cm4gZnVuY3Rpb24odmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSB7XG4gICAgICByZXR1cm4gZnVuYy5jYWxsKHRoaXNBcmcsIHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbik7XG4gICAgfTtcbiAgICBjYXNlIDQ6IHJldHVybiBmdW5jdGlvbihhY2N1bXVsYXRvciwgdmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKSB7XG4gICAgICByZXR1cm4gZnVuYy5jYWxsKHRoaXNBcmcsIGFjY3VtdWxhdG9yLCB2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pO1xuICAgIH07XG4gICAgY2FzZSA1OiByZXR1cm4gZnVuY3Rpb24odmFsdWUsIG90aGVyLCBrZXksIG9iamVjdCwgc291cmNlKSB7XG4gICAgICByZXR1cm4gZnVuYy5jYWxsKHRoaXNBcmcsIHZhbHVlLCBvdGhlciwga2V5LCBvYmplY3QsIHNvdXJjZSk7XG4gICAgfTtcbiAgfVxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpc0FyZywgYXJndW1lbnRzKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBUaGlzIG1ldGhvZCByZXR1cm5zIHRoZSBmaXJzdCBhcmd1bWVudCBwcm92aWRlZCB0byBpdC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IFV0aWxpdHlcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgQW55IHZhbHVlLlxuICogQHJldHVybnMgeyp9IFJldHVybnMgYHZhbHVlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogdmFyIG9iamVjdCA9IHsgJ3VzZXInOiAnZnJlZCcgfTtcbiAqXG4gKiBfLmlkZW50aXR5KG9iamVjdCkgPT09IG9iamVjdDtcbiAqIC8vID0+IHRydWVcbiAqL1xuZnVuY3Rpb24gaWRlbnRpdHkodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJpbmRDYWxsYmFjaztcbiIsIi8qKlxuICogbG9kYXNoIDMuMC45IChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kZXJuIG1vZHVsYXJpemUgZXhwb3J0cz1cIm5wbVwiIC1vIC4vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS44LjMgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDE1IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG5cbi8qKiBVc2VkIHRvIGRldGVjdCB1bnNpZ25lZCBpbnRlZ2VyIHZhbHVlcy4gKi9cbnZhciByZUlzVWludCA9IC9eXFxkKyQvO1xuXG4vKipcbiAqIFVzZWQgYXMgdGhlIFttYXhpbXVtIGxlbmd0aF0oaHR0cHM6Ly9wZW9wbGUubW96aWxsYS5vcmcvfmpvcmVuZG9yZmYvZXM2LWRyYWZ0Lmh0bWwjc2VjLW51bWJlci5tYXhfc2FmZV9pbnRlZ2VyKVxuICogb2YgYW4gYXJyYXktbGlrZSB2YWx1ZS5cbiAqL1xudmFyIE1BWF9TQUZFX0lOVEVHRVIgPSA5MDA3MTk5MjU0NzQwOTkxO1xuXG4vKipcbiAqIFRoZSBiYXNlIGltcGxlbWVudGF0aW9uIG9mIGBfLnByb3BlcnR5YCB3aXRob3V0IHN1cHBvcnQgZm9yIGRlZXAgcGF0aHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgcHJvcGVydHkgdG8gZ2V0LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIGJhc2VQcm9wZXJ0eShrZXkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG9iamVjdCkge1xuICAgIHJldHVybiBvYmplY3QgPT0gbnVsbCA/IHVuZGVmaW5lZCA6IG9iamVjdFtrZXldO1xuICB9O1xufVxuXG4vKipcbiAqIEdldHMgdGhlIFwibGVuZ3RoXCIgcHJvcGVydHkgdmFsdWUgb2YgYG9iamVjdGAuXG4gKlxuICogKipOb3RlOioqIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byBhdm9pZCBhIFtKSVQgYnVnXShodHRwczovL2J1Z3Mud2Via2l0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MTQyNzkyKVxuICogdGhhdCBhZmZlY3RzIFNhZmFyaSBvbiBhdCBsZWFzdCBpT1MgOC4xLTguMyBBUk02NC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIHF1ZXJ5LlxuICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIFwibGVuZ3RoXCIgdmFsdWUuXG4gKi9cbnZhciBnZXRMZW5ndGggPSBiYXNlUHJvcGVydHkoJ2xlbmd0aCcpO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGFycmF5LWxpa2UuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYXJyYXktbGlrZSwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc0FycmF5TGlrZSh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgIT0gbnVsbCAmJiBpc0xlbmd0aChnZXRMZW5ndGgodmFsdWUpKTtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBhIHZhbGlkIGFycmF5LWxpa2UgaW5kZXguXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHBhcmFtIHtudW1iZXJ9IFtsZW5ndGg9TUFYX1NBRkVfSU5URUdFUl0gVGhlIHVwcGVyIGJvdW5kcyBvZiBhIHZhbGlkIGluZGV4LlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYSB2YWxpZCBpbmRleCwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc0luZGV4KHZhbHVlLCBsZW5ndGgpIHtcbiAgdmFsdWUgPSAodHlwZW9mIHZhbHVlID09ICdudW1iZXInIHx8IHJlSXNVaW50LnRlc3QodmFsdWUpKSA/ICt2YWx1ZSA6IC0xO1xuICBsZW5ndGggPSBsZW5ndGggPT0gbnVsbCA/IE1BWF9TQUZFX0lOVEVHRVIgOiBsZW5ndGg7XG4gIHJldHVybiB2YWx1ZSA+IC0xICYmIHZhbHVlICUgMSA9PSAwICYmIHZhbHVlIDwgbGVuZ3RoO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgcHJvdmlkZWQgYXJndW1lbnRzIGFyZSBmcm9tIGFuIGl0ZXJhdGVlIGNhbGwuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHBvdGVudGlhbCBpdGVyYXRlZSB2YWx1ZSBhcmd1bWVudC5cbiAqIEBwYXJhbSB7Kn0gaW5kZXggVGhlIHBvdGVudGlhbCBpdGVyYXRlZSBpbmRleCBvciBrZXkgYXJndW1lbnQuXG4gKiBAcGFyYW0geyp9IG9iamVjdCBUaGUgcG90ZW50aWFsIGl0ZXJhdGVlIG9iamVjdCBhcmd1bWVudC5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgYXJndW1lbnRzIGFyZSBmcm9tIGFuIGl0ZXJhdGVlIGNhbGwsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaXNJdGVyYXRlZUNhbGwodmFsdWUsIGluZGV4LCBvYmplY3QpIHtcbiAgaWYgKCFpc09iamVjdChvYmplY3QpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHZhciB0eXBlID0gdHlwZW9mIGluZGV4O1xuICBpZiAodHlwZSA9PSAnbnVtYmVyJ1xuICAgICAgPyAoaXNBcnJheUxpa2Uob2JqZWN0KSAmJiBpc0luZGV4KGluZGV4LCBvYmplY3QubGVuZ3RoKSlcbiAgICAgIDogKHR5cGUgPT0gJ3N0cmluZycgJiYgaW5kZXggaW4gb2JqZWN0KSkge1xuICAgIHZhciBvdGhlciA9IG9iamVjdFtpbmRleF07XG4gICAgcmV0dXJuIHZhbHVlID09PSB2YWx1ZSA/ICh2YWx1ZSA9PT0gb3RoZXIpIDogKG90aGVyICE9PSBvdGhlcik7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgdmFsaWQgYXJyYXktbGlrZSBsZW5ndGguXG4gKlxuICogKipOb3RlOioqIFRoaXMgZnVuY3Rpb24gaXMgYmFzZWQgb24gW2BUb0xlbmd0aGBdKGh0dHBzOi8vcGVvcGxlLm1vemlsbGEub3JnL35qb3JlbmRvcmZmL2VzNi1kcmFmdC5odG1sI3NlYy10b2xlbmd0aCkuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYSB2YWxpZCBsZW5ndGgsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaXNMZW5ndGgodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnbnVtYmVyJyAmJiB2YWx1ZSA+IC0xICYmIHZhbHVlICUgMSA9PSAwICYmIHZhbHVlIDw9IE1BWF9TQUZFX0lOVEVHRVI7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgdGhlIFtsYW5ndWFnZSB0eXBlXShodHRwczovL2VzNS5naXRodWIuaW8vI3g4KSBvZiBgT2JqZWN0YC5cbiAqIChlLmcuIGFycmF5cywgZnVuY3Rpb25zLCBvYmplY3RzLCByZWdleGVzLCBgbmV3IE51bWJlcigwKWAsIGFuZCBgbmV3IFN0cmluZygnJylgKVxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhbiBvYmplY3QsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc09iamVjdCh7fSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdChbMSwgMiwgM10pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QoMSk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuICAvLyBBdm9pZCBhIFY4IEpJVCBidWcgaW4gQ2hyb21lIDE5LTIwLlxuICAvLyBTZWUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTIyOTEgZm9yIG1vcmUgZGV0YWlscy5cbiAgdmFyIHR5cGUgPSB0eXBlb2YgdmFsdWU7XG4gIHJldHVybiAhIXZhbHVlICYmICh0eXBlID09ICdvYmplY3QnIHx8IHR5cGUgPT0gJ2Z1bmN0aW9uJyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaXNJdGVyYXRlZUNhbGw7XG4iLCIvKipcbiAqIGxvZGFzaCAzLjYuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZGVybiBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTUgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwczovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xuXG4vKiogVXNlZCBhcyB0aGUgYFR5cGVFcnJvcmAgbWVzc2FnZSBmb3IgXCJGdW5jdGlvbnNcIiBtZXRob2RzLiAqL1xudmFyIEZVTkNfRVJST1JfVEVYVCA9ICdFeHBlY3RlZCBhIGZ1bmN0aW9uJztcblxuLyogTmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzIGZvciB0aG9zZSB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcy4gKi9cbnZhciBuYXRpdmVNYXggPSBNYXRoLm1heDtcblxuLyoqXG4gKiBDcmVhdGVzIGEgZnVuY3Rpb24gdGhhdCBpbnZva2VzIGBmdW5jYCB3aXRoIHRoZSBgdGhpc2AgYmluZGluZyBvZiB0aGVcbiAqIGNyZWF0ZWQgZnVuY3Rpb24gYW5kIGFyZ3VtZW50cyBmcm9tIGBzdGFydGAgYW5kIGJleW9uZCBwcm92aWRlZCBhcyBhbiBhcnJheS5cbiAqXG4gKiAqKk5vdGU6KiogVGhpcyBtZXRob2QgaXMgYmFzZWQgb24gdGhlIFtyZXN0IHBhcmFtZXRlcl0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvRnVuY3Rpb25zL3Jlc3RfcGFyYW1ldGVycykuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBGdW5jdGlvblxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gYXBwbHkgYSByZXN0IHBhcmFtZXRlciB0by5cbiAqIEBwYXJhbSB7bnVtYmVyfSBbc3RhcnQ9ZnVuYy5sZW5ndGgtMV0gVGhlIHN0YXJ0IHBvc2l0aW9uIG9mIHRoZSByZXN0IHBhcmFtZXRlci5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGZ1bmN0aW9uLlxuICogQGV4YW1wbGVcbiAqXG4gKiB2YXIgc2F5ID0gXy5yZXN0UGFyYW0oZnVuY3Rpb24od2hhdCwgbmFtZXMpIHtcbiAqICAgcmV0dXJuIHdoYXQgKyAnICcgKyBfLmluaXRpYWwobmFtZXMpLmpvaW4oJywgJykgK1xuICogICAgIChfLnNpemUobmFtZXMpID4gMSA/ICcsICYgJyA6ICcnKSArIF8ubGFzdChuYW1lcyk7XG4gKiB9KTtcbiAqXG4gKiBzYXkoJ2hlbGxvJywgJ2ZyZWQnLCAnYmFybmV5JywgJ3BlYmJsZXMnKTtcbiAqIC8vID0+ICdoZWxsbyBmcmVkLCBiYXJuZXksICYgcGViYmxlcydcbiAqL1xuZnVuY3Rpb24gcmVzdFBhcmFtKGZ1bmMsIHN0YXJ0KSB7XG4gIGlmICh0eXBlb2YgZnVuYyAhPSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihGVU5DX0VSUk9SX1RFWFQpO1xuICB9XG4gIHN0YXJ0ID0gbmF0aXZlTWF4KHN0YXJ0ID09PSB1bmRlZmluZWQgPyAoZnVuYy5sZW5ndGggLSAxKSA6ICgrc3RhcnQgfHwgMCksIDApO1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFyZ3MgPSBhcmd1bWVudHMsXG4gICAgICAgIGluZGV4ID0gLTEsXG4gICAgICAgIGxlbmd0aCA9IG5hdGl2ZU1heChhcmdzLmxlbmd0aCAtIHN0YXJ0LCAwKSxcbiAgICAgICAgcmVzdCA9IEFycmF5KGxlbmd0aCk7XG5cbiAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgcmVzdFtpbmRleF0gPSBhcmdzW3N0YXJ0ICsgaW5kZXhdO1xuICAgIH1cbiAgICBzd2l0Y2ggKHN0YXJ0KSB7XG4gICAgICBjYXNlIDA6IHJldHVybiBmdW5jLmNhbGwodGhpcywgcmVzdCk7XG4gICAgICBjYXNlIDE6IHJldHVybiBmdW5jLmNhbGwodGhpcywgYXJnc1swXSwgcmVzdCk7XG4gICAgICBjYXNlIDI6IHJldHVybiBmdW5jLmNhbGwodGhpcywgYXJnc1swXSwgYXJnc1sxXSwgcmVzdCk7XG4gICAgfVxuICAgIHZhciBvdGhlckFyZ3MgPSBBcnJheShzdGFydCArIDEpO1xuICAgIGluZGV4ID0gLTE7XG4gICAgd2hpbGUgKCsraW5kZXggPCBzdGFydCkge1xuICAgICAgb3RoZXJBcmdzW2luZGV4XSA9IGFyZ3NbaW5kZXhdO1xuICAgIH1cbiAgICBvdGhlckFyZ3Nbc3RhcnRdID0gcmVzdDtcbiAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBvdGhlckFyZ3MpO1xuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJlc3RQYXJhbTtcbiIsIi8qKlxuICogbG9kYXNoIDMuOS4xIChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kZXJuIG1vZHVsYXJpemUgZXhwb3J0cz1cIm5wbVwiIC1vIC4vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS44LjMgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDE1IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG5cbi8qKiBgT2JqZWN0I3RvU3RyaW5nYCByZXN1bHQgcmVmZXJlbmNlcy4gKi9cbnZhciBmdW5jVGFnID0gJ1tvYmplY3QgRnVuY3Rpb25dJztcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IGhvc3QgY29uc3RydWN0b3JzIChTYWZhcmkgPiA1KS4gKi9cbnZhciByZUlzSG9zdEN0b3IgPSAvXlxcW29iamVjdCAuKz9Db25zdHJ1Y3RvclxcXSQvO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0TGlrZSh2YWx1ZSkge1xuICByZXR1cm4gISF2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCc7XG59XG5cbi8qKiBVc2VkIGZvciBuYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMuICovXG52YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKiogVXNlZCB0byByZXNvbHZlIHRoZSBkZWNvbXBpbGVkIHNvdXJjZSBvZiBmdW5jdGlvbnMuICovXG52YXIgZm5Ub1N0cmluZyA9IEZ1bmN0aW9uLnByb3RvdHlwZS50b1N0cmluZztcblxuLyoqIFVzZWQgdG8gY2hlY2sgb2JqZWN0cyBmb3Igb3duIHByb3BlcnRpZXMuICovXG52YXIgaGFzT3duUHJvcGVydHkgPSBvYmplY3RQcm90by5oYXNPd25Qcm9wZXJ0eTtcblxuLyoqXG4gKiBVc2VkIHRvIHJlc29sdmUgdGhlIFtgdG9TdHJpbmdUYWdgXShodHRwOi8vZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi82LjAvI3NlYy1vYmplY3QucHJvdG90eXBlLnRvc3RyaW5nKVxuICogb2YgdmFsdWVzLlxuICovXG52YXIgb2JqVG9TdHJpbmcgPSBvYmplY3RQcm90by50b1N0cmluZztcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IGlmIGEgbWV0aG9kIGlzIG5hdGl2ZS4gKi9cbnZhciByZUlzTmF0aXZlID0gUmVnRXhwKCdeJyArXG4gIGZuVG9TdHJpbmcuY2FsbChoYXNPd25Qcm9wZXJ0eSkucmVwbGFjZSgvW1xcXFxeJC4qKz8oKVtcXF17fXxdL2csICdcXFxcJCYnKVxuICAucmVwbGFjZSgvaGFzT3duUHJvcGVydHl8KGZ1bmN0aW9uKS4qPyg/PVxcXFxcXCgpfCBmb3IgLis/KD89XFxcXFxcXSkvZywgJyQxLio/JykgKyAnJCdcbik7XG5cbi8qKlxuICogR2V0cyB0aGUgbmF0aXZlIGZ1bmN0aW9uIGF0IGBrZXlgIG9mIGBvYmplY3RgLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gcXVlcnkuXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIG1ldGhvZCB0byBnZXQuXG4gKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgZnVuY3Rpb24gaWYgaXQncyBuYXRpdmUsIGVsc2UgYHVuZGVmaW5lZGAuXG4gKi9cbmZ1bmN0aW9uIGdldE5hdGl2ZShvYmplY3QsIGtleSkge1xuICB2YXIgdmFsdWUgPSBvYmplY3QgPT0gbnVsbCA/IHVuZGVmaW5lZCA6IG9iamVjdFtrZXldO1xuICByZXR1cm4gaXNOYXRpdmUodmFsdWUpID8gdmFsdWUgOiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgY2xhc3NpZmllZCBhcyBhIGBGdW5jdGlvbmAgb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBjb3JyZWN0bHkgY2xhc3NpZmllZCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzRnVuY3Rpb24oXyk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc0Z1bmN0aW9uKC9hYmMvKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgLy8gVGhlIHVzZSBvZiBgT2JqZWN0I3RvU3RyaW5nYCBhdm9pZHMgaXNzdWVzIHdpdGggdGhlIGB0eXBlb2ZgIG9wZXJhdG9yXG4gIC8vIGluIG9sZGVyIHZlcnNpb25zIG9mIENocm9tZSBhbmQgU2FmYXJpIHdoaWNoIHJldHVybiAnZnVuY3Rpb24nIGZvciByZWdleGVzXG4gIC8vIGFuZCBTYWZhcmkgOCBlcXVpdmFsZW50cyB3aGljaCByZXR1cm4gJ29iamVjdCcgZm9yIHR5cGVkIGFycmF5IGNvbnN0cnVjdG9ycy5cbiAgcmV0dXJuIGlzT2JqZWN0KHZhbHVlKSAmJiBvYmpUb1N0cmluZy5jYWxsKHZhbHVlKSA9PSBmdW5jVGFnO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZSBbbGFuZ3VhZ2UgdHlwZV0oaHR0cHM6Ly9lczUuZ2l0aHViLmlvLyN4OCkgb2YgYE9iamVjdGAuXG4gKiAoZS5nLiBhcnJheXMsIGZ1bmN0aW9ucywgb2JqZWN0cywgcmVnZXhlcywgYG5ldyBOdW1iZXIoMClgLCBhbmQgYG5ldyBTdHJpbmcoJycpYClcbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNPYmplY3Qoe30pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QoWzEsIDIsIDNdKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KDEpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcbiAgLy8gQXZvaWQgYSBWOCBKSVQgYnVnIGluIENocm9tZSAxOS0yMC5cbiAgLy8gU2VlIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0yMjkxIGZvciBtb3JlIGRldGFpbHMuXG4gIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlO1xuICByZXR1cm4gISF2YWx1ZSAmJiAodHlwZSA9PSAnb2JqZWN0JyB8fCB0eXBlID09ICdmdW5jdGlvbicpO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgbmF0aXZlIGZ1bmN0aW9uLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIG5hdGl2ZSBmdW5jdGlvbiwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzTmF0aXZlKEFycmF5LnByb3RvdHlwZS5wdXNoKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzTmF0aXZlKF8pO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNOYXRpdmUodmFsdWUpIHtcbiAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgcmV0dXJuIHJlSXNOYXRpdmUudGVzdChmblRvU3RyaW5nLmNhbGwodmFsdWUpKTtcbiAgfVxuICByZXR1cm4gaXNPYmplY3RMaWtlKHZhbHVlKSAmJiByZUlzSG9zdEN0b3IudGVzdCh2YWx1ZSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0TmF0aXZlO1xuIiwiLyoqXG4gKiBsb2Rhc2ggMy4wLjQgKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2Rlcm4gbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE1IFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTUgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBvYmplY3QtbGlrZS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBvYmplY3QtbGlrZSwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc09iamVjdExpa2UodmFsdWUpIHtcbiAgcmV0dXJuICEhdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09ICdvYmplY3QnO1xufVxuXG4vKiogVXNlZCBmb3IgbmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzLiAqL1xudmFyIG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZTtcblxuLyoqIFVzZWQgdG8gY2hlY2sgb2JqZWN0cyBmb3Igb3duIHByb3BlcnRpZXMuICovXG52YXIgaGFzT3duUHJvcGVydHkgPSBvYmplY3RQcm90by5oYXNPd25Qcm9wZXJ0eTtcblxuLyoqIE5hdGl2ZSBtZXRob2QgcmVmZXJlbmNlcy4gKi9cbnZhciBwcm9wZXJ0eUlzRW51bWVyYWJsZSA9IG9iamVjdFByb3RvLnByb3BlcnR5SXNFbnVtZXJhYmxlO1xuXG4vKipcbiAqIFVzZWQgYXMgdGhlIFttYXhpbXVtIGxlbmd0aF0oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wLyNzZWMtbnVtYmVyLm1heF9zYWZlX2ludGVnZXIpXG4gKiBvZiBhbiBhcnJheS1saWtlIHZhbHVlLlxuICovXG52YXIgTUFYX1NBRkVfSU5URUdFUiA9IDkwMDcxOTkyNTQ3NDA5OTE7XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8ucHJvcGVydHlgIHdpdGhvdXQgc3VwcG9ydCBmb3IgZGVlcCBwYXRocy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSBwcm9wZXJ0eSB0byBnZXQuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gYmFzZVByb3BlcnR5KGtleSkge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgcmV0dXJuIG9iamVjdCA9PSBudWxsID8gdW5kZWZpbmVkIDogb2JqZWN0W2tleV07XG4gIH07XG59XG5cbi8qKlxuICogR2V0cyB0aGUgXCJsZW5ndGhcIiBwcm9wZXJ0eSB2YWx1ZSBvZiBgb2JqZWN0YC5cbiAqXG4gKiAqKk5vdGU6KiogVGhpcyBmdW5jdGlvbiBpcyB1c2VkIHRvIGF2b2lkIGEgW0pJVCBidWddKGh0dHBzOi8vYnVncy53ZWJraXQub3JnL3Nob3dfYnVnLmNnaT9pZD0xNDI3OTIpXG4gKiB0aGF0IGFmZmVjdHMgU2FmYXJpIG9uIGF0IGxlYXN0IGlPUyA4LjEtOC4zIEFSTTY0LlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gcXVlcnkuXG4gKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgXCJsZW5ndGhcIiB2YWx1ZS5cbiAqL1xudmFyIGdldExlbmd0aCA9IGJhc2VQcm9wZXJ0eSgnbGVuZ3RoJyk7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYXJyYXktbGlrZS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhcnJheS1saWtlLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXlMaWtlKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAhPSBudWxsICYmIGlzTGVuZ3RoKGdldExlbmd0aCh2YWx1ZSkpO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgdmFsaWQgYXJyYXktbGlrZSBsZW5ndGguXG4gKlxuICogKipOb3RlOioqIFRoaXMgZnVuY3Rpb24gaXMgYmFzZWQgb24gW2BUb0xlbmd0aGBdKGh0dHA6Ly9lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC8jc2VjLXRvbGVuZ3RoKS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIHZhbGlkIGxlbmd0aCwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc0xlbmd0aCh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09ICdudW1iZXInICYmIHZhbHVlID4gLTEgJiYgdmFsdWUgJSAxID09IDAgJiYgdmFsdWUgPD0gTUFYX1NBRkVfSU5URUdFUjtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGFuIGBhcmd1bWVudHNgIG9iamVjdC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgY29ycmVjdGx5IGNsYXNzaWZpZWQsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc0FyZ3VtZW50cyhmdW5jdGlvbigpIHsgcmV0dXJuIGFyZ3VtZW50czsgfSgpKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzQXJndW1lbnRzKFsxLCAyLCAzXSk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0FyZ3VtZW50cyh2YWx1ZSkge1xuICByZXR1cm4gaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBpc0FycmF5TGlrZSh2YWx1ZSkgJiZcbiAgICBoYXNPd25Qcm9wZXJ0eS5jYWxsKHZhbHVlLCAnY2FsbGVlJykgJiYgIXByb3BlcnR5SXNFbnVtZXJhYmxlLmNhbGwodmFsdWUsICdjYWxsZWUnKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpc0FyZ3VtZW50cztcbiIsIi8qKlxuICogbG9kYXNoIDMuMi4wIChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kZXJuIG1vZHVsYXJpemUgZXhwb3J0cz1cIm5wbVwiIC1vIC4vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS44LjMgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDE1IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG52YXIgYmFzZUZvciA9IHJlcXVpcmUoJ2xvZGFzaC5fYmFzZWZvcicpLFxuICAgIGlzQXJndW1lbnRzID0gcmVxdWlyZSgnbG9kYXNoLmlzYXJndW1lbnRzJyksXG4gICAga2V5c0luID0gcmVxdWlyZSgnbG9kYXNoLmtleXNpbicpO1xuXG4vKiogYE9iamVjdCN0b1N0cmluZ2AgcmVzdWx0IHJlZmVyZW5jZXMuICovXG52YXIgb2JqZWN0VGFnID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgb2JqZWN0LWxpa2UuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgb2JqZWN0LWxpa2UsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaXNPYmplY3RMaWtlKHZhbHVlKSB7XG4gIHJldHVybiAhIXZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0Jztcbn1cblxuLyoqIFVzZWQgZm9yIG5hdGl2ZSBtZXRob2QgcmVmZXJlbmNlcy4gKi9cbnZhciBvYmplY3RQcm90byA9IE9iamVjdC5wcm90b3R5cGU7XG5cbi8qKiBVc2VkIHRvIGNoZWNrIG9iamVjdHMgZm9yIG93biBwcm9wZXJ0aWVzLiAqL1xudmFyIGhhc093blByb3BlcnR5ID0gb2JqZWN0UHJvdG8uaGFzT3duUHJvcGVydHk7XG5cbi8qKlxuICogVXNlZCB0byByZXNvbHZlIHRoZSBbYHRvU3RyaW5nVGFnYF0oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wLyNzZWMtb2JqZWN0LnByb3RvdHlwZS50b3N0cmluZylcbiAqIG9mIHZhbHVlcy5cbiAqL1xudmFyIG9ialRvU3RyaW5nID0gb2JqZWN0UHJvdG8udG9TdHJpbmc7XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8uZm9ySW5gIHdpdGhvdXQgc3VwcG9ydCBmb3IgY2FsbGJhY2tcbiAqIHNob3J0aGFuZHMgYW5kIGB0aGlzYCBiaW5kaW5nLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gaXRlcmF0ZWUgVGhlIGZ1bmN0aW9uIGludm9rZWQgcGVyIGl0ZXJhdGlvbi5cbiAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgYG9iamVjdGAuXG4gKi9cbmZ1bmN0aW9uIGJhc2VGb3JJbihvYmplY3QsIGl0ZXJhdGVlKSB7XG4gIHJldHVybiBiYXNlRm9yKG9iamVjdCwgaXRlcmF0ZWUsIGtleXNJbik7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSBwbGFpbiBvYmplY3QsIHRoYXQgaXMsIGFuIG9iamVjdCBjcmVhdGVkIGJ5IHRoZVxuICogYE9iamVjdGAgY29uc3RydWN0b3Igb3Igb25lIHdpdGggYSBgW1tQcm90b3R5cGVdXWAgb2YgYG51bGxgLlxuICpcbiAqICoqTm90ZToqKiBUaGlzIG1ldGhvZCBhc3N1bWVzIG9iamVjdHMgY3JlYXRlZCBieSB0aGUgYE9iamVjdGAgY29uc3RydWN0b3JcbiAqIGhhdmUgbm8gaW5oZXJpdGVkIGVudW1lcmFibGUgcHJvcGVydGllcy5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYSBwbGFpbiBvYmplY3QsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogZnVuY3Rpb24gRm9vKCkge1xuICogICB0aGlzLmEgPSAxO1xuICogfVxuICpcbiAqIF8uaXNQbGFpbk9iamVjdChuZXcgRm9vKTtcbiAqIC8vID0+IGZhbHNlXG4gKlxuICogXy5pc1BsYWluT2JqZWN0KFsxLCAyLCAzXSk7XG4gKiAvLyA9PiBmYWxzZVxuICpcbiAqIF8uaXNQbGFpbk9iamVjdCh7ICd4JzogMCwgJ3knOiAwIH0pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNQbGFpbk9iamVjdChPYmplY3QuY3JlYXRlKG51bGwpKTtcbiAqIC8vID0+IHRydWVcbiAqL1xuZnVuY3Rpb24gaXNQbGFpbk9iamVjdCh2YWx1ZSkge1xuICB2YXIgQ3RvcjtcblxuICAvLyBFeGl0IGVhcmx5IGZvciBub24gYE9iamVjdGAgb2JqZWN0cy5cbiAgaWYgKCEoaXNPYmplY3RMaWtlKHZhbHVlKSAmJiBvYmpUb1N0cmluZy5jYWxsKHZhbHVlKSA9PSBvYmplY3RUYWcgJiYgIWlzQXJndW1lbnRzKHZhbHVlKSkgfHxcbiAgICAgICghaGFzT3duUHJvcGVydHkuY2FsbCh2YWx1ZSwgJ2NvbnN0cnVjdG9yJykgJiYgKEN0b3IgPSB2YWx1ZS5jb25zdHJ1Y3RvciwgdHlwZW9mIEN0b3IgPT0gJ2Z1bmN0aW9uJyAmJiAhKEN0b3IgaW5zdGFuY2VvZiBDdG9yKSkpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8vIElFIDwgOSBpdGVyYXRlcyBpbmhlcml0ZWQgcHJvcGVydGllcyBiZWZvcmUgb3duIHByb3BlcnRpZXMuIElmIHRoZSBmaXJzdFxuICAvLyBpdGVyYXRlZCBwcm9wZXJ0eSBpcyBhbiBvYmplY3QncyBvd24gcHJvcGVydHkgdGhlbiB0aGVyZSBhcmUgbm8gaW5oZXJpdGVkXG4gIC8vIGVudW1lcmFibGUgcHJvcGVydGllcy5cbiAgdmFyIHJlc3VsdDtcbiAgLy8gSW4gbW9zdCBlbnZpcm9ubWVudHMgYW4gb2JqZWN0J3Mgb3duIHByb3BlcnRpZXMgYXJlIGl0ZXJhdGVkIGJlZm9yZVxuICAvLyBpdHMgaW5oZXJpdGVkIHByb3BlcnRpZXMuIElmIHRoZSBsYXN0IGl0ZXJhdGVkIHByb3BlcnR5IGlzIGFuIG9iamVjdCdzXG4gIC8vIG93biBwcm9wZXJ0eSB0aGVuIHRoZXJlIGFyZSBubyBpbmhlcml0ZWQgZW51bWVyYWJsZSBwcm9wZXJ0aWVzLlxuICBiYXNlRm9ySW4odmFsdWUsIGZ1bmN0aW9uKHN1YlZhbHVlLCBrZXkpIHtcbiAgICByZXN1bHQgPSBrZXk7XG4gIH0pO1xuICByZXR1cm4gcmVzdWx0ID09PSB1bmRlZmluZWQgfHwgaGFzT3duUHJvcGVydHkuY2FsbCh2YWx1ZSwgcmVzdWx0KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpc1BsYWluT2JqZWN0O1xuIiwiLyoqXG4gKiBsb2Rhc2ggMy4wLjIgKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2Rlcm4gbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE1IFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTUgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgYmFzZUZvckluYCBhbmQgYGJhc2VGb3JPd25gIHdoaWNoIGl0ZXJhdGVzXG4gKiBvdmVyIGBvYmplY3RgIHByb3BlcnRpZXMgcmV0dXJuZWQgYnkgYGtleXNGdW5jYCBpbnZva2luZyBgaXRlcmF0ZWVgIGZvclxuICogZWFjaCBwcm9wZXJ0eS4gSXRlcmF0ZWUgZnVuY3Rpb25zIG1heSBleGl0IGl0ZXJhdGlvbiBlYXJseSBieSBleHBsaWNpdGx5XG4gKiByZXR1cm5pbmcgYGZhbHNlYC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGl0ZXJhdGVlIFRoZSBmdW5jdGlvbiBpbnZva2VkIHBlciBpdGVyYXRpb24uXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBrZXlzRnVuYyBUaGUgZnVuY3Rpb24gdG8gZ2V0IHRoZSBrZXlzIG9mIGBvYmplY3RgLlxuICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyBgb2JqZWN0YC5cbiAqL1xudmFyIGJhc2VGb3IgPSBjcmVhdGVCYXNlRm9yKCk7XG5cbi8qKlxuICogQ3JlYXRlcyBhIGJhc2UgZnVuY3Rpb24gZm9yIGBfLmZvckluYCBvciBgXy5mb3JJblJpZ2h0YC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtib29sZWFufSBbZnJvbVJpZ2h0XSBTcGVjaWZ5IGl0ZXJhdGluZyBmcm9tIHJpZ2h0IHRvIGxlZnQuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBiYXNlIGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiBjcmVhdGVCYXNlRm9yKGZyb21SaWdodCkge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqZWN0LCBpdGVyYXRlZSwga2V5c0Z1bmMpIHtcbiAgICB2YXIgaXRlcmFibGUgPSB0b09iamVjdChvYmplY3QpLFxuICAgICAgICBwcm9wcyA9IGtleXNGdW5jKG9iamVjdCksXG4gICAgICAgIGxlbmd0aCA9IHByb3BzLmxlbmd0aCxcbiAgICAgICAgaW5kZXggPSBmcm9tUmlnaHQgPyBsZW5ndGggOiAtMTtcblxuICAgIHdoaWxlICgoZnJvbVJpZ2h0ID8gaW5kZXgtLSA6ICsraW5kZXggPCBsZW5ndGgpKSB7XG4gICAgICB2YXIga2V5ID0gcHJvcHNbaW5kZXhdO1xuICAgICAgaWYgKGl0ZXJhdGVlKGl0ZXJhYmxlW2tleV0sIGtleSwgaXRlcmFibGUpID09PSBmYWxzZSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBgdmFsdWVgIHRvIGFuIG9iamVjdCBpZiBpdCdzIG5vdCBvbmUuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHByb2Nlc3MuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIHRvT2JqZWN0KHZhbHVlKSB7XG4gIHJldHVybiBpc09iamVjdCh2YWx1ZSkgPyB2YWx1ZSA6IE9iamVjdCh2YWx1ZSk7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgdGhlIFtsYW5ndWFnZSB0eXBlXShodHRwczovL2VzNS5naXRodWIuaW8vI3g4KSBvZiBgT2JqZWN0YC5cbiAqIChlLmcuIGFycmF5cywgZnVuY3Rpb25zLCBvYmplY3RzLCByZWdleGVzLCBgbmV3IE51bWJlcigwKWAsIGFuZCBgbmV3IFN0cmluZygnJylgKVxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhbiBvYmplY3QsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc09iamVjdCh7fSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdChbMSwgMiwgM10pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QoMSk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuICAvLyBBdm9pZCBhIFY4IEpJVCBidWcgaW4gQ2hyb21lIDE5LTIwLlxuICAvLyBTZWUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTIyOTEgZm9yIG1vcmUgZGV0YWlscy5cbiAgdmFyIHR5cGUgPSB0eXBlb2YgdmFsdWU7XG4gIHJldHVybiAhIXZhbHVlICYmICh0eXBlID09ICdvYmplY3QnIHx8IHR5cGUgPT0gJ2Z1bmN0aW9uJyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYmFzZUZvcjtcbiIsIi8qKlxuICogbG9kYXNoIDMuMC4yIChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kZXJuIG1vZHVsYXJpemUgZXhwb3J0cz1cIm5wbVwiIC1vIC4vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS44LjMgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDE1IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG5cbi8qKiBgT2JqZWN0I3RvU3RyaW5nYCByZXN1bHQgcmVmZXJlbmNlcy4gKi9cbnZhciBhcmdzVGFnID0gJ1tvYmplY3QgQXJndW1lbnRzXScsXG4gICAgYXJyYXlUYWcgPSAnW29iamVjdCBBcnJheV0nLFxuICAgIGJvb2xUYWcgPSAnW29iamVjdCBCb29sZWFuXScsXG4gICAgZGF0ZVRhZyA9ICdbb2JqZWN0IERhdGVdJyxcbiAgICBlcnJvclRhZyA9ICdbb2JqZWN0IEVycm9yXScsXG4gICAgZnVuY1RhZyA9ICdbb2JqZWN0IEZ1bmN0aW9uXScsXG4gICAgbWFwVGFnID0gJ1tvYmplY3QgTWFwXScsXG4gICAgbnVtYmVyVGFnID0gJ1tvYmplY3QgTnVtYmVyXScsXG4gICAgb2JqZWN0VGFnID0gJ1tvYmplY3QgT2JqZWN0XScsXG4gICAgcmVnZXhwVGFnID0gJ1tvYmplY3QgUmVnRXhwXScsXG4gICAgc2V0VGFnID0gJ1tvYmplY3QgU2V0XScsXG4gICAgc3RyaW5nVGFnID0gJ1tvYmplY3QgU3RyaW5nXScsXG4gICAgd2Vha01hcFRhZyA9ICdbb2JqZWN0IFdlYWtNYXBdJztcblxudmFyIGFycmF5QnVmZmVyVGFnID0gJ1tvYmplY3QgQXJyYXlCdWZmZXJdJyxcbiAgICBmbG9hdDMyVGFnID0gJ1tvYmplY3QgRmxvYXQzMkFycmF5XScsXG4gICAgZmxvYXQ2NFRhZyA9ICdbb2JqZWN0IEZsb2F0NjRBcnJheV0nLFxuICAgIGludDhUYWcgPSAnW29iamVjdCBJbnQ4QXJyYXldJyxcbiAgICBpbnQxNlRhZyA9ICdbb2JqZWN0IEludDE2QXJyYXldJyxcbiAgICBpbnQzMlRhZyA9ICdbb2JqZWN0IEludDMyQXJyYXldJyxcbiAgICB1aW50OFRhZyA9ICdbb2JqZWN0IFVpbnQ4QXJyYXldJyxcbiAgICB1aW50OENsYW1wZWRUYWcgPSAnW29iamVjdCBVaW50OENsYW1wZWRBcnJheV0nLFxuICAgIHVpbnQxNlRhZyA9ICdbb2JqZWN0IFVpbnQxNkFycmF5XScsXG4gICAgdWludDMyVGFnID0gJ1tvYmplY3QgVWludDMyQXJyYXldJztcblxuLyoqIFVzZWQgdG8gaWRlbnRpZnkgYHRvU3RyaW5nVGFnYCB2YWx1ZXMgb2YgdHlwZWQgYXJyYXlzLiAqL1xudmFyIHR5cGVkQXJyYXlUYWdzID0ge307XG50eXBlZEFycmF5VGFnc1tmbG9hdDMyVGFnXSA9IHR5cGVkQXJyYXlUYWdzW2Zsb2F0NjRUYWddID1cbnR5cGVkQXJyYXlUYWdzW2ludDhUYWddID0gdHlwZWRBcnJheVRhZ3NbaW50MTZUYWddID1cbnR5cGVkQXJyYXlUYWdzW2ludDMyVGFnXSA9IHR5cGVkQXJyYXlUYWdzW3VpbnQ4VGFnXSA9XG50eXBlZEFycmF5VGFnc1t1aW50OENsYW1wZWRUYWddID0gdHlwZWRBcnJheVRhZ3NbdWludDE2VGFnXSA9XG50eXBlZEFycmF5VGFnc1t1aW50MzJUYWddID0gdHJ1ZTtcbnR5cGVkQXJyYXlUYWdzW2FyZ3NUYWddID0gdHlwZWRBcnJheVRhZ3NbYXJyYXlUYWddID1cbnR5cGVkQXJyYXlUYWdzW2FycmF5QnVmZmVyVGFnXSA9IHR5cGVkQXJyYXlUYWdzW2Jvb2xUYWddID1cbnR5cGVkQXJyYXlUYWdzW2RhdGVUYWddID0gdHlwZWRBcnJheVRhZ3NbZXJyb3JUYWddID1cbnR5cGVkQXJyYXlUYWdzW2Z1bmNUYWddID0gdHlwZWRBcnJheVRhZ3NbbWFwVGFnXSA9XG50eXBlZEFycmF5VGFnc1tudW1iZXJUYWddID0gdHlwZWRBcnJheVRhZ3Nbb2JqZWN0VGFnXSA9XG50eXBlZEFycmF5VGFnc1tyZWdleHBUYWddID0gdHlwZWRBcnJheVRhZ3Nbc2V0VGFnXSA9XG50eXBlZEFycmF5VGFnc1tzdHJpbmdUYWddID0gdHlwZWRBcnJheVRhZ3Nbd2Vha01hcFRhZ10gPSBmYWxzZTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBvYmplY3QtbGlrZS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBvYmplY3QtbGlrZSwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc09iamVjdExpa2UodmFsdWUpIHtcbiAgcmV0dXJuICEhdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09ICdvYmplY3QnO1xufVxuXG4vKiogVXNlZCBmb3IgbmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzLiAqL1xudmFyIG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZTtcblxuLyoqXG4gKiBVc2VkIHRvIHJlc29sdmUgdGhlIFtgdG9TdHJpbmdUYWdgXShodHRwczovL3Blb3BsZS5tb3ppbGxhLm9yZy9+am9yZW5kb3JmZi9lczYtZHJhZnQuaHRtbCNzZWMtb2JqZWN0LnByb3RvdHlwZS50b3N0cmluZylcbiAqIG9mIHZhbHVlcy5cbiAqL1xudmFyIG9ialRvU3RyaW5nID0gb2JqZWN0UHJvdG8udG9TdHJpbmc7XG5cbi8qKlxuICogVXNlZCBhcyB0aGUgW21heGltdW0gbGVuZ3RoXShodHRwczovL3Blb3BsZS5tb3ppbGxhLm9yZy9+am9yZW5kb3JmZi9lczYtZHJhZnQuaHRtbCNzZWMtbnVtYmVyLm1heF9zYWZlX2ludGVnZXIpXG4gKiBvZiBhbiBhcnJheS1saWtlIHZhbHVlLlxuICovXG52YXIgTUFYX1NBRkVfSU5URUdFUiA9IDkwMDcxOTkyNTQ3NDA5OTE7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSB2YWxpZCBhcnJheS1saWtlIGxlbmd0aC5cbiAqXG4gKiAqKk5vdGU6KiogVGhpcyBmdW5jdGlvbiBpcyBiYXNlZCBvbiBbYFRvTGVuZ3RoYF0oaHR0cHM6Ly9wZW9wbGUubW96aWxsYS5vcmcvfmpvcmVuZG9yZmYvZXM2LWRyYWZ0Lmh0bWwjc2VjLXRvbGVuZ3RoKS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIHZhbGlkIGxlbmd0aCwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc0xlbmd0aCh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09ICdudW1iZXInICYmIHZhbHVlID4gLTEgJiYgdmFsdWUgJSAxID09IDAgJiYgdmFsdWUgPD0gTUFYX1NBRkVfSU5URUdFUjtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGEgdHlwZWQgYXJyYXkuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGNvcnJlY3RseSBjbGFzc2lmaWVkLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNUeXBlZEFycmF5KG5ldyBVaW50OEFycmF5KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzVHlwZWRBcnJheShbXSk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc1R5cGVkQXJyYXkodmFsdWUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgaXNMZW5ndGgodmFsdWUubGVuZ3RoKSAmJiAhIXR5cGVkQXJyYXlUYWdzW29ialRvU3RyaW5nLmNhbGwodmFsdWUpXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpc1R5cGVkQXJyYXk7XG4iLCIvKipcbiAqIGxvZGFzaCAzLjEuMiAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZGVybiBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTUgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwczovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xudmFyIGdldE5hdGl2ZSA9IHJlcXVpcmUoJ2xvZGFzaC5fZ2V0bmF0aXZlJyksXG4gICAgaXNBcmd1bWVudHMgPSByZXF1aXJlKCdsb2Rhc2guaXNhcmd1bWVudHMnKSxcbiAgICBpc0FycmF5ID0gcmVxdWlyZSgnbG9kYXNoLmlzYXJyYXknKTtcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IHVuc2lnbmVkIGludGVnZXIgdmFsdWVzLiAqL1xudmFyIHJlSXNVaW50ID0gL15cXGQrJC87XG5cbi8qKiBVc2VkIGZvciBuYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMuICovXG52YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKiogVXNlZCB0byBjaGVjayBvYmplY3RzIGZvciBvd24gcHJvcGVydGllcy4gKi9cbnZhciBoYXNPd25Qcm9wZXJ0eSA9IG9iamVjdFByb3RvLmhhc093blByb3BlcnR5O1xuXG4vKiBOYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMgZm9yIHRob3NlIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBvdGhlciBgbG9kYXNoYCBtZXRob2RzLiAqL1xudmFyIG5hdGl2ZUtleXMgPSBnZXROYXRpdmUoT2JqZWN0LCAna2V5cycpO1xuXG4vKipcbiAqIFVzZWQgYXMgdGhlIFttYXhpbXVtIGxlbmd0aF0oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wLyNzZWMtbnVtYmVyLm1heF9zYWZlX2ludGVnZXIpXG4gKiBvZiBhbiBhcnJheS1saWtlIHZhbHVlLlxuICovXG52YXIgTUFYX1NBRkVfSU5URUdFUiA9IDkwMDcxOTkyNTQ3NDA5OTE7XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8ucHJvcGVydHlgIHdpdGhvdXQgc3VwcG9ydCBmb3IgZGVlcCBwYXRocy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSBwcm9wZXJ0eSB0byBnZXQuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gYmFzZVByb3BlcnR5KGtleSkge1xuICByZXR1cm4gZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgcmV0dXJuIG9iamVjdCA9PSBudWxsID8gdW5kZWZpbmVkIDogb2JqZWN0W2tleV07XG4gIH07XG59XG5cbi8qKlxuICogR2V0cyB0aGUgXCJsZW5ndGhcIiBwcm9wZXJ0eSB2YWx1ZSBvZiBgb2JqZWN0YC5cbiAqXG4gKiAqKk5vdGU6KiogVGhpcyBmdW5jdGlvbiBpcyB1c2VkIHRvIGF2b2lkIGEgW0pJVCBidWddKGh0dHBzOi8vYnVncy53ZWJraXQub3JnL3Nob3dfYnVnLmNnaT9pZD0xNDI3OTIpXG4gKiB0aGF0IGFmZmVjdHMgU2FmYXJpIG9uIGF0IGxlYXN0IGlPUyA4LjEtOC4zIEFSTTY0LlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gcXVlcnkuXG4gKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgXCJsZW5ndGhcIiB2YWx1ZS5cbiAqL1xudmFyIGdldExlbmd0aCA9IGJhc2VQcm9wZXJ0eSgnbGVuZ3RoJyk7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYXJyYXktbGlrZS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhcnJheS1saWtlLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXlMaWtlKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAhPSBudWxsICYmIGlzTGVuZ3RoKGdldExlbmd0aCh2YWx1ZSkpO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgdmFsaWQgYXJyYXktbGlrZSBpbmRleC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aD1NQVhfU0FGRV9JTlRFR0VSXSBUaGUgdXBwZXIgYm91bmRzIG9mIGEgdmFsaWQgaW5kZXguXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIHZhbGlkIGluZGV4LCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzSW5kZXgodmFsdWUsIGxlbmd0aCkge1xuICB2YWx1ZSA9ICh0eXBlb2YgdmFsdWUgPT0gJ251bWJlcicgfHwgcmVJc1VpbnQudGVzdCh2YWx1ZSkpID8gK3ZhbHVlIDogLTE7XG4gIGxlbmd0aCA9IGxlbmd0aCA9PSBudWxsID8gTUFYX1NBRkVfSU5URUdFUiA6IGxlbmd0aDtcbiAgcmV0dXJuIHZhbHVlID4gLTEgJiYgdmFsdWUgJSAxID09IDAgJiYgdmFsdWUgPCBsZW5ndGg7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSB2YWxpZCBhcnJheS1saWtlIGxlbmd0aC5cbiAqXG4gKiAqKk5vdGU6KiogVGhpcyBmdW5jdGlvbiBpcyBiYXNlZCBvbiBbYFRvTGVuZ3RoYF0oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wLyNzZWMtdG9sZW5ndGgpLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgdmFsaWQgbGVuZ3RoLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzTGVuZ3RoKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ251bWJlcicgJiYgdmFsdWUgPiAtMSAmJiB2YWx1ZSAlIDEgPT0gMCAmJiB2YWx1ZSA8PSBNQVhfU0FGRV9JTlRFR0VSO1xufVxuXG4vKipcbiAqIEEgZmFsbGJhY2sgaW1wbGVtZW50YXRpb24gb2YgYE9iamVjdC5rZXlzYCB3aGljaCBjcmVhdGVzIGFuIGFycmF5IG9mIHRoZVxuICogb3duIGVudW1lcmFibGUgcHJvcGVydHkgbmFtZXMgb2YgYG9iamVjdGAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBxdWVyeS5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgYXJyYXkgb2YgcHJvcGVydHkgbmFtZXMuXG4gKi9cbmZ1bmN0aW9uIHNoaW1LZXlzKG9iamVjdCkge1xuICB2YXIgcHJvcHMgPSBrZXlzSW4ob2JqZWN0KSxcbiAgICAgIHByb3BzTGVuZ3RoID0gcHJvcHMubGVuZ3RoLFxuICAgICAgbGVuZ3RoID0gcHJvcHNMZW5ndGggJiYgb2JqZWN0Lmxlbmd0aDtcblxuICB2YXIgYWxsb3dJbmRleGVzID0gISFsZW5ndGggJiYgaXNMZW5ndGgobGVuZ3RoKSAmJlxuICAgIChpc0FycmF5KG9iamVjdCkgfHwgaXNBcmd1bWVudHMob2JqZWN0KSk7XG5cbiAgdmFyIGluZGV4ID0gLTEsXG4gICAgICByZXN1bHQgPSBbXTtcblxuICB3aGlsZSAoKytpbmRleCA8IHByb3BzTGVuZ3RoKSB7XG4gICAgdmFyIGtleSA9IHByb3BzW2luZGV4XTtcbiAgICBpZiAoKGFsbG93SW5kZXhlcyAmJiBpc0luZGV4KGtleSwgbGVuZ3RoKSkgfHwgaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIGtleSkpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGtleSk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgdGhlIFtsYW5ndWFnZSB0eXBlXShodHRwczovL2VzNS5naXRodWIuaW8vI3g4KSBvZiBgT2JqZWN0YC5cbiAqIChlLmcuIGFycmF5cywgZnVuY3Rpb25zLCBvYmplY3RzLCByZWdleGVzLCBgbmV3IE51bWJlcigwKWAsIGFuZCBgbmV3IFN0cmluZygnJylgKVxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhbiBvYmplY3QsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc09iamVjdCh7fSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdChbMSwgMiwgM10pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QoMSk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuICAvLyBBdm9pZCBhIFY4IEpJVCBidWcgaW4gQ2hyb21lIDE5LTIwLlxuICAvLyBTZWUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTIyOTEgZm9yIG1vcmUgZGV0YWlscy5cbiAgdmFyIHR5cGUgPSB0eXBlb2YgdmFsdWU7XG4gIHJldHVybiAhIXZhbHVlICYmICh0eXBlID09ICdvYmplY3QnIHx8IHR5cGUgPT0gJ2Z1bmN0aW9uJyk7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBhcnJheSBvZiB0aGUgb3duIGVudW1lcmFibGUgcHJvcGVydHkgbmFtZXMgb2YgYG9iamVjdGAuXG4gKlxuICogKipOb3RlOioqIE5vbi1vYmplY3QgdmFsdWVzIGFyZSBjb2VyY2VkIHRvIG9iamVjdHMuIFNlZSB0aGVcbiAqIFtFUyBzcGVjXShodHRwOi8vZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi82LjAvI3NlYy1vYmplY3Qua2V5cylcbiAqIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBPYmplY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBxdWVyeS5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgYXJyYXkgb2YgcHJvcGVydHkgbmFtZXMuXG4gKiBAZXhhbXBsZVxuICpcbiAqIGZ1bmN0aW9uIEZvbygpIHtcbiAqICAgdGhpcy5hID0gMTtcbiAqICAgdGhpcy5iID0gMjtcbiAqIH1cbiAqXG4gKiBGb28ucHJvdG90eXBlLmMgPSAzO1xuICpcbiAqIF8ua2V5cyhuZXcgRm9vKTtcbiAqIC8vID0+IFsnYScsICdiJ10gKGl0ZXJhdGlvbiBvcmRlciBpcyBub3QgZ3VhcmFudGVlZClcbiAqXG4gKiBfLmtleXMoJ2hpJyk7XG4gKiAvLyA9PiBbJzAnLCAnMSddXG4gKi9cbnZhciBrZXlzID0gIW5hdGl2ZUtleXMgPyBzaGltS2V5cyA6IGZ1bmN0aW9uKG9iamVjdCkge1xuICB2YXIgQ3RvciA9IG9iamVjdCA9PSBudWxsID8gdW5kZWZpbmVkIDogb2JqZWN0LmNvbnN0cnVjdG9yO1xuICBpZiAoKHR5cGVvZiBDdG9yID09ICdmdW5jdGlvbicgJiYgQ3Rvci5wcm90b3R5cGUgPT09IG9iamVjdCkgfHxcbiAgICAgICh0eXBlb2Ygb2JqZWN0ICE9ICdmdW5jdGlvbicgJiYgaXNBcnJheUxpa2Uob2JqZWN0KSkpIHtcbiAgICByZXR1cm4gc2hpbUtleXMob2JqZWN0KTtcbiAgfVxuICByZXR1cm4gaXNPYmplY3Qob2JqZWN0KSA/IG5hdGl2ZUtleXMob2JqZWN0KSA6IFtdO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIGFycmF5IG9mIHRoZSBvd24gYW5kIGluaGVyaXRlZCBlbnVtZXJhYmxlIHByb3BlcnR5IG5hbWVzIG9mIGBvYmplY3RgLlxuICpcbiAqICoqTm90ZToqKiBOb24tb2JqZWN0IHZhbHVlcyBhcmUgY29lcmNlZCB0byBvYmplY3RzLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgT2JqZWN0XG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gcXVlcnkuXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgdGhlIGFycmF5IG9mIHByb3BlcnR5IG5hbWVzLlxuICogQGV4YW1wbGVcbiAqXG4gKiBmdW5jdGlvbiBGb28oKSB7XG4gKiAgIHRoaXMuYSA9IDE7XG4gKiAgIHRoaXMuYiA9IDI7XG4gKiB9XG4gKlxuICogRm9vLnByb3RvdHlwZS5jID0gMztcbiAqXG4gKiBfLmtleXNJbihuZXcgRm9vKTtcbiAqIC8vID0+IFsnYScsICdiJywgJ2MnXSAoaXRlcmF0aW9uIG9yZGVyIGlzIG5vdCBndWFyYW50ZWVkKVxuICovXG5mdW5jdGlvbiBrZXlzSW4ob2JqZWN0KSB7XG4gIGlmIChvYmplY3QgPT0gbnVsbCkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuICBpZiAoIWlzT2JqZWN0KG9iamVjdCkpIHtcbiAgICBvYmplY3QgPSBPYmplY3Qob2JqZWN0KTtcbiAgfVxuICB2YXIgbGVuZ3RoID0gb2JqZWN0Lmxlbmd0aDtcbiAgbGVuZ3RoID0gKGxlbmd0aCAmJiBpc0xlbmd0aChsZW5ndGgpICYmXG4gICAgKGlzQXJyYXkob2JqZWN0KSB8fCBpc0FyZ3VtZW50cyhvYmplY3QpKSAmJiBsZW5ndGgpIHx8IDA7XG5cbiAgdmFyIEN0b3IgPSBvYmplY3QuY29uc3RydWN0b3IsXG4gICAgICBpbmRleCA9IC0xLFxuICAgICAgaXNQcm90byA9IHR5cGVvZiBDdG9yID09ICdmdW5jdGlvbicgJiYgQ3Rvci5wcm90b3R5cGUgPT09IG9iamVjdCxcbiAgICAgIHJlc3VsdCA9IEFycmF5KGxlbmd0aCksXG4gICAgICBza2lwSW5kZXhlcyA9IGxlbmd0aCA+IDA7XG5cbiAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICByZXN1bHRbaW5kZXhdID0gKGluZGV4ICsgJycpO1xuICB9XG4gIGZvciAodmFyIGtleSBpbiBvYmplY3QpIHtcbiAgICBpZiAoIShza2lwSW5kZXhlcyAmJiBpc0luZGV4KGtleSwgbGVuZ3RoKSkgJiZcbiAgICAgICAgIShrZXkgPT0gJ2NvbnN0cnVjdG9yJyAmJiAoaXNQcm90byB8fCAhaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIGtleSkpKSkge1xuICAgICAgcmVzdWx0LnB1c2goa2V5KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBrZXlzO1xuIiwiLyoqXG4gKiBsb2Rhc2ggMy4wLjggKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2Rlcm4gbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE1IFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTUgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBpc0FyZ3VtZW50cyA9IHJlcXVpcmUoJ2xvZGFzaC5pc2FyZ3VtZW50cycpLFxuICAgIGlzQXJyYXkgPSByZXF1aXJlKCdsb2Rhc2guaXNhcnJheScpO1xuXG4vKiogVXNlZCB0byBkZXRlY3QgdW5zaWduZWQgaW50ZWdlciB2YWx1ZXMuICovXG52YXIgcmVJc1VpbnQgPSAvXlxcZCskLztcblxuLyoqIFVzZWQgZm9yIG5hdGl2ZSBtZXRob2QgcmVmZXJlbmNlcy4gKi9cbnZhciBvYmplY3RQcm90byA9IE9iamVjdC5wcm90b3R5cGU7XG5cbi8qKiBVc2VkIHRvIGNoZWNrIG9iamVjdHMgZm9yIG93biBwcm9wZXJ0aWVzLiAqL1xudmFyIGhhc093blByb3BlcnR5ID0gb2JqZWN0UHJvdG8uaGFzT3duUHJvcGVydHk7XG5cbi8qKlxuICogVXNlZCBhcyB0aGUgW21heGltdW0gbGVuZ3RoXShodHRwczovL3Blb3BsZS5tb3ppbGxhLm9yZy9+am9yZW5kb3JmZi9lczYtZHJhZnQuaHRtbCNzZWMtbnVtYmVyLm1heF9zYWZlX2ludGVnZXIpXG4gKiBvZiBhbiBhcnJheS1saWtlIHZhbHVlLlxuICovXG52YXIgTUFYX1NBRkVfSU5URUdFUiA9IDkwMDcxOTkyNTQ3NDA5OTE7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSB2YWxpZCBhcnJheS1saWtlIGluZGV4LlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEBwYXJhbSB7bnVtYmVyfSBbbGVuZ3RoPU1BWF9TQUZFX0lOVEVHRVJdIFRoZSB1cHBlciBib3VuZHMgb2YgYSB2YWxpZCBpbmRleC5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgdmFsaWQgaW5kZXgsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaXNJbmRleCh2YWx1ZSwgbGVuZ3RoKSB7XG4gIHZhbHVlID0gKHR5cGVvZiB2YWx1ZSA9PSAnbnVtYmVyJyB8fCByZUlzVWludC50ZXN0KHZhbHVlKSkgPyArdmFsdWUgOiAtMTtcbiAgbGVuZ3RoID0gbGVuZ3RoID09IG51bGwgPyBNQVhfU0FGRV9JTlRFR0VSIDogbGVuZ3RoO1xuICByZXR1cm4gdmFsdWUgPiAtMSAmJiB2YWx1ZSAlIDEgPT0gMCAmJiB2YWx1ZSA8IGxlbmd0aDtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBhIHZhbGlkIGFycmF5LWxpa2UgbGVuZ3RoLlxuICpcbiAqICoqTm90ZToqKiBUaGlzIGZ1bmN0aW9uIGlzIGJhc2VkIG9uIFtgVG9MZW5ndGhgXShodHRwczovL3Blb3BsZS5tb3ppbGxhLm9yZy9+am9yZW5kb3JmZi9lczYtZHJhZnQuaHRtbCNzZWMtdG9sZW5ndGgpLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgdmFsaWQgbGVuZ3RoLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzTGVuZ3RoKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ251bWJlcicgJiYgdmFsdWUgPiAtMSAmJiB2YWx1ZSAlIDEgPT0gMCAmJiB2YWx1ZSA8PSBNQVhfU0FGRV9JTlRFR0VSO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZSBbbGFuZ3VhZ2UgdHlwZV0oaHR0cHM6Ly9lczUuZ2l0aHViLmlvLyN4OCkgb2YgYE9iamVjdGAuXG4gKiAoZS5nLiBhcnJheXMsIGZ1bmN0aW9ucywgb2JqZWN0cywgcmVnZXhlcywgYG5ldyBOdW1iZXIoMClgLCBhbmQgYG5ldyBTdHJpbmcoJycpYClcbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNPYmplY3Qoe30pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QoWzEsIDIsIDNdKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KDEpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcbiAgLy8gQXZvaWQgYSBWOCBKSVQgYnVnIGluIENocm9tZSAxOS0yMC5cbiAgLy8gU2VlIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0yMjkxIGZvciBtb3JlIGRldGFpbHMuXG4gIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlO1xuICByZXR1cm4gISF2YWx1ZSAmJiAodHlwZSA9PSAnb2JqZWN0JyB8fCB0eXBlID09ICdmdW5jdGlvbicpO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYW4gYXJyYXkgb2YgdGhlIG93biBhbmQgaW5oZXJpdGVkIGVudW1lcmFibGUgcHJvcGVydHkgbmFtZXMgb2YgYG9iamVjdGAuXG4gKlxuICogKipOb3RlOioqIE5vbi1vYmplY3QgdmFsdWVzIGFyZSBjb2VyY2VkIHRvIG9iamVjdHMuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBPYmplY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBxdWVyeS5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgYXJyYXkgb2YgcHJvcGVydHkgbmFtZXMuXG4gKiBAZXhhbXBsZVxuICpcbiAqIGZ1bmN0aW9uIEZvbygpIHtcbiAqICAgdGhpcy5hID0gMTtcbiAqICAgdGhpcy5iID0gMjtcbiAqIH1cbiAqXG4gKiBGb28ucHJvdG90eXBlLmMgPSAzO1xuICpcbiAqIF8ua2V5c0luKG5ldyBGb28pO1xuICogLy8gPT4gWydhJywgJ2InLCAnYyddIChpdGVyYXRpb24gb3JkZXIgaXMgbm90IGd1YXJhbnRlZWQpXG4gKi9cbmZ1bmN0aW9uIGtleXNJbihvYmplY3QpIHtcbiAgaWYgKG9iamVjdCA9PSBudWxsKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIGlmICghaXNPYmplY3Qob2JqZWN0KSkge1xuICAgIG9iamVjdCA9IE9iamVjdChvYmplY3QpO1xuICB9XG4gIHZhciBsZW5ndGggPSBvYmplY3QubGVuZ3RoO1xuICBsZW5ndGggPSAobGVuZ3RoICYmIGlzTGVuZ3RoKGxlbmd0aCkgJiZcbiAgICAoaXNBcnJheShvYmplY3QpIHx8IGlzQXJndW1lbnRzKG9iamVjdCkpICYmIGxlbmd0aCkgfHwgMDtcblxuICB2YXIgQ3RvciA9IG9iamVjdC5jb25zdHJ1Y3RvcixcbiAgICAgIGluZGV4ID0gLTEsXG4gICAgICBpc1Byb3RvID0gdHlwZW9mIEN0b3IgPT0gJ2Z1bmN0aW9uJyAmJiBDdG9yLnByb3RvdHlwZSA9PT0gb2JqZWN0LFxuICAgICAgcmVzdWx0ID0gQXJyYXkobGVuZ3RoKSxcbiAgICAgIHNraXBJbmRleGVzID0gbGVuZ3RoID4gMDtcblxuICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgIHJlc3VsdFtpbmRleF0gPSAoaW5kZXggKyAnJyk7XG4gIH1cbiAgZm9yICh2YXIga2V5IGluIG9iamVjdCkge1xuICAgIGlmICghKHNraXBJbmRleGVzICYmIGlzSW5kZXgoa2V5LCBsZW5ndGgpKSAmJlxuICAgICAgICAhKGtleSA9PSAnY29uc3RydWN0b3InICYmIChpc1Byb3RvIHx8ICFoYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwga2V5KSkpKSB7XG4gICAgICByZXN1bHQucHVzaChrZXkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGtleXNJbjtcbiIsIi8qKlxuICogbG9kYXNoIDMuMC4wIChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kZXJuIG1vZHVsYXJpemUgZXhwb3J0cz1cIm5wbVwiIC1vIC4vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS43LjAgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDE1IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG52YXIgYmFzZUNvcHkgPSByZXF1aXJlKCdsb2Rhc2guX2Jhc2Vjb3B5JyksXG4gICAga2V5c0luID0gcmVxdWlyZSgnbG9kYXNoLmtleXNpbicpO1xuXG4vKipcbiAqIENvbnZlcnRzIGB2YWx1ZWAgdG8gYSBwbGFpbiBvYmplY3QgZmxhdHRlbmluZyBpbmhlcml0ZWQgZW51bWVyYWJsZVxuICogcHJvcGVydGllcyBvZiBgdmFsdWVgIHRvIG93biBwcm9wZXJ0aWVzIG9mIHRoZSBwbGFpbiBvYmplY3QuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjb252ZXJ0LlxuICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyB0aGUgY29udmVydGVkIHBsYWluIG9iamVjdC5cbiAqIEBleGFtcGxlXG4gKlxuICogZnVuY3Rpb24gRm9vKCkge1xuICogICB0aGlzLmIgPSAyO1xuICogfVxuICpcbiAqIEZvby5wcm90b3R5cGUuYyA9IDM7XG4gKlxuICogXy5hc3NpZ24oeyAnYSc6IDEgfSwgbmV3IEZvbyk7XG4gKiAvLyA9PiB7ICdhJzogMSwgJ2InOiAyIH1cbiAqXG4gKiBfLmFzc2lnbih7ICdhJzogMSB9LCBfLnRvUGxhaW5PYmplY3QobmV3IEZvbykpO1xuICogLy8gPT4geyAnYSc6IDEsICdiJzogMiwgJ2MnOiAzIH1cbiAqL1xuZnVuY3Rpb24gdG9QbGFpbk9iamVjdCh2YWx1ZSkge1xuICByZXR1cm4gYmFzZUNvcHkodmFsdWUsIGtleXNJbih2YWx1ZSkpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHRvUGxhaW5PYmplY3Q7XG4iLCIvKipcbiAqIGxvZGFzaCAzLjAuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cHM6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZGVybiBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTUgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuOC4zIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwczovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xuXG4vKipcbiAqIENvcGllcyBwcm9wZXJ0aWVzIG9mIGBzb3VyY2VgIHRvIGBvYmplY3RgLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gc291cmNlIFRoZSBvYmplY3QgdG8gY29weSBwcm9wZXJ0aWVzIGZyb20uXG4gKiBAcGFyYW0ge0FycmF5fSBwcm9wcyBUaGUgcHJvcGVydHkgbmFtZXMgdG8gY29weS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb2JqZWN0PXt9XSBUaGUgb2JqZWN0IHRvIGNvcHkgcHJvcGVydGllcyB0by5cbiAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgYG9iamVjdGAuXG4gKi9cbmZ1bmN0aW9uIGJhc2VDb3B5KHNvdXJjZSwgcHJvcHMsIG9iamVjdCkge1xuICBvYmplY3QgfHwgKG9iamVjdCA9IHt9KTtcblxuICB2YXIgaW5kZXggPSAtMSxcbiAgICAgIGxlbmd0aCA9IHByb3BzLmxlbmd0aDtcblxuICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgIHZhciBrZXkgPSBwcm9wc1tpbmRleF07XG4gICAgb2JqZWN0W2tleV0gPSBzb3VyY2Vba2V5XTtcbiAgfVxuICByZXR1cm4gb2JqZWN0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJhc2VDb3B5O1xuIiwiLyoqXG4gKiBsb2Rhc2ggMy43LjQgKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2Rlcm4gbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDE1IFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTUgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cHM6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciB0b1BhdGggPSByZXF1aXJlKCdsb2Rhc2guX3RvcGF0aCcpLFxuICAgIGlzQXJyYXkgPSByZXF1aXJlKCdsb2Rhc2guaXNhcnJheScpO1xuXG4vKiogVXNlZCB0byBtYXRjaCBwcm9wZXJ0eSBuYW1lcyB3aXRoaW4gcHJvcGVydHkgcGF0aHMuICovXG52YXIgcmVJc0RlZXBQcm9wID0gL1xcLnxcXFsoPzpbXltcXF1dKnwoW1wiJ10pKD86KD8hXFwxKVteXFxuXFxcXF18XFxcXC4pKj9cXDEpXFxdLyxcbiAgICByZUlzUGxhaW5Qcm9wID0gL15cXHcqJC87XG5cbi8qKiBVc2VkIHRvIGRldGVjdCB1bnNpZ25lZCBpbnRlZ2VyIHZhbHVlcy4gKi9cbnZhciByZUlzVWludCA9IC9eXFxkKyQvO1xuXG4vKipcbiAqIFVzZWQgYXMgdGhlIFttYXhpbXVtIGxlbmd0aF0oaHR0cHM6Ly9wZW9wbGUubW96aWxsYS5vcmcvfmpvcmVuZG9yZmYvZXM2LWRyYWZ0Lmh0bWwjc2VjLW51bWJlci5tYXhfc2FmZV9pbnRlZ2VyKVxuICogb2YgYW4gYXJyYXktbGlrZSB2YWx1ZS5cbiAqL1xudmFyIE1BWF9TQUZFX0lOVEVHRVIgPSA5MDA3MTk5MjU0NzQwOTkxO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgdmFsaWQgYXJyYXktbGlrZSBpbmRleC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aD1NQVhfU0FGRV9JTlRFR0VSXSBUaGUgdXBwZXIgYm91bmRzIG9mIGEgdmFsaWQgaW5kZXguXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIHZhbGlkIGluZGV4LCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzSW5kZXgodmFsdWUsIGxlbmd0aCkge1xuICB2YWx1ZSA9ICh0eXBlb2YgdmFsdWUgPT0gJ251bWJlcicgfHwgcmVJc1VpbnQudGVzdCh2YWx1ZSkpID8gK3ZhbHVlIDogLTE7XG4gIGxlbmd0aCA9IGxlbmd0aCA9PSBudWxsID8gTUFYX1NBRkVfSU5URUdFUiA6IGxlbmd0aDtcbiAgcmV0dXJuIHZhbHVlID4gLTEgJiYgdmFsdWUgJSAxID09IDAgJiYgdmFsdWUgPCBsZW5ndGg7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSBwcm9wZXJ0eSBuYW1lIGFuZCBub3QgYSBwcm9wZXJ0eSBwYXRoLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb2JqZWN0XSBUaGUgb2JqZWN0IHRvIHF1ZXJ5IGtleXMgb24uXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIHByb3BlcnR5IG5hbWUsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaXNLZXkodmFsdWUsIG9iamVjdCkge1xuICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgaWYgKCh0eXBlID09ICdzdHJpbmcnICYmIHJlSXNQbGFpblByb3AudGVzdCh2YWx1ZSkpIHx8IHR5cGUgPT0gJ251bWJlcicpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmFyIHJlc3VsdCA9ICFyZUlzRGVlcFByb3AudGVzdCh2YWx1ZSk7XG4gIHJldHVybiByZXN1bHQgfHwgKG9iamVjdCAhPSBudWxsICYmIHZhbHVlIGluIHRvT2JqZWN0KG9iamVjdCkpO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIGB2YWx1ZWAgdG8gYW4gb2JqZWN0IGlmIGl0J3Mgbm90IG9uZS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcHJvY2Vzcy5cbiAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgdGhlIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gdG9PYmplY3QodmFsdWUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHZhbHVlKSA/IHZhbHVlIDogT2JqZWN0KHZhbHVlKTtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyB0aGUgW2xhbmd1YWdlIHR5cGVdKGh0dHBzOi8vZXM1LmdpdGh1Yi5pby8jeDgpIG9mIGBPYmplY3RgLlxuICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzT2JqZWN0KHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdCgxKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gIC8vIEF2b2lkIGEgVjggSklUIGJ1ZyBpbiBDaHJvbWUgMTktMjAuXG4gIC8vIFNlZSBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MjI5MSBmb3IgbW9yZSBkZXRhaWxzLlxuICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgcmV0dXJuICEhdmFsdWUgJiYgKHR5cGUgPT0gJ29iamVjdCcgfHwgdHlwZSA9PSAnZnVuY3Rpb24nKTtcbn1cblxuLyoqXG4gKiBTZXRzIHRoZSBwcm9wZXJ0eSB2YWx1ZSBvZiBgcGF0aGAgb24gYG9iamVjdGAuIElmIGEgcG9ydGlvbiBvZiBgcGF0aGBcbiAqIGRvZXMgbm90IGV4aXN0IGl0IGlzIGNyZWF0ZWQuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBPYmplY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBhdWdtZW50LlxuICogQHBhcmFtIHtBcnJheXxzdHJpbmd9IHBhdGggVGhlIHBhdGggb2YgdGhlIHByb3BlcnR5IHRvIHNldC5cbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHNldC5cbiAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgYG9iamVjdGAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIHZhciBvYmplY3QgPSB7ICdhJzogW3sgJ2InOiB7ICdjJzogMyB9IH1dIH07XG4gKlxuICogXy5zZXQob2JqZWN0LCAnYVswXS5iLmMnLCA0KTtcbiAqIGNvbnNvbGUubG9nKG9iamVjdC5hWzBdLmIuYyk7XG4gKiAvLyA9PiA0XG4gKlxuICogXy5zZXQob2JqZWN0LCAneFswXS55LnonLCA1KTtcbiAqIGNvbnNvbGUubG9nKG9iamVjdC54WzBdLnkueik7XG4gKiAvLyA9PiA1XG4gKi9cbmZ1bmN0aW9uIHNldChvYmplY3QsIHBhdGgsIHZhbHVlKSB7XG4gIGlmIChvYmplY3QgPT0gbnVsbCkge1xuICAgIHJldHVybiBvYmplY3Q7XG4gIH1cbiAgdmFyIHBhdGhLZXkgPSAocGF0aCArICcnKTtcbiAgcGF0aCA9IChvYmplY3RbcGF0aEtleV0gIT0gbnVsbCB8fCBpc0tleShwYXRoLCBvYmplY3QpKSA/IFtwYXRoS2V5XSA6IHRvUGF0aChwYXRoKTtcblxuICB2YXIgaW5kZXggPSAtMSxcbiAgICAgIGxlbmd0aCA9IHBhdGgubGVuZ3RoLFxuICAgICAgbGFzdEluZGV4ID0gbGVuZ3RoIC0gMSxcbiAgICAgIG5lc3RlZCA9IG9iamVjdDtcblxuICB3aGlsZSAobmVzdGVkICE9IG51bGwgJiYgKytpbmRleCA8IGxlbmd0aCkge1xuICAgIHZhciBrZXkgPSBwYXRoW2luZGV4XTtcbiAgICBpZiAoaXNPYmplY3QobmVzdGVkKSkge1xuICAgICAgaWYgKGluZGV4ID09IGxhc3RJbmRleCkge1xuICAgICAgICBuZXN0ZWRba2V5XSA9IHZhbHVlO1xuICAgICAgfSBlbHNlIGlmIChuZXN0ZWRba2V5XSA9PSBudWxsKSB7XG4gICAgICAgIG5lc3RlZFtrZXldID0gaXNJbmRleChwYXRoW2luZGV4ICsgMV0pID8gW10gOiB7fTtcbiAgICAgIH1cbiAgICB9XG4gICAgbmVzdGVkID0gbmVzdGVkW2tleV07XG4gIH1cbiAgcmV0dXJuIG9iamVjdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZXQ7XG4iXX0=
