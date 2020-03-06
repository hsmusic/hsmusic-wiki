// This is used by upd8.js! It's part of the 8ackend. Read the notes there if
// you're curious.
//
// Friendly(!) disclaimer: these utility functions haven't 8een tested all that
// much. Do not assume it will do exactly what you want it to do in all cases.
// It will likely only do exactly what I want it to, and only in the cases I
// decided were relevant enough to 8other handling.

'use strict';

// Apparently JavaScript doesn't come with a function to split an array into
// chunks! Weird. Anyway, this is an awesome place to use a generator, even
// though we don't really make use of the 8enefits of generators any time we
// actually use this. 8ut it's still awesome, 8ecause I say so.
module.exports.splitArray = function*(array, fn) {
    let lastIndex = 0;
    while (lastIndex < array.length) {
        let nextIndex = array.findIndex((item, index) => index >= lastIndex && fn(item));
        if (nextIndex === -1) {
            nextIndex = array.length;
        }
        yield array.slice(lastIndex, nextIndex);
        // Plus one because we don't want to include the dividing line in the
        // next array we yield.
        lastIndex = nextIndex + 1;
    }
};

// This function's name is a joke. Jokes! Hahahahahahahaha. Funny.
module.exports.joinNoOxford = function(array, plural = 'and') {
    if (array.length === 0) {
        // ????????
        return '';
    }

    if (array.length === 1) {
        return array[0];
    }

    if (array.length === 2) {
        return `${array[0]} ${plural} ${array[1]}`;
    }

    return `${array.slice(0, -1).join(', ')} ${plural} ${array[array.length - 1]}`;
};

module.exports.progressPromiseAll = function (msg, array) {
    let done = 0, total = array.length;
    process.stdout.write(`\r${msg} [0/${total}]`);
    const start = Date.now();
    return Promise.all(array.map(promise => promise.then(val => {
        done++;
        // const pc = `${done}/${total}`;
        const pc = (Math.round(done / total * 1000) / 10 + '%').padEnd('99.9%'.length, ' ');
        if (done === total) {
            const time = Date.now() - start;
            process.stdout.write(`\r\x1b[2m${msg} [${pc}] \x1b[0;32mDone! \x1b[0;2m(${time} ms) \x1b[0m\n`)
        } else {
            process.stdout.write(`\r${msg} [${pc}] `);
        }
        return val;
    })));
};

module.exports.queue = function (array, max = 10) {
    const begin = [];
    let current = 0;
    const ret = array.map(fn => new Promise((resolve, reject) => {
        begin.push(() => {
            current++;
            Promise.resolve(fn()).then(value => {
                current--;
                if (current < max && begin.length) {
                    begin.shift()();
                }
                resolve(value);
            }, reject);
        });
    }));

    for (let i = 0; i < max && begin.length; i++) {
        begin.shift()();
    }

    return ret;
};

module.exports.th = function (n) {
    if (n % 10 === 1 && n !== 11) {
        return n + 'st';
    } else if (n % 10 === 2 && n !== 12) {
        return n + 'nd';
    } else if (n % 10 === 3 && n !== 13) {
        return n + 'rd';
    } else {
        return n + 'th';
    }
};

// My function names just keep getting 8etter.
module.exports.s = function (n, word) {
    return `${n} ${word}` + (n === 1 ? '' : 's');
};

// Hey, did you know I apparently put a space 8efore the parameters in function
// names? 8ut only in function expressions, not declar8tions? I mean, I guess
// you did. You're pro8a8ly more familiar with my code than I am 8y this
// point. I haven't messed with any of this code in ages. Yay!!!!!!!!
//
// This function only does anything on o8jects you're going to 8e reusing.
// Argua8ly I could use a WeakMap here, 8ut since the o8ject needs to 8e
// reused to 8e useful anyway, I just store the result with a symbol.
// Sorry if it's 8een frozen I guess??
module.exports.cacheOneArg = function (fn) {
    const symbol = Symbol('Cache');
    return arg => {
        if (!arg[symbol]) {
            arg[symbol] = fn(arg);
        }
        return arg[symbol];
    };
};
