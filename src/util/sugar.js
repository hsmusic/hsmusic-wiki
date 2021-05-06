// Syntactic sugar! (Mostly.)
// Generic functions - these are useful just a8out everywhere.
//
// Friendly(!) disclaimer: these utility functions haven't 8een tested all that
// much. Do not assume it will do exactly what you want it to do in all cases.
// It will likely only do exactly what I want it to, and only in the cases I
// decided were relevant enough to 8other handling.

// Apparently JavaScript doesn't come with a function to split an array into
// chunks! Weird. Anyway, this is an awesome place to use a generator, even
// though we don't really make use of the 8enefits of generators any time we
// actually use this. 8ut it's still awesome, 8ecause I say so.
export function* splitArray(array, fn) {
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

export const mapInPlace = (array, fn) => array.splice(0, array.length, ...array.map(fn));

export const filterEmptyLines = string => string.split('\n').filter(line => line.trim()).join('\n');

export const unique = arr => Array.from(new Set(arr));

// Stolen from jq! Which pro8a8ly stole the concept from other places. Nice.
export const withEntries = (obj, fn) => Object.fromEntries(fn(Object.entries(obj)));

// Nothin' more to it than what it says. Runs a function in-place. Provides an
// altern8tive syntax to the usual IIFEs (e.g. (() => {})()) when you want to
// open a scope and run some statements while inside an existing expression.
export const call = fn => fn();

export function queue(array, max = 50) {
    if (max === 0) {
        return array.map(fn => fn());
    }

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
}

export function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}
