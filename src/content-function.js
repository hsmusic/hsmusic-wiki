import {annotateFunction, empty} from './util/sugar.js';

export default function contentFunction({
  contentDependencies = [],
  extraDependencies = [],

  data,
  generate,
  relations,
}) {
  return expectDependencies({
    data,
    generate,
    relations,

    expectedContentDependencyKeys: contentDependencies,
    expectedExtraDependencyKeys: extraDependencies,
    fulfilledDependencies: {},
  });
}

contentFunction.identifyingSymbol = Symbol(`Is a content function?`);

export function expectDependencies({
  data,
  generate,
  relations,

  expectedContentDependencyKeys,
  expectedExtraDependencyKeys,
  fulfilledDependencies,
}) {
  if (!generate) {
    throw new Error(`Expected generate function`);
  }

  const hasDataFunction = !!data;
  const hasRelationsFunction = !!relations;

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

    annotateFunction(wrappedGenerate, {name: generate, trait: 'invalidated'});
    wrappedGenerate.fulfilled ??= false;
  }

  if (empty(missingContentDependencyKeys) && empty(missingExtraDependencyKeys)) {
    wrappedGenerate ??= function(data, relations) {
      if (hasDataFunction && !data) {
        throw new Error(`Expected data`);
      }

      if (hasRelationsFunction && !relations) {
        throw new Error(`Expected relations`);
      }

      if (hasDataFunction && hasRelationsFunction) {
        return generate(data, relations, fulfilledDependencies);
      } else if (hasDataFunction) {
        return generate(data, fulfilledDependencies);
      } else if (hasRelationsFunction) {
        return generate(relations, fulfilledDependencies);
      } else {
        return generate(fulfilledDependencies);
      }
    };

    annotateFunction(wrappedGenerate, {name: generate, trait: 'fulfilled'});
    wrappedGenerate.fulfilled ??= true;

    wrappedGenerate.fulfill = function() {
      throw new Error(`All dependencies already fulfilled`);
    };
  }

  if (!wrappedGenerate) {
    wrappedGenerate = function() {
      throw new Error(`Dependencies still needed: ${missingContentDependencyKeys.concat(missingExtraDependencyKeys).join(', ')}`);
    };

    annotateFunction(wrappedGenerate, {name: generate, trait: 'unfulfilled'});
    wrappedGenerate.fulfilled = false;
  }

  wrappedGenerate[contentFunction.identifyingSymbol] = true;

  if (hasDataFunction) {
    if (empty(missingContentDependencyKeys)) {
      wrappedGenerate.data = data;
    } else {
      wrappedGenerate.data = function() {
        throw new Error(`Dependencies still needed: ${missingContentDependencyKeys.join(', ')}`);
      };

      annotateFunction(wrappedGenerate.data, {name: data, trait: 'unfulfilled'});
    }
  }

  if (hasRelationsFunction) {
    wrappedGenerate.relations = relations;
  }

  wrappedGenerate.fulfill ??= function fulfill(dependencies) {
    return expectDependencies({
      data,
      generate,
      relations,

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
