// Syntactic sugar! (Mostly.)
// Generic functions - these are useful just a8out everywhere.
//
// Friendly(!) disclaimer: these utility functions haven't 8een tested all that
// much. Do not assume it will do exactly what you want it to do in all cases.
// It will likely only do exactly what I want it to, and only in the cases I
// decided were relevant enough to 8other handling.

import {colors} from './cli.js';

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
}

// Null-accepting function to check if an array or set is empty. Accepts null
// (which is treated as empty) as a shorthand for "hey, check if this property
// is an array with/without stuff in it" for objects where properties that are
// PRESENT but don't currently have a VALUE are null (rather than undefined).
export function empty(value) {
  if (value === null) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (value instanceof Set) {
    return value.size === 0;
  }

  throw new Error(`Expected array, set, or null`);
}

// Repeats all the items of an array a number of times.
export function repeat(times, array) {
  if (typeof array === 'string') return repeat(times, [array]);
  if (empty(array)) return [];
  if (times === 0) return [];
  if (times === 1) return array.slice();

  const out = [];
  for (let n = 1; n <= times; n++) {
    out.push(...array);
  }
  return out;
}

// Sums the values in an array, optionally taking a function which maps each
// item to a number (handy for accessing a certain property on an array of like
// objects). This also coalesces null values to zero, so if the mapping function
// returns null (or values in the array are nullish), they'll just be skipped in
// the sum.
export function accumulateSum(array, fn = x => x) {
  return array.reduce(
    (accumulator, value, index, array) =>
      accumulator +
        fn(value, index, array) ?? 0,
    0);
}

// Stitches together the items of separate arrays into one array of objects
// whose keys are the corresponding items from each array at that index.
// This is mostly useful for iterating over multiple arrays at once!
export function stitchArrays(keyToArray) {
  const errors = [];

  for (const [key, value] of Object.entries(keyToArray)) {
    if (value === null) continue;
    if (Array.isArray(value)) continue;
    errors.push(new TypeError(`(${key}) Expected array or null, got ${typeAppearance(value)}`));
  }

  if (!empty(errors)) {
    throw new AggregateError(errors, `Expected arrays or null`);
  }

  const keys = Object.keys(keyToArray);
  const arrays = Object.values(keyToArray).filter(val => Array.isArray(val));
  const length = Math.max(...arrays.map(({length}) => length));
  const results = [];

  for (let i = 0; i < length; i++) {
    const object = {};
    for (const key of keys) {
      object[key] =
        (Array.isArray(keyToArray[key])
          ? keyToArray[key][i]
          : null);
    }
    results.push(object);
  }

  return results;
}

// Turns this:
//
//   [
//     [123, 'orange', null],
//     [456, 'apple', true],
//     [789, 'banana', false],
//     [1000, 'pear', undefined],
//   ]
//
// Into this:
//
//   [
//     [123, 456, 789, 1000],
//     ['orange', 'apple', 'banana', 'pear'],
//     [null, true, false, undefined],
//   ]
//
// And back again, if you call it again on its results.
export function transposeArrays(arrays) {
  if (empty(arrays)) {
    return [];
  }

  const length = arrays[0].length;
  const results = new Array(length).fill(null).map(() => []);

  for (const array of arrays) {
    for (let i = 0; i < length; i++) {
      results[i].push(array[i]);
    }
  }

  return results;
}

export const mapInPlace = (array, fn) =>
  array.splice(0, array.length, ...array.map(fn));

export const unique = (arr) => Array.from(new Set(arr));

export const compareArrays = (arr1, arr2, {checkOrder = true} = {}) =>
  arr1.length === arr2.length &&
  (checkOrder
    ? arr1.every((x, i) => arr2[i] === x)
    : arr1.every((x) => arr2.includes(x)));

// Stolen from jq! Which pro8a8ly stole the concept from other places. Nice.
export const withEntries = (obj, fn) =>
  Object.fromEntries(fn(Object.entries(obj)));

