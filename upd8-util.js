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
    array = array.filter(Boolean);

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

module.exports.progressPromiseAll = function (msgOrMsgFn, array) {
    if (!array.length) {
        return Promise.resolve([]);
    }

    const msgFn = (typeof msgOrMsgFn === 'function'
        ? msgOrMsgFn
        : () => msgOrMsgFn);

    let done = 0, total = array.length;
    process.stdout.write(`\r${msgFn()} [0/${total}]`);
    const start = Date.now();
    return Promise.all(array.map(promise => promise.then(val => {
        done++;
        // const pc = `${done}/${total}`;
        const pc = (Math.round(done / total * 1000) / 10 + '%').padEnd('99.9%'.length, ' ');
        if (done === total) {
            const time = Date.now() - start;
            process.stdout.write(`\r\x1b[2m${msgFn()} [${pc}] \x1b[0;32mDone! \x1b[0;2m(${time} ms) \x1b[0m\n`)
        } else {
            process.stdout.write(`\r${msgFn()} [${pc}] `);
        }
        return val;
    })));
};

module.exports.queue = function (array, max = 50) {
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
};

module.exports.delay = ms => new Promise(res => setTimeout(res, ms));

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

const decorateTime = function (functionToBeWrapped) {
    const fn = function(...args) {
        const start = Date.now();
        const ret = functionToBeWrapped(...args);
        const end = Date.now();
        fn.timeSpent += end - start;
        fn.timesCalled++;
        return ret;
    };

    fn.wrappedName = functionToBeWrapped.name;
    fn.timeSpent = 0;
    fn.timesCalled = 0;
    fn.displayTime = function() {
        const averageTime = fn.timeSpent / fn.timesCalled;
        console.log(`\x1b[1m${fn.wrappedName}(...):\x1b[0m ${fn.timeSpent} ms / ${fn.timesCalled} calls \x1b[2m(avg: ${averageTime} ms)\x1b[0m`);
    };

    decorateTime.decoratedFunctions.push(fn);

    return fn;
};

decorateTime.decoratedFunctions = [];
decorateTime.displayTime = function() {
    if (decorateTime.decoratedFunctions.length) {
        console.log(`\x1b[1mdecorateTime results: ` + '-'.repeat(40) + '\x1b[0m');
        for (const fn of decorateTime.decoratedFunctions) {
            fn.displayTime();
        }
    }
};

module.exports.decorateTime = decorateTime;

// Stolen as #@CK from mtui!
const parseOptions = async function(options, optionDescriptorMap) {
    // This function is sorely lacking in comments, but the basic usage is
    // as such:
    //
    // options is the array of options you want to process;
    // optionDescriptorMap is a mapping of option names to objects that describe
    // the expected value for their corresponding options.
    // Returned is a mapping of any specified option names to their values, or
    // a process.exit(1) and error message if there were any issues.
    //
    // Here are examples of optionDescriptorMap to cover all the things you can
    // do with it:
    //
    // optionDescriptorMap: {
    //   'telnet-server': {type: 'flag'},
    //   't': {alias: 'telnet-server'}
    // }
    //
    // options: ['t'] -> result: {'telnet-server': true}
    //
    // optionDescriptorMap: {
    //   'directory': {
    //     type: 'value',
    //     validate(name) {
    //       // const whitelistedDirectories = ['apple', 'banana']
    //       if (whitelistedDirectories.includes(name)) {
    //         return true
    //       } else {
    //         return 'a whitelisted directory'
    //       }
    //     }
    //   },
    //   'files': {type: 'series'}
    // }
    //
    // ['--directory', 'apple'] -> {'directory': 'apple'}
    // ['--directory', 'artichoke'] -> (error)
    // ['--files', 'a', 'b', 'c', ';'] -> {'files': ['a', 'b', 'c']}
    //
    // TODO: Be able to validate the values in a series option.

    const handleDashless = optionDescriptorMap[parseOptions.handleDashless];
    const handleUnknown = optionDescriptorMap[parseOptions.handleUnknown];
    const result = Object.create(null);
    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        if (option.startsWith('--')) {
            // --x can be a flag or expect a value or series of values
            let name = option.slice(2).split('=')[0]; // '--x'.split('=') = ['--x']
            let descriptor = optionDescriptorMap[name];
            if (!descriptor) {
                if (handleUnknown) {
                    handleUnknown(option);
                } else {
                    console.error(`Unknown option name: ${name}`);
                    process.exit(1);
                }
                continue;
            }
            if (descriptor.alias) {
                name = descriptor.alias;
                descriptor = optionDescriptorMap[name];
            }
            if (descriptor.type === 'flag') {
                result[name] = true;
            } else if (descriptor.type === 'value') {
                let value = option.slice(2).split('=')[1];
                if (!value) {
                    value = options[++i];
                    if (!value || value.startsWith('-')) {
                        value = null;
                    }
                }
                if (!value) {
                    console.error(`Expected a value for --${name}`);
                    process.exit(1);
                }
                result[name] = value;
            } else if (descriptor.type === 'series') {
                if (!options.slice(i).includes(';')) {
                    console.error(`Expected a series of values concluding with ; (\\;) for --${name}`);
                    process.exit(1);
                }
                const endIndex = i + options.slice(i).indexOf(';');
                result[name] = options.slice(i + 1, endIndex);
                i = endIndex;
            }
            if (descriptor.validate) {
                const validation = await descriptor.validate(result[name]);
                if (validation !== true) {
                    console.error(`Expected ${validation} for --${name}`);
                    process.exit(1);
                }
            }
        } else if (option.startsWith('-')) {
            // mtui doesn't use any -x=y or -x y format optionuments
            // -x will always just be a flag
            let name = option.slice(1);
            let descriptor = optionDescriptorMap[name];
            if (!descriptor) {
                if (handleUnknown) {
                    handleUnknown(option);
                } else {
                    console.error(`Unknown option name: ${name}`);
                    process.exit(1);
                }
                continue;
            }
            if (descriptor.alias) {
                name = descriptor.alias;
                descriptor = optionDescriptorMap[name];
            }
            if (descriptor.type === 'flag') {
                result[name] = true;
            } else {
                console.error(`Use --${name} (value) to specify ${name}`);
                process.exit(1);
            }
        } else if (handleDashless) {
            handleDashless(option);
        }
    }
    return result;
}

