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
    .filter(([key, value]) => value?.fulfilled === false)
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
    wrappedGenerate.fulfilled = false;
  } else if (empty(missingContentDependencyKeys) && empty(missingExtraDependencyKeys)) {
    wrappedGenerate = function(arg1, arg2) {
      if (hasDataFunction && !arg1) {
        throw new Error(`Expected data`);
      }

      if (hasDataFunction && hasRelationsFunction && !arg2) {
        throw new Error(`Expected relations`);
      }

      if (hasRelationsFunction && !arg1) {
        throw new Error(`Expected relations`);
      }

      if (hasDataFunction && hasRelationsFunction) {
        return generate(arg1, arg2, fulfilledDependencies);
      } else if (hasDataFunction || hasRelationsFunction) {
        return generate(arg1, fulfilledDependencies);
      } else {
        return generate(fulfilledDependencies);
      }
    };

    annotateFunction(wrappedGenerate, {name: generate, trait: 'fulfilled'});
    wrappedGenerate.fulfilled = true;

    wrappedGenerate.fulfill = function() {
      throw new Error(`All dependencies already fulfilled`);
    };
  } else {
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

  Object.assign(wrappedGenerate, {
    contentDependencies: expectedContentDependencyKeys,
    extraDependencies: expectedExtraDependencyKeys,
  });

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

    if (value === undefined) {
      errors.push(new Error(`Dependency ${key} was provided undefined`));
      bail = true;
      continue;
    }

    if (isContentKey && !value?.[contentFunction.identifyingSymbol]) {
      errors.push(new Error(`Content dependency ${key} is not a content function (got ${value})`));
      bail = true;
      continue;
    }

    if (isExtraKey && value?.[contentFunction.identifyingSymbol]) {
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

export function getRelationsTree(dependencies, contentFunctionName, ...args) {
  const relationIdentifier = Symbol('Relation');

  function recursive(contentFunctionName, ...args) {
    const contentFunction = dependencies[contentFunctionName];
    if (!contentFunctionName) {
      throw new Error(`Couldn't find dependency ${contentFunctionName}`);
    }

    if (!contentFunction?.relations) {
      return null;
    }

    const relationSlots = {};

    const relationSymbolMessage = (() => {
      let num = 1;
      return name => `#${num++} ${name}`;
    })();

    const relationFunction = (name, ...args) => {
      const relationSymbol = Symbol(relationSymbolMessage(name));
      relationSlots[relationSymbol] = {name, args};
      return {[relationIdentifier]: relationSymbol};
    };

    const relationsLayout = contentFunction.relations(relationFunction, ...args);

    const relationsTree = Object.fromEntries(
      Object.getOwnPropertySymbols(relationSlots)
        .map(symbol => [symbol, relationSlots[symbol]])
        .map(([symbol, {name, args}]) => [
          symbol,
          recursive(name, ...args),
        ]));

    return {
      layout: relationsLayout,
      slots: relationSlots,
      tree: relationsTree,
    };
  }

  const relationsTree = recursive(contentFunctionName, ...args);

  return {
    root: {
      name: contentFunctionName,
      args,
      relations: relationsTree?.layout,
    },

    relationIdentifier,
    relationsTree,
  };
}

export function flattenRelationsTree({
  root,
  relationIdentifier,
  relationsTree,
}) {
  const flatRelationSlots = {};

  function recursive({layout, slots, tree}) {
    for (const slot of Object.getOwnPropertySymbols(slots)) {
      if (tree[slot]) {
        recursive(tree[slot]);
      }

      flatRelationSlots[slot] = {
        name: slots[slot].name,
        args: slots[slot].args,
        relations: tree[slot]?.layout ?? null,
      };
    }
  }

  recursive(relationsTree);

  return {
    root,
    relationIdentifier,
    flatRelationSlots,
  };
}

export function fillRelationsLayoutFromSlotResults(relationIdentifier, results, layout) {
  function recursive(object) {
    if (typeof object !== 'object' || object === null) {
      return object;
    }

    if (Array.isArray(object)) {
      return object.map(recursive);
    }

    if (relationIdentifier in object) {
      return results[object[relationIdentifier]];
    }

    if (object.constructor !== Object) {
      throw new Error(`Expected primitive, array, relation, or normal {key: value} style Object`);
    }

    return Object.fromEntries(
      Object.entries(object)
        .map(([key, value]) => [key, recursive(value)]));
  }

  return recursive(layout);
}

function getNeededContentDependencyNames(contentDependencies, name) {
  const set = new Set();

  function recursive(name) {
    const contentFunction = contentDependencies[name];
    for (const dependencyName of contentFunction?.contentDependencies ?? []) {
      recursive(dependencyName);
    }
    set.add(name);
  }

  recursive(name);

  return set;
}

export function quickEvaluate({
  contentDependencies: allContentDependencies,
  extraDependencies: allExtraDependencies,

  name,
  args,
}) {
  const treeInfo = getRelationsTree(allContentDependencies, name, ...args);
  const flatTreeInfo = flattenRelationsTree(treeInfo);
  const {root, relationIdentifier, flatRelationSlots} = flatTreeInfo;

  const neededContentDependencyNames =
    getNeededContentDependencyNames(allContentDependencies, name);

  // Content functions aren't recursive, so by following the set above
  // sequentually, we will always provide fulfilled content functions as the
  // dependencies for later content functions.
  const fulfilledContentDependencies = {};
  for (const name of neededContentDependencyNames) {
    const unfulfilledContentFunction = allContentDependencies[name];
    if (!unfulfilledContentFunction) continue;

    const {contentDependencies, extraDependencies} = unfulfilledContentFunction;

    if (empty(contentDependencies) && empty(extraDependencies)) {
      fulfilledContentDependencies[name] = unfulfilledContentFunction;
      continue;
    }

    const fulfillments = {};

    for (const dependencyName of contentDependencies ?? []) {
      if (dependencyName in fulfilledContentDependencies) {
        fulfillments[dependencyName] =
          fulfilledContentDependencies[dependencyName];
      }
    }

    for (const dependencyName of extraDependencies ?? []) {
      if (dependencyName in allExtraDependencies) {
        fulfillments[dependencyName] =
          allExtraDependencies[dependencyName];
      }
    }

    fulfilledContentDependencies[name] =
      unfulfilledContentFunction.fulfill(fulfillments);
  }

  // There might still be unfulfilled content functions if dependencies weren't
  // provided as part of allContentDependencies or allExtraDependencies.
  // Catch and report these early, together in an aggregate error.
  const unfulfilledErrors = [];
  for (const name of neededContentDependencyNames) {
    const contentFunction = fulfilledContentDependencies[name];
    if (!contentFunction) continue;
    if (!contentFunction.fulfilled) {
      try {
        contentFunction();
      } catch (error) {
        error.message = `(${name}) ${error.message}`;
        unfulfilledErrors.push(error);
      }
    }
  }

  if (!empty(unfulfilledErrors)) {
    throw new AggregateError(unfulfilledErrors, `Content functions unfulfilled`);
  }

  const slotResults = {};

  function runContentFunction({name, args, relations}) {
    const contentFunction = fulfilledContentDependencies[name];
    const filledRelations =
      fillRelationsLayoutFromSlotResults(relationIdentifier, slotResults, relations);

    const generateArgs = [
      contentFunction.data?.(...args),
      filledRelations,
    ].filter(Boolean);

    return contentFunction(...generateArgs);
  }

  for (const slot of Object.getOwnPropertySymbols(flatRelationSlots)) {
    slotResults[slot] = runContentFunction(flatRelationSlots[slot]);
  }

  return runContentFunction(root);
}