export function setIntersection(set1, set2) {
  const intersection = new Set();
  for (const item of set1) {
    if (set2.has(item)) {
      intersection.add(item);
    }
  }
  return intersection;
}

export function filterProperties(object, properties, {
  preserveOriginalOrder = false,
} = {}) {
  if (typeof object !== 'object' || object === null) {
    throw new TypeError(`Expected object to be an object, got ${typeAppearance(object)}`);
  }

  if (!Array.isArray(properties)) {
    throw new TypeError(`Expected properties to be an array, got ${typeAppearance(properties)}`);
  }

  const filteredObject = {};

  if (preserveOriginalOrder) {
    for (const property of Object.keys(object)) {
      if (properties.includes(property)) {
        filteredObject[property] = object[property];
      }
    }
  } else {
    for (const property of properties) {
      if (Object.hasOwn(object, property)) {
        filteredObject[property] = object[property];
      }
    }
  }

  return filteredObject;
}

export function queue(array, max = 50) {
  if (max === 0) {
    return array.map((fn) => fn());
  }

  const begin = [];
  let current = 0;
  const ret = array.map(
    (fn) =>
      new Promise((resolve, reject) => {
        begin.push(() => {
          current++;
          Promise.resolve(fn()).then((value) => {
            current--;
            if (current < max && begin.length) {
              begin.shift()();
            }
            resolve(value);
          }, reject);
        });
      })
  );

  for (let i = 0; i < max && begin.length; i++) {
    begin.shift()();
  }

  return ret;
}

export function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// Stolen from here: https://stackoverflow.com/a/3561711
//
// There's a proposal for a native JS function like this, 8ut it's not even
// past stage 1 yet: https://github.com/tc39/proposal-regex-escaping
export function escapeRegex(string) {
  return string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

// Gets the "look" of some arbitrary value. It's like typeof, but smarter.
// Don't use this for actually validating types - it's only suitable for
// inclusion in error messages.
export function typeAppearance(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

// Binds default values for arguments in a {key: value} type function argument
// (typically the second argument, but may be overridden by providing a
// [bindOpts.bindIndex] argument). Typically useful for preparing a function for
// reuse within one or multiple other contexts, which may not be aware of
// required or relevant values provided in the initial context.
//
// This function also passes the identity of `this` through (the returned value
// is not an arrow function), though note it's not a true bound function either
// (since Function.prototype.bind only supports positional arguments, not
// "options" specified via key/value).
//
export function bindOpts(fn, bind) {
  const bindIndex = bind[bindOpts.bindIndex] ?? 1;

  const bound = function (...args) {
    const opts = args[bindIndex] ?? {};
    return Reflect.apply(fn, this, [
      ...args.slice(0, bindIndex),
      {...bind, ...opts}
    ]);
  };

  annotateFunction(bound, {
    name: fn,
    trait: 'options-bound',
  });

  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(fn))) {
    if (key === 'length') continue;
    if (key === 'name') continue;
    if (key === 'arguments') continue;
    if (key === 'caller') continue;
    if (key === 'prototype') continue;
    Object.defineProperty(bound, key, descriptor);
  }

  return bound;
}

bindOpts.bindIndex = Symbol();

