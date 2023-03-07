import {empty} from './util/sugar.js';

export default function contentFunction({
  contentDependencies = [],
  extraDependencies = [],

  data,
  generate,
}) {
  return expectDependencies({
    data,
    generate,

    expectedContentDependencyKeys: contentDependencies,
    expectedExtraDependencyKeys: extraDependencies,
    fulfilledDependencies: {},
  });
}

contentFunction.identifyingSymbol = Symbol(`Is a content function?`);

export function expectDependencies({
  generate,
  data,

  expectedContentDependencyKeys,
  expectedExtraDependencyKeys,
  fulfilledDependencies,
}) {
  if (!generate) {
    throw new Error(`Expected generate function`);
  }

  if (!data) {
    throw new Error(`Expected data function`);
  }

  const fulfilledDependencyKeys = Object.keys(fulfilledDependencies);

  const invalidatingDependencyKeys = Object.entries(fulfilledDependencies)
    .filter(([key, value]) => value.fulfilled === false)
    .map(([key]) => key);

  const missingContentDependencyKeys = expectedContentDependencyKeys
    .filter(key => !fulfilledDependencyKeys.includes(key));

  const missingExtraDependencyKeys = expectedExtraDependencyKeys
    .filter(key => !fulfilledDependencyKeys.includes(key));

  let wrappedGenerate;

  if (!empty(invalidatingDependencyKeys)) {
    wrappedGenerate = function() {
      throw new Error(`Generate invalidated because unfulfilled dependencies provided: ${invalidatingDependencyKeys.join(', ')}`);
    };

    wrappedGenerate.fulfilled ??= false;
  }

  if (empty(missingContentDependencyKeys) && empty(missingExtraDependencyKeys)) {
    wrappedGenerate ??= function(data) {
      return generate(data, fulfilledDependencies);
    };

    wrappedGenerate.fulfill = function() {
      throw new Error(`All dependencies already fulfilled`);
    };

    wrappedGenerate.fulfilled ??= true;
  }

  wrappedGenerate ??= function() {
    throw new Error(`Dependencies still needed: ${missingContentDependencyKeys.concat(missingExtraDependencyKeys).join(', ')}`);
  };

  wrappedGenerate.fulfilled ??= false;
  wrappedGenerate[contentFunction.identifyingSymbol] = true;

  if (empty(missingContentDependencyKeys)) {
    const dataDependencies = {};

    for (const key of expectedContentDependencyKeys) {
      const wrappedDependency = function() {
        throw new Error(`Expected call to this dependency's .data()`);
      };

      wrappedDependency.data = fulfilledDependencies[key].data;
      dataDependencies[key] = wrappedDependency;
    }

    wrappedGenerate.data = function(...args) {
      return data(...args, dataDependencies);
    };
  }

  wrappedGenerate.data ??= function() {
    throw new Error(`Dependencies still needed: ${missingContentDependencyKeys.join(', ')}`);
  };

  wrappedGenerate.fulfill ??= function(dependencies) {
    return expectDependencies({
      generate,
      data,

      expectedContentDependencyKeys,
      expectedExtraDependencyKeys,

      fulfilledDependencies: fulfillDependencies({
        name: generate.name,
        dependencies,

        expectedContentDependencyKeys,
        expectedExtraDependencyKeys,
        fulfilledDependencies,
      }),
    });
  };

  return wrappedGenerate;
}

export function fulfillDependencies({
  name,
  dependencies,
  expectedContentDependencyKeys,
  expectedExtraDependencyKeys,
  fulfilledDependencies,
}) {
  const newFulfilledDependencies = {...fulfilledDependencies};
  const fulfilledDependencyKeys = Object.keys(fulfilledDependencies);

  const errors = [];
  let bail = false;

  for (let [key, value] of Object.entries(dependencies)) {
    if (key.startsWith('u_')) {
      key = key.slice(2);
    }

    if (fulfilledDependencyKeys.includes(key)) {
      errors.push(new Error(`Dependency ${key} is already fulfilled`));
      bail = true;
      continue;
    }

    const isContentKey = expectedContentDependencyKeys.includes(key);
    const isExtraKey = expectedExtraDependencyKeys.includes(key);

    if (!isContentKey && !isExtraKey) {
      errors.push(new Error(`Dependency ${key} is not expected`));
      bail = true;
      continue;
    }

    if (isContentKey && !value[contentFunction.identifyingSymbol]) {
      errors.push(new Error(`Content dependency ${key} is not a content function`));
      bail = true;
      continue;
    }

    if (isExtraKey && value[contentFunction.identifyingSymbol]) {
      errors.push(new Error(`Extra dependency ${key} is a content function`));
      bail = true;
      continue;
    }

    if (!bail) {
      newFulfilledDependencies[key] = value;
    }
  }

  if (!empty(errors)) {
    throw new AggregateError(errors, `Errors fulfilling dependencies for ${name}`);
  }

  return newFulfilledDependencies;
}
