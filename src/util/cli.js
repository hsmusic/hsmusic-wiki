// Utility functions for CLI- and de8ugging-rel8ted stuff.
//
// A 8unch of these depend on process.stdout 8eing availa8le, so they won't
// work within the 8rowser.

const {process} = globalThis;

export const ENABLE_COLOR =
  process &&
  ((process.env.CLICOLOR_FORCE && process.env.CLICOLOR_FORCE === '1') ??
    (process.env.CLICOLOR &&
      process.env.CLICOLOR === '1' &&
      process.stdout.hasColors &&
      process.stdout.hasColors()) ??
    (process.stdout.hasColors ? process.stdout.hasColors() : true));

const C = (n) =>
  ENABLE_COLOR ? (text) => `\x1b[${n}m${text}\x1b[0m` : (text) => text;

export const color = {
  bright: C('1'),
  dim: C('2'),
  normal: C('22'),
  black: C('30'),
  red: C('31'),
  green: C('32'),
  yellow: C('33'),
  blue: C('34'),
  magenta: C('35'),
  cyan: C('36'),
  white: C('37'),
};

const logColor =
  (color) =>
  (literals, ...values) => {
    const w = (s) => process.stdout.write(s);
    const wc = (text) => {
      if (ENABLE_COLOR) w(text);
    };

    wc(`\x1b[${color}m`);
    for (let i = 0; i < literals.length; i++) {
      w(literals[i]);
      if (values[i] !== undefined) {
        wc(`\x1b[1m`);
        w(String(values[i]));
        wc(`\x1b[0;${color}m`);
      }
    }
    wc(`\x1b[0m`);
    w('\n');
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
  //
  // Returned is...
  // - a mapping of any specified option names to their values
  // - a process.exit(1) and error message if there were any issues
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

      switch (descriptor.type) {
        case 'flag': {
          result[name] = true;
          break;
        }

        case 'value': {
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
          break;
        }

        case 'series': {
          if (!options.slice(i).includes(';')) {
            console.error(`Expected a series of values concluding with ; (\\;) for --${name}`);
            process.exit(1);
          }

          const endIndex = i + options.slice(i).indexOf(';');
          result[name] = options.slice(i + 1, endIndex);
          i = endIndex;
          break;
        }
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

export function decorateTime(arg1, arg2) {
  const [id, functionToBeWrapped] =
    typeof arg1 === 'string' || typeof arg1 === 'symbol'
      ? [arg1, arg2]
      : [Symbol(arg1.name), arg1];

  const meta = decorateTime.idMetaMap[id] ?? {
    wrappedName: functionToBeWrapped.name,
    timeSpent: 0,
    timesCalled: 0,
    displayTime() {
      const averageTime = meta.timeSpent / meta.timesCalled;
      console.log(
        `\x1b[1m${typeof id === 'symbol' ? id.description : id}(...):\x1b[0m ${
          meta.timeSpent
        } ms / ${meta.timesCalled} calls \x1b[2m(avg: ${averageTime} ms)\x1b[0m`
      );
    },
  };

  decorateTime.idMetaMap[id] = meta;

  const fn = function (...args) {
    const start = Date.now();
    const ret = functionToBeWrapped(...args);
    const end = Date.now();
    meta.timeSpent += end - start;
    meta.timesCalled++;
    return ret;
  };

  fn.displayTime = meta.displayTime;

  return fn;
}

decorateTime.idMetaMap = Object.create(null);

decorateTime.displayTime = function () {
  const map = decorateTime.idMetaMap;

  const keys = [
    ...Object.getOwnPropertySymbols(map),
    ...Object.getOwnPropertyNames(map),
  ];

  if (keys.length) {
    console.log(`\x1b[1mdecorateTime results: ` + '-'.repeat(40) + '\x1b[0m');
    for (const key of keys) {
      map[key].displayTime();
    }
  }
};

export function progressPromiseAll(msgOrMsgFn, array, {
  updateInterval = 1000 / 4,
} = {}) {
  if (!array.length) {
    return Promise.resolve([]);
  }

  const msgFn =
    typeof msgOrMsgFn === 'function' ? msgOrMsgFn : () => msgOrMsgFn;

  const start = Date.now();
  const total = array.length;
  let done = 0;
  let lastStatus = ' 0.0%';
  let lastTime = Date.now();

  // process.stdout.write(`\r${msgFn()} [0/${total}]`);
  process.stdout.write(`\r${msgFn()} [${lastStatus}]`);

  return Promise.all(array.map((promise) => Promise.resolve(promise).then((val) => {
    done++;

    // const pc = `${done}/${total}`;
    const pc = (Math.round((done / total) * 1000) / 10 + '%')
      .padEnd('99.9%'.length, ' ');

    if (done === total) {
      const time = Date.now() - start;
      process.stdout.write(`\r${color.dim(`${msgFn()} [${pc}]`)} ${color.green(`Done!`)} ${color.dim(`(${time} ms)`)}\n`);
    } else if (pc !== lastStatus && Date.now() - lastTime > updateInterval) {
      process.stdout.write(`\r${msgFn()} [${pc}] `);
      lastStatus = pc;
      lastTime = Date.now();
    }

    return val;
  })));
}

export function progressCallAll(msgOrMsgFn, array, {
  updateInterval = 1000 / 4,
} = {}) {
  if (!array.length) {
    return [];
  }

  const msgFn =
    typeof msgOrMsgFn === 'function' ? msgOrMsgFn : () => msgOrMsgFn;

  const start = Date.now();
  const total = array.length;
  let done = 0;
  let lastStatus = ' 0.0%';
  let lastTime = Date.now();

  process.stdout.write(`\r${msgFn()} [${lastStatus}]`);

  return array.map(fn => {
    const val = fn();
    done++;

    const pc = (Math.round((done / total) * 1000) / 10 + '%')
      .padEnd('99.9%'.length, ' ');

    if (done === total) {
      const pc = ' 100%';
      const time = Date.now() - start;
      process.stdout.write(`\r${color.dim(`${msgFn()} [${pc}]`)} ${color.green(`Done!`)} ${color.dim(`(${time} ms)`)}\n`);
    } else if (pc !== lastStatus &&  Date.now() - lastTime >= updateInterval) {
      process.stdout.write(`\r${msgFn()} [${pc}] `);
      lastTime = Date.now();
    }

    return val;
  }

  return vals;
}

export function fileIssue({
  topMessage = `This shouldn't happen.`,
} = {}) {
  console.error(color.red(`${topMessage} Please let the HSMusic developers know:`));
  console.error(color.red(`- https://hsmusic.wiki/feedback/`));
  console.error(color.red(`- https://github.com/hsmusic/hsmusic-wiki/issues/`));
}