// Utility function for providing useful interfaces to the JS AggregateError
// class.
//
// Generally, this works by returning a set of interfaces which operate on
// functions: wrap() takes a function and returns a new function which passes
// its arguments through and appends any resulting error to the internal error
// list; call() simplifies this process by wrapping the provided function and
// then calling it immediately. Once the process for which errors should be
// aggregated is complete, close() constructs and throws an AggregateError
// object containing all caught errors (or doesn't throw anything if there were
// no errors).
export function openAggregate({
  // Constructor to use, defaulting to the builtin AggregateError class.
  // Anything passed here should probably extend from that! May be used for
  // letting callers programatically distinguish between multiple aggregate
  // errors.
  //
  // This should be provided using the aggregateThrows utility function.
  [openAggregate.errorClassSymbol]: errorClass = AggregateError,

  // Optional human-readable message to describe the aggregate error, if
  // constructed.
  message = '',

  // Value to return when a provided function throws an error. If this is a
  // function, it will be called with the arguments given to the function.
  // (This is primarily useful when wrapping a function and then providing it
  // to another utility, e.g. array.map().)
  returnOnFail = null,
} = {}) {
  const errors = [];

  const aggregate = {};

  aggregate.wrap =
    (fn) =>
    (...args) => {
      try {
        return fn(...args);
      } catch (error) {
        errors.push(error);
        return typeof returnOnFail === 'function'
          ? returnOnFail(...args)
          : returnOnFail;
      }
    };

  aggregate.wrapAsync =
    (fn) =>
    (...args) => {
      return fn(...args).then(
        (value) => value,
        (error) => {
          errors.push(error);
          return typeof returnOnFail === 'function'
            ? returnOnFail(...args)
            : returnOnFail;
        }
      );
    };

  aggregate.push = (error) => {
    errors.push(error);
  };

  aggregate.call = (fn, ...args) => {
    return aggregate.wrap(fn)(...args);
  };

  aggregate.callAsync = (fn, ...args) => {
    return aggregate.wrapAsync(fn)(...args);
  };

  aggregate.nest = (...args) => {
    return aggregate.call(() => withAggregate(...args));
  };

  aggregate.nestAsync = (...args) => {
    return aggregate.callAsync(() => withAggregateAsync(...args));
  };

  aggregate.map = (...args) => {
    const parent = aggregate;
    const {result, aggregate: child} = mapAggregate(...args);
    parent.call(child.close);
    return result;
  };

  aggregate.mapAsync = async (...args) => {
    const parent = aggregate;
    const {result, aggregate: child} = await mapAggregateAsync(...args);
    parent.call(child.close);
    return result;
  };

  aggregate.filter = (...args) => {
    const parent = aggregate;
    const {result, aggregate: child} = filterAggregate(...args);
    parent.call(child.close);
    return result;
  };

  aggregate.throws = aggregateThrows;

  aggregate.close = () => {
    if (errors.length) {
      throw Reflect.construct(errorClass, [errors, message]);
    }
  };

  return aggregate;
}

openAggregate.errorClassSymbol = Symbol('error class');

// Utility function for providing {errorClass} parameter to aggregate functions.
export function aggregateThrows(errorClass) {
  return {[openAggregate.errorClassSymbol]: errorClass};
}

// Helper function for allowing both (fn, aggregateOpts) and (aggregateOpts, fn)
// in aggregate utilities.
function _reorganizeAggregateArguments(arg1, arg2) {
  if (typeof arg1 === 'function') {
    return {fn: arg1, opts: arg2 ?? {}};
  } else if (typeof arg2 === 'function') {
    return {fn: arg2, opts: arg1 ?? {}};
  } else {
    throw new Error(`Expected a function`);
  }
}

// Performs an ordinary array map with the given function, collating into a
// results array (with errored inputs filtered out) and an error aggregate.
//
// Optionally, override returnOnFail to disable filtering and map errored inputs
// to a particular output.
//
// Note the aggregate property is the result of openAggregate(), still unclosed;
// use aggregate.close() to throw the error. (This aggregate may be passed to a
// parent aggregate: `parent.call(aggregate.close)`!)
export function mapAggregate(array, arg1, arg2) {
  const {fn, opts} = _reorganizeAggregateArguments(arg1, arg2);
  return _mapAggregate('sync', null, array, fn, opts);
}

export function mapAggregateAsync(array, arg1, arg2) {
  const {fn, opts} = _reorganizeAggregateArguments(arg1, arg2);
  const {promiseAll = Promise.all.bind(Promise), ...remainingOpts} = opts;
  return _mapAggregate('async', promiseAll, array, fn, remainingOpts);
}

