// Utility functions for CLI- and de8ugging-rel8ted stuff.
//
// A 8unch of these depend on process.stdout 8eing availa8le, so they won't
// work within the 8rowser.

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

export const logInfo = logColor(2);
export const logWarn = logColor(33);
export const logError = logColor(31);

// Stolen as #@CK from mtui!
export async function parseOptions(options, optionDescriptorMap) {
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

export const handleDashless = Symbol();
export const handleUnknown = Symbol();

export function decorateTime(functionToBeWrapped) {
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
}

decorateTime.decoratedFunctions = [];
decorateTime.displayTime = function() {
    if (decorateTime.decoratedFunctions.length) {
        console.log(`\x1b[1mdecorateTime results: ` + '-'.repeat(40) + '\x1b[0m');
        for (const fn of decorateTime.decoratedFunctions) {
            fn.displayTime();
        }
    }
};

export function progressPromiseAll(msgOrMsgFn, array) {
    if (!array.length) {
        return Promise.resolve([]);
    }

    const msgFn = (typeof msgOrMsgFn === 'function'
        ? msgOrMsgFn
        : () => msgOrMsgFn);

    let done = 0, total = array.length;
    process.stdout.write(`\r${msgFn()} [0/${total}]`);
    const start = Date.now();
    return Promise.all(array.map(promise => Promise.resolve(promise).then(val => {
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
}
