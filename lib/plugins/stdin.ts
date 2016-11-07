import {BrowserSync} from "../browser-sync";
import Rx = require('rx');
import ReadableStream = NodeJS.ReadableStream;
const {just, fromEvent} = Rx.Observable;
const _ = require('../../lodash.custom');

export interface StdinEvent {
    fnName: string
    fn: Function
    args: string[]
}

interface IReadableStream extends ReadableStream {
    off: any
}

module.exports["plugin:name"] = "Browsersync STDIN support";

export function init (bs: BrowserSync) {
    /**
     * DEBUG from stdin
     */
    const stdin$ = fromEvent(<IReadableStream>process.stdin, 'data', (x) => x.toString().replace(/\n$/, ''))
        .flatMap<StdinEvent>((x: string) => {
            const split = x.trim().split(' ').filter(Boolean);
            return just({
                fnName: split[0],
                fn: _.get(bs, split[0]),
                args: split.slice(1)
            });
        })
        .subscribe(stdinEvent => {
            if (typeof stdinEvent.fn === 'function') {
                console.log('stdin: calling   :', stdinEvent.fnName);
                console.log('stdin: with args :', stdinEvent.args);
                stdinEvent.fn.apply(null, stdinEvent.args);
            } else {
                console.log(stdinEvent.fnName, 'is not a valid function to call');
            }
        });

    return () => {
        stdin$.dispose();
    }
}

