import {
  annotateFunction,
  empty,
  setIntersection,
} from './util/sugar.js';

export default function contentFunction({
  contentDependencies = [],
  extraDependencies = [],

  sprawl,
  relations,
  data,
  generate,
}) {
  const expectedContentDependencyKeys = new Set(contentDependencies);
  const expectedExtraDependencyKeys = new Set(extraDependencies);

  // Initial checks. These only need to be run once per description of a
  // content function, and don't depend on any mutable context (e.g. which
  // dependencies have been fulfilled so far).

  const overlappingContentExtraDependencyKeys =
    setIntersection(expectedContentDependencyKeys, expectedExtraDependencyKeys);

  if (!empty(overlappingContentExtraDependencyKeys)) {
    throw new Error(`Overlap in content and extra dependency keys: ${[...overlappingContentExtraDependencyKeys].join(', ')}`);
  }

  if (!generate) {
    throw new Error(`Expected generate function`);
  }

  if (sprawl && !expectedExtraDependencyKeys.has('wikiData')) {
    throw new Error(`Content functions which sprawl must specify wikiData in extraDependencies`);
  }

  // Pass all the details to expectDependencies, which will recursively build
  // up a set of fulfilled dependencies and make functions like `relations`
  // and `generate` callable only with sufficient fulfilled dependencies.

  return expectDependencies({
    sprawl,
    relations,
    data,
    generate,

    expectedContentDependencyKeys,
    expectedExtraDependencyKeys,
    missingContentDependencyKeys: new Set(expectedContentDependencyKeys),
    missingExtraDependencyKeys: new Set(expectedExtraDependencyKeys),
    invalidatingDependencyKeys: new Set(),
    fulfilledDependencyKeys: new Set(),
    fulfilledDependencies: {},
  });
}

contentFunction.identifyingSymbol = Symbol(`Is a content function?`);

export function expectDependencies({
  sprawl,
  relations,
  data,
  generate,

  expectedContentDependencyKeys,
  expectedExtraDependencyKeys,
  missingContentDependencyKeys,
  missingExtraDependencyKeys,
  invalidatingDependencyKeys,
  fulfilledDependencyKeys,
  fulfilledDependencies,
}) {
  const hasSprawlFunction = !!sprawl;
  const hasRelationsFunction = !!relations;
  const hasDataFunction = !!data;

  const isInvalidated = !empty(invalidatingDependencyKeys);
  const isMissingContentDependencies = !empty(missingContentDependencyKeys);
  const isMissingExtraDependencies = !empty(missingExtraDependencyKeys);

  let wrappedGenerate;

  if (isInvalidated) {
    wrappedGenerate = function() {
      throw new Error(`Generate invalidated because unfulfilled dependencies provided: ${[...invalidatingDependencyKeys].join(', ')}`);
    };

    annotateFunction(wrappedGenerate, {name: generate, trait: 'invalidated'});
    wrappedGenerate.fulfilled = false;
  } else if (isMissingContentDependencies || isMissingExtraDependencies) {
    wrappedGenerate = function() {
      throw new Error(`Dependencies still needed: ${[...missingContentDependencyKeys, ...missingExtraDependencyKeys].join(', ')}`);
    };

    annotateFunction(wrappedGenerate, {name: generate, trait: 'unfulfilled'});
    wrappedGenerate.fulfilled = false;
  } else {
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
      throw new Error(`All dependencies already fulfilled (${generate.name})`);
    };
  }

  wrappedGenerate[contentFunction.identifyingSymbol] = true;

  if (hasSprawlFunction) {
    wrappedGenerate.sprawl = sprawl;
  }

  if (hasRelationsFunction) {
    wrappedGenerate.relations = relations;
  }

  if (hasDataFunction) {
    wrappedGenerate.data = data;
  }

  wrappedGenerate.fulfill ??= function fulfill(dependencies) {
    // To avoid unneeded destructuring, `fullfillDependencies` is a mutating
    // function. But `fulfill` itself isn't meant to mutate! We create a copy
    // of these variables, so their original values are kept for additional
    // calls to this same `fulfill`.
    const newlyMissingContentDependencyKeys = new Set(missingContentDependencyKeys);
    const newlyMissingExtraDependencyKeys = new Set(missingExtraDependencyKeys);
    const newlyInvalidatingDependencyKeys = new Set(invalidatingDependencyKeys);
    const newlyFulfilledDependencyKeys = new Set(fulfilledDependencyKeys);
    const newlyFulfilledDependencies = {...fulfilledDependencies};

    try {
      fulfillDependencies(dependencies, {
        missingContentDependencyKeys: newlyMissingContentDependencyKeys,
        missingExtraDependencyKeys: newlyMissingExtraDependencyKeys,
        invalidatingDependencyKeys: newlyInvalidatingDependencyKeys,
        fulfilledDependencyKeys: newlyFulfilledDependencyKeys,
        fulfilledDependencies: newlyFulfilledDependencies,
      });
    } catch (error) {
      error.message += ` (${generate.name})`;
      throw error;
    }

    return expectDependencies({
      sprawl,
      relations,
      data,
      generate,

      expectedContentDependencyKeys,
      expectedExtraDependencyKeys,
      missingContentDependencyKeys: newlyMissingContentDependencyKeys,
      missingExtraDependencyKeys: newlyMissingExtraDependencyKeys,
      invalidatingDependencyKeys: newlyInvalidatingDependencyKeys,
      fulfilledDependencyKeys: newlyFulfilledDependencyKeys,
      fulfilledDependencies: newlyFulfilledDependencies,
    });

  };

  Object.assign(wrappedGenerate, {
    contentDependencies: expectedContentDependencyKeys,
    extraDependencies: expectedExtraDependencyKeys,
  });

  return wrappedGenerate;
}