// Helper function for mapAggregate which holds code common between sync and
// async versions.
export function _mapAggregate(mode, promiseAll, array, fn, aggregateOpts) {
  const failureSymbol = Symbol();

  const aggregate = openAggregate({
    returnOnFail: failureSymbol,
    ...aggregateOpts,
  });

  if (mode === 'sync') {
    const result = array
      .map(aggregate.wrap(fn))
      .filter((value) => value !== failureSymbol);
    return {result, aggregate};
  } else {
    return promiseAll(array.map(aggregate.wrapAsync(fn)))
      .then((values) => {
        const result = values.filter((value) => value !== failureSymbol);
        return {result, aggregate};
      });
  }
}

// Performs an ordinary array filter with the given function, collating into a
// results array (with errored inputs filtered out) and an error aggregate.
//
// Optionally, override returnOnFail to disable filtering errors and map errored
// inputs to a particular output.
//
// As with mapAggregate, the returned aggregate property is not yet closed.
export function filterAggregate(array, arg1, arg2) {
  const {fn, opts} = _reorganizeAggregateArguments(arg1, arg2);
  return _filterAggregate('sync', null, array, fn, opts);
}

export async function filterAggregateAsync(array, arg1, arg2) {
  const {fn, opts} = _reorganizeAggregateArguments(arg1, arg2);
  const {promiseAll = Promise.all.bind(Promise), ...remainingOpts} = opts;
  return _filterAggregate('async', promiseAll, array, fn, remainingOpts);
}

// Helper function for filterAggregate which holds code common between sync and
// async versions.
function _filterAggregate(mode, promiseAll, array, fn, aggregateOpts) {
  const failureSymbol = Symbol();

  const aggregate = openAggregate({
    returnOnFail: failureSymbol,
    ...aggregateOpts,
  });

  function filterFunction(value) {
    // Filter out results which match the failureSymbol, i.e. errored
    // inputs.
    if (value === failureSymbol) return false;

    // Always keep results which match the overridden returnOnFail
    // value, if provided.
    if (value === aggregateOpts.returnOnFail) return true;

    // Otherwise, filter according to the returned value of the wrapped
    // function.
    return value.output;
  }

  function mapFunction(value) {
    // Then turn the results back into their corresponding input, or, if
    // provided, the overridden returnOnFail value.
    return value === aggregateOpts.returnOnFail ? value : value.input;
  }

  if (mode === 'sync') {
    const result = array
      .map(aggregate.wrap((input, index, array) => {
        const output = fn(input, index, array);
        return {input, output};
      }))
      .filter(filterFunction)
      .map(mapFunction);

    return {result, aggregate};
  } else {
    return promiseAll(
      array.map(aggregate.wrapAsync(async (input, index, array) => {
        const output = await fn(input, index, array);
        return {input, output};
      }))
    ).then((values) => {
      const result = values.filter(filterFunction).map(mapFunction);

      return {result, aggregate};
    });
  }
}

// Totally sugar function for opening an aggregate, running the provided
// function with it, then closing the function and returning the result (if
// there's no throw).
export function withAggregate(arg1, arg2) {
  const {fn, opts} = _reorganizeAggregateArguments(arg1, arg2);
  return _withAggregate('sync', opts, fn);
}

export function withAggregateAsync(arg1, arg2) {
  const {fn, opts} = _reorganizeAggregateArguments(arg1, arg2);
  return _withAggregate('async', opts, fn);
}

export function _withAggregate(mode, aggregateOpts, fn) {
  const aggregate = openAggregate(aggregateOpts);

  if (mode === 'sync') {
    const result = fn(aggregate);
    aggregate.close();
    return result;
  } else {
    return fn(aggregate).then((result) => {
      aggregate.close();
      return result;
    });
  }
}