parseOptions.handleDashless = Symbol();
parseOptions.handleUnknown = Symbol();

module.exports.parseOptions = parseOptions;

// Cheap FP for a cheap dyke!
// I have no idea if this is what curry actually means.
module.exports.curry = f => x => (...args) => f(x, ...args);

module.exports.mapInPlace = (array, fn) => array.splice(0, array.length, ...array.map(fn));

module.exports.filterEmptyLines = string => string.split('\n').filter(line => line.trim()).join('\n');

module.exports.unique = arr => Array.from(new Set(arr));

const logColor = color => (literals, ...values) => {
    const w = s => process.stdout.write(s);
    w(`\x1b[${color}m`);
    for (let i = 0; i < literals.length; i++) {
        w(literals[i]);
        if (values[i] !== undefined) {
            w(`\x1b[1m`);
            w(String(values[i]));
            w(`\x1b[0;${color}m`);
        }
    }
    w(`\x1b[0m\n`);
};

module.exports.logInfo = logColor(2);
module.exports.logWarn = logColor(33);
module.exports.logError = logColor(31);

module.exports.sortByName = (a, b) => {
    let an = a.name.toLowerCase();
    let bn = b.name.toLowerCase();
    if (an.startsWith('the ')) an = an.slice(4);
    if (bn.startsWith('the ')) bn = bn.slice(4);
    return an < bn ? -1 : an > bn ? 1 : 0;
};

module.exports.chunkByConditions = function(array, conditions) {
    if (array.length === 0) {
        return [];
    } else if (conditions.length === 0) {
        return [array];
    }

    const out = [];
    let cur = [array[0]];
    for (let i = 1; i < array.length; i++) {
        const item = array[i];
        const prev = array[i - 1];
        let chunk = false;
        for (const condition of conditions) {
            if (condition(item, prev)) {
                chunk = true;
                break;
            }
        }
        if (chunk) {
            out.push(cur);
            cur = [item];
        } else {
            cur.push(item);
        }
    }
    out.push(cur);
    return out;
};

module.exports.chunkByProperties = function(array, properties) {
    return module.exports.chunkByConditions(array, properties.map(p => (a, b) => {
        if (a[p] instanceof Date && b[p] instanceof Date)
            return +a[p] !== +b[p];

        if (a[p] !== b[p]) return true;

        // Not sure if this line is still necessary with the specific check for
        // d8tes a8ove, 8ut, uh, keeping it anyway, just in case....?
        if (a[p] != b[p]) return true;

        return false;
    }))
        .map(chunk => ({
            ...Object.fromEntries(properties.map(p => [p, chunk[0][p]])),
            chunk
        }));
};

// Very cool function origin8ting in... http-music pro8a8ly!
// Sorry if we happen to 8e violating past-us's copyright, lmao.
module.exports.promisifyProcess = function(proc, showLogging = true) {
    // Takes a process (from the child_process module) and returns a promise
    // that resolves when the process exits (or rejects, if the exit code is
    // non-zero).
    //
    // Ayy look, no alpha8etical second letter! Couldn't tell this was written
    // like three years ago 8efore I was me. 8888)

    return new Promise((resolve, reject) => {
        if (showLogging) {
            proc.stdout.pipe(process.stdout);
            proc.stderr.pipe(process.stderr);
        }

        proc.on('exit', code => {
            if (code === 0) {
                resolve();
            } else {
                reject(code);
            }
        })
    })
};

// Stolen from jq! Which pro8a8ly stole the concept from other places. Nice.
module.exports.withEntries = (obj, fn) => Object.fromEntries(fn(Object.entries(obj)));

// Nothin' more to it than what it says. Runs a function in-place. Provides an
// altern8tive syntax to the usual IIFEs (e.g. (() => {})()) when you want to
// open a scope and run some statements while inside an existing expression.
module.exports.call = fn => fn();
