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

// Gets the item at an index relative to another index.
export function atOffset(array, index, offset, {
  wrap = false,
  valuePastEdge = null,
} = {}) {
  if (index === -1) {
    return valuePastEdge;
  }

  if (offset === 0) {
    return array[index];
  }

  if (wrap) {
    return array[(index + offset) % array.length];
  }

  if (offset > 0 && index + offset > array.length - 1) {
    return valuePastEdge;
  }

  if (offset < 0 && index + offset < 0) {
    return valuePastEdge;
  }

  return array[index + offset];
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
// past stage ~~1~~ 2 yet: https://github.com/tc39/proposal-regex-escaping
export function escapeRegex(string) {
  return string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

// Follows a key path like 'foo.bar.baz' to get an item nested deeply inside
// an object.
export function getNestedProp(obj, key) {
  const recursive = (o, k) =>
    (k.length === 1
      ? o[k[0]]
      : recursive(o[k[0]], k.slice(1)));

  return recursive(obj, key.split(/(?<=(?<!\\)(?:\\\\)*)\./));
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

// Limits a string to the desired length, filling in an ellipsis at the end
// if it cuts any text off.
export function cut(text, length = 40) {
  if (text.length >= length) {
    const index = Math.max(1, length - 3);
    return text.slice(0, index) + '...';
  } else {
    return text;
  }
}

// Limits a string to the desired length, filling in an ellipsis at the start
// if it cuts any text off.
export function cutStart(text, length = 40) {
  if (text.length >= length) {
    const index = Math.min(text.length - 1, text.length - length + 3);
    return '...' + text.slice(index);
  } else {
    return text;
  }
}

// Annotates {index, length} results from another iterator with contextual
// details, including:
//
// * its line and column numbers;
// * if `formatWhere` is true (the default), a pretty-formatted,
//   human-readable indication of the match's placement in the string;
// * if `getContainingLine` is true, the entire line (or multiple lines)
//   of text containing the match.
//
export function* iterateMultiline(content, iterator, {
  formatWhere = true,
  getContainingLine = false,
} = {}) {
  const lineRegexp = /\n/g;
  const isMultiline = content.includes('\n');

  let lineNumber = 0;
  let startOfLine = 0;
  let previousIndex = 0;

  const countLineBreaks = (index, length) => {
    const range = content.slice(index, index + length);
    const lineBreaks = Array.from(range.matchAll(lineRegexp));
    if (!empty(lineBreaks)) {
      lineNumber += lineBreaks.length;
      startOfLine = index + lineBreaks.at(-1).index + 1;
    }
  };

  for (const result of iterator) {
    const {index, length} = result;

    countLineBreaks(previousIndex, index - previousIndex);

    const matchStartOfLine = startOfLine;

    previousIndex = index + length;

    const columnNumber = index - startOfLine;

    let where = null;
    if (formatWhere) {
      where =
        colors.yellow(
          (isMultiline
            ? `line: ${lineNumber + 1}, col: ${columnNumber + 1}`
            : `pos: ${index + 1}`));
    }

    countLineBreaks(index, length);

    let containingLine = null;
    if (getContainingLine) {
      const nextLineResult =
        content
          .slice(previousIndex)
          .matchAll(lineRegexp)
          .next();

      const nextStartOfLine =
        (nextLineResult.done
          ? content.length
          : previousIndex + nextLineResult.value.index);

      containingLine =
        content.slice(matchStartOfLine, nextStartOfLine);
    }

    yield {
      ...result,
      lineNumber,
      columnNumber,
      where,
      containingLine,
    };
  }
}

// Iterates over regular expression matches within a single- or multiline
// string, yielding each match as well as contextual details; this accepts
// the same options (and provides the same context) as iterateMultiline.
export function* matchMultiline(content, matchRegexp, options) {
  const matchAllIterator =
    content.matchAll(matchRegexp);

  const cleanMatchAllIterator =
    (function*() {
      for (const match of matchAllIterator) {
        yield {
          index: match.index,
          length: match[0].length,
          match,
        };
      }
    })();

  const multilineIterator =
    iterateMultiline(content, cleanMatchAllIterator, options);

  yield* multilineIterator;
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

// Sorts multiple arrays by an arbitrary function (which is the last argument).
// Paired values from each array are provided to the callback sequentially:
//
//   (a_fromFirstArray, b_fromFirstArray,
//    a_fromSecondArray, b_fromSecondArray,
//    a_fromThirdArray, b_fromThirdArray) =>
//     relative positioning (negative, positive, or zero)
//
// Like native single-array sort, this is a mutating function.
export function sortMultipleArrays(...args) {
  const arrays = args.slice(0, -1);
  const fn = args.at(-1);

  const length = arrays[0].length;
  const symbols = new Array(length).fill(null).map(() => Symbol());
  const indexes = Object.fromEntries(symbols.map((symbol, index) => [symbol, index]));

  symbols.sort((a, b) => {
    const indexA = indexes[a];
    const indexB = indexes[b];

    const args = [];
    for (let i = 0; i < arrays.length; i++) {
      args.push(arrays[i][indexA]);
      args.push(arrays[i][indexB]);
    }

    return fn(...args);
  });

  for (const array of arrays) {
    // Note: We're mutating this array pulling values from itself, but only all
    // at once after all those values have been pulled.
    array.splice(0, array.length, ...symbols.map(symbol => array[indexes[symbol]]));
  }

  return arrays;
}

// Filters multiple arrays by an arbitrary function (which is the last argument).
// Values from each array are provided to the callback sequentially:
//
//   (value_fromFirstArray,
//    value_fromSecondArray,
//    value_fromThirdArray,
//    index,
//    [firstArray, secondArray, thirdArray]) =>
//      true or false
//
// Please be aware that this is a mutating function, unlike native single-array
// filter. The mutated arrays are returned. Also attached under `.removed` are
// corresponding arrays of items filtered out.
export function filterMultipleArrays(...args) {
  const arrays = args.slice(0, -1);
  const fn = args.at(-1);

  const removed = new Array(arrays.length).fill(null).map(() => []);

  for (let i = arrays[0].length - 1; i >= 0; i--) {
    const args = arrays.map(array => array[i]);
    args.push(i, arrays);

    if (!fn(...args)) {
      for (let j = 0; j < arrays.length; j++) {
        const item = arrays[j][i];
        arrays[j].splice(i, 1);
        removed[j].unshift(item);
      }
    }
  }

  Object.assign(arrays, {removed});
  return arrays;
}

// Corresponding filter function for sortByCount. By default, items whose
// corresponding count is zero will be removed.
export function filterByCount(data, counts, {
  min = 1,
  max = Infinity,
} = {}) {
  filterMultipleArrays(data, counts, (data, count) =>
    count >= min && count <= max);
}

// Reduces multiple arrays with an arbitrary function (which is the last
// argument). Note that this reduces into multiple accumulators, one for
// each input array, not just a single value. That's reflected in both the
// callback parameters:
//
//   (accumulator1,
//    accumulator2,
//    value_fromFirstArray,
//    value_fromSecondArray,
//    index,
//    [firstArray, secondArray]) =>
//      [newAccumulator1, newAccumulator2]
//
// As well as the final return value of reduceMultipleArrays:
//
//   [finalAccumulator1, finalAccumulator2]
//
// This is not a mutating function.
export function reduceMultipleArrays(...args) {
  const [arrays, fn, initialAccumulators] =
    (typeof args.at(-1) === 'function'
      ? [args.slice(0, -1), args.at(-1), null]
      : [args.slice(0, -2), args.at(-2), args.at(-1)]);

  if (empty(arrays[0])) {
    throw new TypeError(`Reduce of empty arrays with no initial value`);
  }

  let [accumulators, i] =
    (initialAccumulators
      ? [initialAccumulators, 0]
      : [arrays.map(array => array[0]), 1]);

  for (; i < arrays[0].length; i++) {
    const args = [...accumulators, ...arrays.map(array => array[i])];
    args.push(i, arrays);
    accumulators = fn(...args);
  }

  return accumulators;
}

export function chunkByConditions(array, conditions) {
  if (empty(array)) {
    return [];
  }

  if (empty(conditions)) {
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
}

export function chunkByProperties(array, properties) {
  return chunkByConditions(
    array,
    properties.map((p) => (a, b) => {
      if (a[p] instanceof Date && b[p] instanceof Date) return +a[p] !== +b[p];

      if (a[p] !== b[p]) return true;

      // Not sure if this line is still necessary with the specific check for
      // d8tes a8ove, 8ut, uh, keeping it anyway, just in case....?
      if (a[p] != b[p]) return true;

      return false;
    })
  ).map((chunk) => ({
    ...Object.fromEntries(properties.map((p) => [p, chunk[0][p]])),
    chunk,
  }));
}

export function chunkMultipleArrays(...args) {
  const arrays = args.slice(0, -1);
  const fn = args.at(-1);

  if (arrays[0].length === 0) {
    return [];
  }

  const newChunk = index => arrays.map(array => [array[index]]);
  const results = [newChunk(0)];

  for (let i = 1; i < arrays[0].length; i++) {
    const current = results.at(-1);

    const args = [];
    for (let j = 0; j < arrays.length; j++) {
      const item = arrays[j][i];
      const previous = current[j].at(-1);
      args.push(item, previous);
    }

    if (fn(...args)) {
      results.push(newChunk(i));
      continue;
    }

    for (let j = 0; j < arrays.length; j++) {
      current[j].push(arrays[j][i]);
    }
  }

  return results;
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