export function showAggregate(topError, {
  pathToFileURL = f => f,
  showTraces = true,
  print = true,
} = {}) {
  const recursive = (error, {level}) => {
    let headerPart = showTraces
      ? `[${error.constructor.name || 'unnamed'}] ${
          error.message || '(no message)'
        }`
      : error instanceof AggregateError
      ? `[${error.message || '(no message)'}]`
      : error.message || '(no message)';

    if (showTraces) {
      const stackLines = error.stack?.split('\n');

      const stackLine = stackLines?.find(
        (line) =>
          line.trim().startsWith('at') &&
          !line.includes('sugar') &&
          !line.includes('node:') &&
          !line.includes('<anonymous>')
      );

      const tracePart = stackLine
        ? '- ' +
          stackLine
            .trim()
            .replace(/file:\/\/.*\.js/, (match) => pathToFileURL(match))
        : '(no stack trace)';

      headerPart += ` ${colors.dim(tracePart)}`;
    }

    const head1 = level % 2 === 0 ? '\u21aa' : colors.dim('\u21aa');
    const bar1 = ' ';

    const causePart =
      (error.cause
        ? recursive(error.cause, {level: level + 1})
            .split('\n')
            .map((line, i) => i === 0 ? ` ${head1} ${line}` : ` ${bar1} ${line}`)
            .join('\n')
        : '');

    const head2 = level % 2 === 0 ? '\u257f' : colors.dim('\u257f');
    const bar2 = level % 2 === 0 ? '\u2502' : colors.dim('\u254e');

    const aggregatePart =
      (error instanceof AggregateError
        ? error.errors
            .map(error => recursive(error, {level: level + 1}))
            .flatMap(str => str.split('\n'))
            .map((line, i) => i === 0 ? ` ${head2} ${line}` : ` ${bar2} ${line}`)
            .join('\n')
        : '');

    return [headerPart, causePart, aggregatePart].filter(Boolean).join('\n');
  };

  const message = recursive(topError, {level: 0});

  if (print) {
    console.error(message);
  } else {
    return message;
  }
}

export function decorateErrorWithIndex(fn) {
  return (x, index, array) => {
    try {
      return fn(x, index, array);
    } catch (error) {
      error.message = `(${colors.yellow(`#${index + 1}`)}) ${error.message}`;
      error[Symbol.for('hsmusic.decorate.indexInSourceArray')] = index;
      throw error;
    }
  };
}

export function decorateErrorWithCause(fn, cause) {
  return (...args) => {
    try {
      return fn(...args);
    } catch (error) {
      error.cause = cause;
      throw error;
    }
  };
}

export function conditionallySuppressError(conditionFn, callbackFn) {
  return (...args) => {
    try {
      return callbackFn(...args);
    } catch (error) {
      if (conditionFn(error, ...args) === true) {
        return;
      }

      throw error;
    }
  };
}

// Delicious function annotations, such as:
//
//   (*bound) soWeAreBackInTheMine
//   (data *unfulfilled) generateShrekTwo
//
export function annotateFunction(fn, {
  name: nameOrFunction = null,
  description: newDescription,
  trait: newTrait,
}) {
  let name;

  if (typeof nameOrFunction === 'function') {
    name = nameOrFunction.name;
  } else if (typeof nameOrFunction === 'string') {
    name = nameOrFunction;
  }

  name ??= fn.name ?? 'anonymous';

  const match = name.match(/^ *(?<prefix>.*?) *\((?<description>.*)( #(?<trait>.*))?\) *(?<suffix>.*) *$/);

  let prefix, suffix, description, trait;
  if (match) {
    ({prefix, suffix, description, trait} = match.groups);
  }

  prefix ??= '';
  suffix ??= name;
  description ??= '';
  trait ??= '';

  if (newDescription) {
    if (description) {
      description += '; ' + newDescription;
    } else {
      description = newDescription;
    }
  }

  if (newTrait) {
    if (trait) {
      trait += ' #' + newTrait;
    } else {
      trait = '#' + newTrait;
    }
  }

  let parenthesesPart;

  if (description && trait) {
    parenthesesPart = `${description} ${trait}`;
  } else if (description || trait) {
    parenthesesPart = description || trait;
  } else {
    parenthesesPart = '';
  }

  let finalName;

  if (prefix && parenthesesPart) {
    finalName = `${prefix} (${parenthesesPart}) ${suffix}`;
  } else if (parenthesesPart) {
    finalName = `(${parenthesesPart}) ${suffix}`;
  } else {
    finalName = suffix;
  }

  Object.defineProperty(fn, 'name', {value: finalName});
}
