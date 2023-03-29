import {same} from 'tcompare';

import {empty} from '../../src/util/sugar.js';

export default function mock(callback) {
  const mocks = [];

  const track = callback => (...args) => {
    const {value, close} = callback(...args);
    mocks.push({close});
    return value;
  };

  const mock = {
    function: track(mockFunction),
  };

  return {
    value: callback(mock),
    close: () => {
      const errors = [];
      for (const mock of mocks) {
        try {
          mock.close();
        } catch (error) {
          errors.push(error);
        }
      }
      if (!empty(errors)) {
        throw new AggregateError(errors, `Errors closing sub-mocks`);
      }
    },
  };
}

export function mockFunction(...args) {
  let name = '(anonymous)';
  let behavior = null;

  if (args.length === 2) {
    if (
      typeof args[0] === 'string' &&
      typeof args[1] === 'function'
    ) {
      name = args[0];
      behavior = args[1];
    } else {
      throw new TypeError(`Expected name to be a string`);
    }
  } else if (args.length === 1) {
    if (typeof args[0] === 'string') {
      name = args[0];
    } else if (typeof args[0] === 'function') {
      behavior = args[0];
    } else if (args[0] !== null) {
      throw new TypeError(`Expected string (name), function (behavior), both, or null / no arguments`);
    }
  } else if (args.length > 2) {
    throw new TypeError(`Expected string (name), function (behavior), both, or null / no arguments`);
  }

  let currentCallDescription = newCallDescription();
  const allCallDescriptions = [currentCallDescription];

  const topLevelErrors = [];
  let runningCallCount = 0;
  let limitCallCount = false;
  let markedAsOnce = false;

  const fn = (...args) => {
    const description = processCall(...args);
    return description.behavior(...args);
  };

  fn.behavior = value => {
    if (!(value === null || (
      typeof value === 'function'
    ))) {
      throw new TypeError(`Expected function or null`);
    }

    currentCallDescription.behavior = behavior;
    currentCallDescription.described = true;

    return fn;
  }

  fn.argumentCount = value => {
    if (!(value === null || (
      typeof value === 'number' &&
      value === parseInt(value) &&
      value >= 0
    ))) {
      throw new TypeError(`Expected whole number or null`);
    }

    if (currentCallDescription.argsPattern) {
      throw new TypeError(`Unexpected .argumentCount() when .args() has been called`);
    }

    currentCallDescription.argsPattern = {length: value};
    currentCallDescription.described = true;

    return fn;
  };

  fn.args = (...args) => {
    const value = args[0];

    if (args.length > 1 || !(value === null || Array.isArray(value))) {
      throw new TypeError(`Expected one array or null`);
    }

    currentCallDescription.argsPattern = Object.fromEntries(
      value
        .map((v, i) => v === undefined ? false : [i, v])
        .filter(Boolean)
        .concat([['length', value.length]]));

    currentCallDescription.described = true;

    return fn;
  };

  fn.neverCalled = (...args) => {
    if (!empty(args)) {
      throw new TypeError(`Didn't expect any arguments`);
    }

    if (allCallDescriptions[0].described) {
      throw new TypeError(`Unexpected .neverCalled() when any descriptions provided`);
    }

    limitCallCount = true;
    allCallDescriptions.splice(0, allCallDescriptions.length);

    currentCallDescription = new Proxy({}, {
      set() {
        throw new Error(`Unexpected description when .neverCalled() has been called`);
      },
    });

    return fn;
  };

  fn.once = (...args) => {
    if (!empty(args)) {
      throw new TypeError(`Didn't expect any arguments`);
    }

    if (allCallDescriptions.length > 1) {
      throw new TypeError(`Unexpected .once() when providing multiple descriptions`);
    }

    currentCallDescription.described = true;
    limitCallCount = true;
    markedAsOnce = true;

    return fn;
  };

  fn.next = (...args) => {
    if (!empty(args)) {
      throw new TypeError(`Didn't expect any arguments`);
    }

    if (markedAsOnce) {
      throw new TypeError(`Unexpected .next() when .once() has been called`);
    }

    currentCallDescription = newCallDescription();
    allCallDescriptions.push(currentCallDescription);

    limitCallCount = true;

    return fn;
  };

  fn.repeat = times => {
    // Note: This function should be called AFTER filling out the
    // call description which is being repeated.

    if (!(
      typeof times === 'number' &&
      times === parseInt(times) &&
      times >= 2
    )) {
      throw new TypeError(`Expected whole number of at least 2`);
    }

    if (markedAsOnce) {
      throw new TypeError(`Unexpected .repeat() when .once() has been called`);
    }

    // The current call description is already in the full list,
    // so skip the first push.
    for (let i = 2; i <= times; i++) {
      allCallDescriptions.push(currentCallDescription);
    }

    // Prep a new description like when calling .next().
    currentCallDescription = newCallDescription();
    allCallDescriptions.push(currentCallDescription);

    limitCallCount = true;

    return fn;
  };

  return {
    value: fn,
    close: () => {
      const totalCallCount = runningCallCount;
      const expectedCallCount = countDescribedCalls();

      if (limitCallCount && totalCallCount !== expectedCallCount) {
        if (expectedCallCount > 1) {
          topLevelErrors.push(new Error(`Expected ${expectedCallCount} calls, got ${totalCallCount}`));
        } else if (expectedCallCount === 1) {
          topLevelErrors.push(new Error(`Expected 1 call, got ${totalCallCount}`));
        } else {
          topLevelErrors.push(new Error(`Expected no calls, got ${totalCallCount}`));
        }
      }

      if (topLevelErrors.length) {
        throw new AggregateError(topLevelErrors, `Errors in mock ${name}`);
      }
    },
  };

  function newCallDescription() {
    return {
      described: false,
      behavior: behavior ?? null,
      argumentCount: null,
      argsPattern: null,
    };
  }

  function processCall(...args) {
    const callErrors = [];

    runningCallCount++;

    // No further processing, this indicates the function shouldn't have been
    // called at all and there aren't any descriptions to match this call with.
    if (empty(allCallDescriptions)) {
      return newCallDescription();
    }

    const currentCallNumber = runningCallCount;
    const currentDescription = selectCallDescription(currentCallNumber);

    const {
      argumentCount,
      argsPattern,
    } = currentDescription;

    if (argumentCount !== null && args.length !== argumentCount) {
      callErrors.push(
        new Error(`Argument count mismatch: expected ${argumentCount}, got ${args.length}`));
    }

    if (argsPattern !== null) {
      const keysToCheck = Object.keys(argsPattern);
      const argsAsObject = Object.fromEntries(
        args
          .map((v, i) => [i.toString(), v])
          .filter(([i]) => keysToCheck.includes(i))
          .concat([['length', args.length]]));

      const {match, diff} = same(argsAsObject, argsPattern);
      if (!match) {
        callErrors.push(new Error(`Argument pattern mismatch:\n` + diff));
      }
    }

    if (!empty(callErrors)) {
      const aggregate = new AggregateError(callErrors, `Errors in call #${currentCallNumber}`);
      topLevelErrors.push(aggregate);
    }

    return currentDescription;
  }

  function selectCallDescription(currentCallNumber) {
    if (currentCallNumber > countDescribedCalls()) {
      const lastDescription = lastCallDescription();
      if (lastDescription.described) {
        return newCallDescription();
      } else {
        return lastDescription;
      }
    } else {
      return allCallDescriptions[currentCallNumber - 1];
    }
  }

  function countDescribedCalls() {
    if (empty(allCallDescriptions)) {
      return 0;
    }

    return (
      (lastCallDescription().described
        ? allCallDescriptions.length
        : allCallDescriptions.length - 1));
  }

  function lastCallDescription() {
    return allCallDescriptions[allCallDescriptions.length - 1];
  }
}
