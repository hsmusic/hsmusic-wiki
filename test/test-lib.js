import {compositeFrom} from '#composite';

Error.stackTraceLimit = Infinity;

export function quickCheckCompositeOutputs(t, dependencies) {
  return (step, outputDict) => {
    t.same(
      Object.keys(step.toDescription().outputs),
      Object.keys(outputDict));

    const composite = compositeFrom({
      compose: false,
      steps: [
        step,

        {
          dependencies: Object.keys(outputDict),

          // Access all dependencies by their expected keys -
          // the composition runner actually provides a proxy
          // and is checking that *we* access the dependencies
          // we've specified.
          compute: dependencies =>
            Object.fromEntries(
              Object.keys(outputDict)
                .map(key => [key, dependencies[key]])),
        },
      ],
    });

    t.same(
      composite.expose.compute(dependencies),
      outputDict);
  };
}

export function strictlyThrows(t, fn, pattern) {
  const error = catchErrorOrNull(fn);

  t.currentAssert = strictlyThrows;

  if (error === null) {
    t.fail(`expected to throw`);
    return;
  }

  const nameAndMessage = `${pattern.constructor.name} ${pattern.message}`;
  t.match(
    prepareErrorForMatch(error),
    prepareErrorForMatch(pattern),
    (pattern instanceof AggregateError
      ? `expected to throw: ${nameAndMessage} (${pattern.errors.length} error(s))`
      : `expected to throw: ${nameAndMessage}`));
}

function prepareErrorForMatch(error) {
  if (error instanceof RegExp) {
    return {
      message: error,
    };
  }

  if (!(error instanceof Error)) {
    return error;
  }

  const matchable = {
    name: error.constructor.name,
    message: error.message,
  };

  if (error instanceof AggregateError) {
    matchable.errors = error.errors.map(prepareErrorForMatch);
  }

  return matchable;
}

function catchErrorOrNull(fn) {
  try {
    fn();
    return null;
  } catch (error) {
    return error;
  }
}
