import {compositeFrom} from '#composite';

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