export function fulfillDependencies(dependencies, {
  missingContentDependencyKeys,
  missingExtraDependencyKeys,
  invalidatingDependencyKeys,
  fulfilledDependencyKeys,
  fulfilledDependencies,
}) {
  // This is a mutating function. Be aware: it WILL mutate the provided sets
  // and objects EVEN IF there are errors. This function doesn't exit early,
  // so all provided dependencies which don't have an associated error should
  // be treated as fulfilled (this is reflected via fulfilledDependencyKeys).

  const errors = [];

  for (let [key, value] of Object.entries(dependencies)) {
    if (fulfilledDependencyKeys.has(key)) {
      errors.push(new Error(`Dependency ${key} is already fulfilled`));
      continue;
    }

    const isContentKey = missingContentDependencyKeys.has(key);
    const isExtraKey = missingExtraDependencyKeys.has(key);

    if (!isContentKey && !isExtraKey) {
      errors.push(new Error(`Dependency ${key} is not expected`));
      continue;
    }

    if (value === undefined) {
      errors.push(new Error(`Dependency ${key} was provided undefined`));
      continue;
    }

    const isContentFunction = !!value?.[contentFunction.identifyingSymbol];

    if (isContentKey) {
      if (!isContentFunction) {
        errors.push(new Error(`Content dependency ${key} is not a content function (got ${value})`));
        continue;
      }

      if (!value.fulfilled) {
        invalidatingDependencyKeys.add(key);
      }

      missingContentDependencyKeys.delete(key);
    } else if (isExtraKey) {
      if (isContentFunction) {
        errors.push(new Error(`Extra dependency ${key} is a content function`));
        continue;
      }

      missingExtraDependencyKeys.delete(key);
    }

    fulfilledDependencyKeys.add(key);
    fulfilledDependencies[key] = value;
  }

  if (!empty(errors)) {
    throw new AggregateError(errors, `Errors fulfilling dependencies`);
  }
}

