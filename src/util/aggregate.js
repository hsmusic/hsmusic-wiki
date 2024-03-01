import {colors} from './cli.js';
import {empty, typeAppearance} from './sugar.js';

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

  // Optional flag to indicate that this layer of the aggregate error isn't
  // generally useful outside of developer debugging purposes - it will be
  // skipped by default when using showAggregate, showing contained errors
  // inline with other children of this aggregate's parent.
  //
  // If set to 'single', it'll be hidden only if there's a single error in the
  // aggregate (so it's not grouping multiple errors together).
  translucent = false,

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
      const error = Reflect.construct(errorClass, [errors, message]);

      if (translucent) {
        error[Symbol.for('hsmusic.aggregate.translucent')] = translucent;
      }

      throw error;
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

export const unhelpfulTraceLines = [
  /sugar/,
  /aggregate/,
  /node:/,
  /<anonymous>/,
];

export function getUsefulTraceLine(trace, {helpful, unhelpful}) {
  if (!trace) return '';

  for (const traceLine of trace.split('\n')) {
    if (!traceLine.trim().startsWith('at')) {
      continue;
    }

    if (!empty(unhelpful)) {
      if (unhelpful.some(regex => regex.test(traceLine))) {
        continue;
      }
    }

    if (!empty(helpful)) {
      for (const regex of helpful) {
        const match = traceLine.match(regex);

        if (match) {
          return match[1] ?? traceLine;
        }
      }

      continue;
    }

    return traceLine;
  }

  return '';
}

export function showAggregate(topError, {
  pathToFileURL = f => f,
  showTraces = true,
  showTranslucent = showTraces,
  print = true,
} = {}) {
  const getTranslucency = error =>
    error[Symbol.for('hsmusic.aggregate.translucent')] ?? false;

  const determineCauseHelper = cause => {
    if (!cause) {
      return null;
    }

    const translucency = getTranslucency(cause);

    if (!translucency) {
      return cause;
    }

    if (translucency === 'single') {
      if (cause.errors?.length === 1) {
        return determineCauseHelper(cause.errors[0]);
      } else {
        return cause;
      }
    }

    return determineCauseHelper(cause.cause);
  };

  const determineCause = error =>
    (showTranslucent
      ? error.cause ?? null
      : determineCauseHelper(error.cause));

  const determineErrorsHelper = error => {
    const translucency = getTranslucency(error);

    if (!translucency) {
      return [error];
    }

    if (translucency === 'single' && error.errors?.length >= 2) {
      return [error];
    }

    const errors = [];

    if (error.cause) {
      errors.push(...determineErrorsHelper(error.cause));
    }

    if (error.errors) {
      errors.push(...error.errors.flatMap(determineErrorsHelper));
    }

    return errors;
  };

  const determineErrors = error =>
    (showTranslucent
      ? error.errors ?? null
      : error.errors?.flatMap(determineErrorsHelper) ?? null);

  const flattenErrorStructure = (error, level = 0) => {
    const cause = determineCause(error);
    const errors = determineErrors(error);

    return {
      level,

      kind: error.constructor.name,
      message: error.message,

      trace:
        (error[Symbol.for(`hsmusic.aggregate.traceFrom`)]
          ? error[Symbol.for(`hsmusic.aggregate.traceFrom`)].stack
          : error.stack),

      cause:
        (cause
          ? flattenErrorStructure(cause, level + 1)
          : null),

      errors:
        (errors
          ? errors.map(error => flattenErrorStructure(error, level + 1))
          : null),

      options: {
        alwaysTrace:
          error[Symbol.for(`hsmusic.aggregate.alwaysTrace`)],

        helpfulTraceLines:
          error[Symbol.for(`hsmusic.aggregate.helpfulTraceLines`)],

        unhelpfulTraceLines:
          error[Symbol.for(`hsmusic.aggregate.unhelpfulTraceLines`)],
      }
    };
  };

  const recursive = ({
    level,
    kind,
    message,
    trace,
    cause,
    errors,
    options: {
      alwaysTrace,
      helpfulTraceLines: ownHelpfulTraceLines,
      unhelpfulTraceLines: ownUnhelpfulTraceLines,
    },
  }, index, apparentSiblings) => {
    const subApparentSiblings =
      (cause && errors
        ? [cause, ...errors]
     : cause
        ? [cause]
     : errors
        ? errors
        : []);

    const anythingHasErrorsThisLayer =
      apparentSiblings.some(({errors}) => !empty(errors));

    const messagePart =
      message || `(no message)`;

    const kindPart =
      kind || `unnamed kind`;

    let headerPart =
      (showTraces
        ? `[${kindPart}] ${messagePart}`
     : errors
        ? `[${messagePart}]`
     : anythingHasErrorsThisLayer
        ? ` ${messagePart}`
        : messagePart);

    if (showTraces || alwaysTrace) {
      const traceLine =
        getUsefulTraceLine(trace, {
          unhelpful:
            (ownUnhelpfulTraceLines
              ? unhelpfulTraceLines.concat(ownUnhelpfulTraceLines)
              : unhelpfulTraceLines),

          helpful:
            (ownHelpfulTraceLines
              ? ownHelpfulTraceLines
              : null),
        });

      const tracePart =
        (traceLine
          ? '- ' +
            traceLine
              .trim()
              .replace(/file:\/\/.*\.js/, (match) => pathToFileURL(match))
          : '(no stack trace)');

      headerPart += ` ${colors.dim(tracePart)}`;
    }

    const head1 = level % 2 === 0 ? '\u21aa' : colors.dim('\u21aa');
    const bar1 = ' ';

    const causePart =
      (cause
        ? recursive(cause, 0, subApparentSiblings)
            .split('\n')
            .map((line, i) => i === 0 ? ` ${head1} ${line}` : ` ${bar1} ${line}`)
            .join('\n')
        : '');

    const head2 = level % 2 === 0 ? '\u257f' : colors.dim('\u257f');
    const bar2 = level % 2 === 0 ? '\u2502' : colors.dim('\u254e');

    const errorsPart =
      (errors
        ? errors
            .map((error, index) => recursive(error, index + 1, subApparentSiblings))
            .flatMap(str => str.split('\n'))
            .map((line, i) => i === 0 ? ` ${head2} ${line}` : ` ${bar2} ${line}`)
            .join('\n')
        : '');

    return [headerPart, errorsPart, causePart].filter(Boolean).join('\n');
  };

  const structure = flattenErrorStructure(topError);
  const message = recursive(structure, 0, [structure]);

  if (print) {
    console.error(message);
  } else {
    return message;
  }
}

