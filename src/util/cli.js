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

export const colors = {
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

// Takes precisely the same sort of structure as `parseOptions` above,
// and displays associated help messages. Radical!
//
// 'indentWrap' should be the function from '#sugar', with its wrap option
//   already bound.
//
// 'sort' should take care of sorting a list of {name, descriptor} entries.
export function showHelpForOptions({
  heading,
  options,
  indentWrap,
  sort = entries => entries,
}) {
  if (heading) {
    console.log(colors.bright(heading));
  }

  const sortedOptions =
    sort(
      Object.entries(options)
        .map(([name, descriptor]) => ({name, descriptor})));

  if (!sortedOptions.length) {
    console.log(`(No options available)`)
  }

  let justInsertedPaddingLine = false;

  for (const {name, descriptor} of sortedOptions) {
    if (descriptor.alias) {
      continue;
    }

    const aliases =
      Object.entries(options)
        .filter(([_name, {alias}]) => alias === name)
        .map(([name]) => name);

    let wrappedHelp, wrappedHelpLines = 0;
    if (descriptor.help) {
      wrappedHelp = indentWrap(descriptor.help, {spaces: 4});
      wrappedHelpLines = wrappedHelp.split('\n').length;
    }

    if (wrappedHelpLines > 0 && !justInsertedPaddingLine) {
      console.log('');
    }

    console.log(colors.bright(` --` + name) +
      (aliases.length
        ? ` (or: ${aliases.map(alias => colors.bright(`--` + alias)).join(', ')})`
        : '') +
      (descriptor.help
        ? ''
        : colors.dim('  (no help provided)')));

    if (wrappedHelp) {
      console.log(wrappedHelp);
    }

    if (wrappedHelpLines > 1) {
      console.log('');
      justInsertedPaddingLine = true;
    } else {
      justInsertedPaddingLine = false;
    }
  }

  if (!justInsertedPaddingLine) {
    console.log(``);
  }
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
      const align1 = 48;
      const align2 = 22;

      const averageTime = (meta.timeSpent / meta.timesCalled).toExponential(1);
      const idPart = typeof id === 'symbol' ? id.description : id;
      const timePart = `${meta.timeSpent} ms / ${meta.timesCalled} calls`;
      const avgPart = `(avg: ${averageTime} ms)`;

      const alignPart1 =
        (idPart.length >= align1
          ? ' '
          : ' ' + '.'.repeat(Math.max(0, align1 - 2 - idPart.length)) + ' ');

      const alignPart2 =
        (timePart.length >= align2
          ? ' '
          : ' '.repeat(Math.max(0, align2 - timePart.length)));

      console.log(
        colors.bright(idPart) +
        alignPart1 +
        timePart +
        alignPart2 +
        colors.dim(avgPart));
    },
  };

  decorateTime.idMetaMap[id] = meta;

  const fn = function (...args) {
    const start = Date.now();
    const ret = functionToBeWrapped.apply(this, args);
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

  if (!keys.length) {
    return;
  }

  console.log(`\x1b[1mdecorateTime results: ` + '-'.repeat(40) + '\x1b[0m');

  const metas =
    keys
      .map(key => map[key])
      .filter(meta => meta.timeSpent >= 1)  // Milliseconds!
      .sort((a, b) => a.timeSpent - b.timeSpent);

  for (const meta of metas) {
    meta.displayTime();
  }
};

export function progressPromiseAll(msgOrMsgFn, array) {
  if (!array.length) {
    return Promise.resolve([]);
  }

  const msgFn =
    typeof msgOrMsgFn === 'function' ? msgOrMsgFn : () => msgOrMsgFn;

  let done = 0,
    total = array.length;
  process.stdout.write(`\r${msgFn()} [0/${total}]`);
  const start = Date.now();
  return Promise.all(
    array.map((promise) =>
      Promise.resolve(promise).then((val) => {
        done++;
        // const pc = `${done}/${total}`;
        const pc = (Math.round((done / total) * 1000) / 10 + '%').padEnd(
          '99.9%'.length,
          ' '
        );
        if (done === total) {
          const time = Date.now() - start;
          process.stdout.write(
            `\r\x1b[2m${msgFn()} [${pc}] \x1b[0;32mDone! \x1b[0;2m(${time} ms) \x1b[0m\n`
          );
        } else {
          process.stdout.write(`\r${msgFn()} [${pc}] `);
        }
        return val;
      })
    )
  );
}

export function progressCallAll(msgOrMsgFn, array) {
  if (!array.length) {
    return [];
  }

  const msgFn =
    typeof msgOrMsgFn === 'function' ? msgOrMsgFn : () => msgOrMsgFn;

  const updateInterval = 1000 / 60;

  let done = 0,
    total = array.length;
  process.stdout.write(`\r${msgFn()} [0/${total}]`);
  const start = Date.now();
  const vals = [];
  let lastTime = 0;

  for (const fn of array) {
    const val = fn();
    done++;

    if (done === total) {
      const pc = '100%'.padEnd('99.9%'.length, ' ');
      const time = Date.now() - start;
      process.stdout.write(
        `\r\x1b[2m${msgFn()} [${pc}] \x1b[0;32mDone! \x1b[0;2m(${time} ms) \x1b[0m\n`
      );
    } else if (Date.now() - lastTime >= updateInterval) {
      const pc = (Math.round((done / total) * 1000) / 10 + '%').padEnd('99.9%'.length, ' ');
      process.stdout.write(`\r${msgFn()} [${pc}] `);
      lastTime = Date.now();
    }
    vals.push(val);
  }

  return vals;
}

export function fileIssue({
  topMessage = `This shouldn't happen.`,
} = {}) {
  if (topMessage) {
    console.error(colors.red(`${topMessage} Please let the HSMusic developers know:`));
  }
  console.error(colors.red(`- https://hsmusic.wiki/feedback/`));
  console.error(colors.red(`- https://github.com/hsmusic/hsmusic-wiki/issues/`));
}

export async function logicalCWD() {
  if (process.env.PWD) {
    return process.env.PWD;
  }

  const {exec} = await import('node:child_process');
  const {stat} = await import('node:fs/promises');

  try {
    await stat('/bin/sh');
  } catch (error) {
    // Not logical, so sad.
    return process.cwd();
  }

  const proc = exec('/bin/pwd -L');

  let output = '';
  proc.stdout.on('data', buf => { output += buf; });

  await new Promise(resolve => proc.on('exit', resolve));

  return output.trim();
}

export async function logicalPathTo(target) {
  const {relative} = await import('node:path');
  const cwd = await logicalCWD();
  return relative(cwd, target);
}