export function getRelationsTree(dependencies, contentFunctionName, wikiData, ...args) {
  const relationIdentifier = Symbol('Relation');

  function recursive(contentFunctionName, ...args) {
    const contentFunction = dependencies[contentFunctionName];
    if (!contentFunction) {
      throw new Error(`Couldn't find dependency ${contentFunctionName}`);
    }

    if (!contentFunction.relations) {
      return null;
    }

    const listedDependencies = new Set(contentFunction.contentDependencies);

    // TODO: Evaluating a sprawl might belong somewhere better than here, lol...
    const sprawl =
      (contentFunction.sprawl
        ? contentFunction.sprawl(wikiData, ...args)
        : null)

    const relationSlots = {};

    const relationSymbolMessage = (() => {
      let num = 1;
      return name => `#${num++} ${name}`;
    })();

    const relationFunction = (name, ...args) => {
      if (!listedDependencies.has(name)) {
        throw new Error(`Called relation('${name}') but ${contentFunctionName} doesn't list that dependency`);
      }

      const relationSymbol = Symbol(relationSymbolMessage(name));
      relationSlots[relationSymbol] = {name, args};
      return {[relationIdentifier]: relationSymbol};
    };

    const relationsLayout =
      (sprawl
        ? contentFunction.relations(relationFunction, sprawl, ...args)
        : contentFunction.relations(relationFunction, ...args))

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

  if (relationsTree) {
    recursive(relationsTree);
  }

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
      throw new Error(`Expected primitive, array, relation, or normal {key: value} style Object, got constructor ${object.constructor?.name}`);
    }

    return Object.fromEntries(
      Object.entries(object)
        .map(([key, value]) => [key, recursive(value)]));
  }

  return recursive(layout);
}

export function getNeededContentDependencyNames(contentDependencies, name) {
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
  args = [],
  multiple = null,
  postprocess = null,
}) {
  if (multiple !== null) {
    return multiple.map(opts =>
      quickEvaluate({
        contentDependencies: allContentDependencies,
        extraDependencies: allExtraDependencies,

        ...opts,
        name: opts.name ?? name,
        args: opts.args ?? args,
        postprocess: opts.postprocess ?? postprocess,
      }));
  }

  const treeInfo = getRelationsTree(allContentDependencies, name, allExtraDependencies.wikiData ?? {}, ...args);
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
  const unfulfilledNames = [];
  for (const name of neededContentDependencyNames) {
    const contentFunction = fulfilledContentDependencies[name];
    if (!contentFunction) continue;
    if (!contentFunction.fulfilled) {
      try {
        contentFunction();
      } catch (error) {
        error.message = `(${name}) ${error.message}`;
        unfulfilledErrors.push(error);
        unfulfilledNames.push(name);
      }
    }
  }

  if (!empty(unfulfilledErrors)) {
    throw new AggregateError(unfulfilledErrors, `Content functions unfulfilled (${unfulfilledNames.join(', ')})`);
  }

  const slotResults = {};

  function runContentFunction({name, args, relations: flatRelations}) {
    const contentFunction = fulfilledContentDependencies[name];

    if (!contentFunction) {
      throw new Error(`Content function ${name} unfulfilled or not listed`);
    }

    const sprawl =
      contentFunction.sprawl?.(allExtraDependencies.wikiData, ...args);

    const relations =
      fillRelationsLayoutFromSlotResults(relationIdentifier, slotResults, flatRelations);

    const data =
      (sprawl
        ? contentFunction.data?.(sprawl, ...args)
        : contentFunction.data?.(...args));

    const generateArgs = [data, relations].filter(Boolean);

    return contentFunction(...generateArgs);
  }

  for (const slot of Object.getOwnPropertySymbols(flatRelationSlots)) {
    slotResults[slot] = runContentFunction(flatRelationSlots[slot]);
  }

  const topLevelResult = runContentFunction(root);

  if (postprocess !== null) {
    return postprocess(topLevelResult);
  } else {
    return topLevelResult;
  }
}