export function annotateError(error, ...callbacks) {
  for (const callback of callbacks) {
    error = callback(error) ?? error;
  }

  return error;
}

export function annotateErrorWithIndex(error, index) {
  return Object.assign(error, {
    [Symbol.for('hsmusic.annotateError.indexInSourceArray')]:
      index,

    message:
      `(${colors.yellow(`#${index + 1}`)}) ` +
      error.message,
  });
}

export function annotateErrorWithFile(error, file) {
  return Object.assign(error, {
    [Symbol.for('hsmusic.annotateError.file')]:
      file,

    message:
      error.message +
      (error.message.includes('\n') ? '\n' : ' ') +
      `(file: ${colors.bright(colors.blue(file))})`,
  });
}

export function asyncAdaptiveDecorateError(fn, callback) {
  if (typeof callback !== 'function') {
    throw new Error(`Expected callback to be a function, got ${typeAppearance(callback)}`);
  }

  const syncDecorated = function (...args) {
    try {
      return fn(...args);
    } catch (caughtError) {
      throw callback(caughtError, ...args);
    }
  };

  const asyncDecorated = async function(...args) {
    try {
      return await fn(...args);
    } catch (caughtError) {
      throw callback(caughtError, ...args);
    }
  };

  syncDecorated.async = asyncDecorated;

  return syncDecorated;
}

export function decorateError(fn, callback) {
  return asyncAdaptiveDecorateError(fn, callback);
}

export function asyncDecorateError(fn, callback) {
  return asyncAdaptiveDecorateError(fn, callback).async;
}

export function decorateErrorWithAnnotation(fn, ...annotationCallbacks) {
  return asyncAdaptiveDecorateError(fn,
    (caughtError, ...args) =>
      annotateError(caughtError,
        ...annotationCallbacks
          .map(callback => error => callback(error, ...args))));
}

export function decorateErrorWithIndex(fn) {
  return decorateErrorWithAnnotation(fn,
    (caughtError, _value, index) =>
      annotateErrorWithIndex(caughtError, index));
}

export function decorateErrorWithCause(fn, cause) {
  return asyncAdaptiveDecorateError(fn,
    (caughtError) =>
      Object.assign(caughtError, {cause}));
}

export function asyncDecorateErrorWithAnnotation(fn, ...annotationCallbacks) {
  return decorateErrorWithAnnotation(fn, ...annotationCallbacks).async;
}

export function asyncDecorateErrorWithIndex(fn) {
  return decorateErrorWithIndex(fn).async;
}

export function asyncDecorateErrorWithCause(fn, cause) {
  return decorateErrorWithCause(fn, cause).async;
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
