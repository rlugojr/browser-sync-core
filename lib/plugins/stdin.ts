import {BrowserSync} from "../browser-sync";
import Rx = require('rx');
import ReadableStream = NodeJS.ReadableStream;
const {just, fromEvent} = Rx.Observable;

export interface StdinEvent {
    fnName: string
    fn: Function
    args: string[]
}

interface IReadableStream extends ReadableStream {
    off: any
}

export function init (bs: BrowserSync) {
    /**
     * DEBUG from stdin
     */
    const stdin$ = fromEvent(<IReadableStream>process.stdin, 'data', (x) => x.toString().replace(/\n$/, ''))
        .flatMap<StdinEvent>((x: string) => {
            const split = x.trim().split(' ').filter(Boolean);
            return just({
                fnName: split[0],
                fn: bs[split[0]],
                args: split.slice(1)
            });
        })
        .subscribe(stdinEvent => {
            if (typeof stdinEvent.fn === 'function') {
                console.log('Calling  :', stdinEvent.fnName);
                console.log('with args:', stdinEvent.args);
                stdinEvent.fn.apply(null, stdinEvent.args);
            } else {
                console.log(stdinEvent, 'is not a valid function to call');
            }
        });

    return () => {
        stdin$.dispose();
    }
}
