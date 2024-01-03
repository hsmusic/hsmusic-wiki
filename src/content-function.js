import {inspect as nodeInspect} from 'node:util';

import {colors, ENABLE_COLOR} from '#cli';
import {Template} from '#html';

import {
  annotateFunction,
  decorateError,
  empty,
  setIntersection,
} from '#sugar';

function inspect(value, opts = {}) {
  return nodeInspect(value, {colors: ENABLE_COLOR, ...opts});
}

export class ContentFunctionSpecError extends Error {}

export default function contentFunction({
  contentDependencies = [],
  extraDependencies = [],

  slots,
  sprawl,
  query,
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
    throw new ContentFunctionSpecError(`Overlap in content and extra dependency keys: ${[...overlappingContentExtraDependencyKeys].join(', ')}`);
  }

  if (!generate) {
    throw new ContentFunctionSpecError(`Expected generate function`);
  }

  if (sprawl && !expectedExtraDependencyKeys.has('wikiData')) {
    throw new ContentFunctionSpecError(`Content functions which sprawl must specify wikiData in extraDependencies`);
  }

  if (slots && !expectedExtraDependencyKeys.has('html')) {
    throw new ContentFunctionSpecError(`Content functions with slots must specify html in extraDependencies`);
  }

  if (slots) {
    Template.validateSlotsDescription(slots);
  }

  // Pass all the details to expectDependencies, which will recursively build
  // up a set of fulfilled dependencies and make functions like `relations`
  // and `generate` callable only with sufficient fulfilled dependencies.

  return expectDependencies({
    slots,
    sprawl,
    query,
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
  slots,
  sprawl,
  query,
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
  const hasQueryFunction = !!query;
  const hasRelationsFunction = !!relations;
  const hasDataFunction = !!data;
  const hasSlotsDescription = !!slots;

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
    const callUnderlyingGenerate = ([arg1, arg2], ...extraArgs) => {
      if (hasDataFunction && !arg1) {
        throw new Error(`Expected data`);
      }

      if (hasDataFunction && hasRelationsFunction && !arg2) {
        throw new Error(`Expected relations`);
      }

      if (hasRelationsFunction && !arg1) {
        throw new Error(`Expected relations`);
      }

      try {
        if (hasDataFunction && hasRelationsFunction) {
          return generate(arg1, arg2, ...extraArgs, fulfilledDependencies);
        } else if (hasDataFunction || hasRelationsFunction) {
          return generate(arg1, ...extraArgs, fulfilledDependencies);
        } else {
          return generate(...extraArgs, fulfilledDependencies);
        }
      } catch (caughtError) {
        const error = new Error(
          `Error generating content for ${generate.name}`,
          {cause: caughtError});

        error[Symbol.for(`hsmusic.aggregate.alwaysTrace`)] = true;
        error[Symbol.for(`hsmusic.aggregate.traceFrom`)] = caughtError;

        error[Symbol.for(`hsmusic.aggregate.unhelpfulTraceLines`)] = [
          /content-function\.js/,
          /util\/html\.js/,
        ];

        error[Symbol.for(`hsmusic.aggregate.helpfulTraceLines`)] = [
          /content\/dependencies\/(.*\.js:.*(?=\)))/,
        ];

        throw error;
      }
    };

    if (hasSlotsDescription) {
      const stationery = fulfilledDependencies.html.stationery({
        annotation: generate.name,

        // These extra slots are for the data and relations (positional) args.
        // No hacks to store them temporarily or otherwise "invisibly" alter
        // the behavior of the template description's `content`, since that
        // would be expressly against the purpose of templates!
        slots: {
          _cfArg1: {validate: v => v.isObject},
          _cfArg2: {validate: v => v.isObject},
          ...slots,
        },

        content(slots) {
          const args = [slots._cfArg1, slots._cfArg2];
          return callUnderlyingGenerate(args, slots);
        },
      });

      wrappedGenerate = function(...args) {
        return stationery.template().slots({
          _cfArg1: args[0] ?? null,
          _cfArg2: args[1] ?? null,
        });
      };
    } else {
      wrappedGenerate = function(...args) {
        return callUnderlyingGenerate(args);
      };
    }

    wrappedGenerate.fulfill = function() {
      throw new Error(`All dependencies already fulfilled (${generate.name})`);
    };

    annotateFunction(wrappedGenerate, {name: generate, trait: 'fulfilled'});
    wrappedGenerate.fulfilled = true;
  }

  wrappedGenerate[contentFunction.identifyingSymbol] = true;

  if (hasSprawlFunction) {
    wrappedGenerate.sprawl = sprawl;
  }

  if (hasQueryFunction) {
    wrappedGenerate.query = query;
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
      slots,
      sprawl,
      query,
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

    const isContentFunction =
      !!value?.[contentFunction.identifyingSymbol];

    const isFulfilledContentFunction =
      isContentFunction && value.fulfilled;

    if (isContentKey) {
      if (!isContentFunction) {
        errors.push(new Error(`Content dependency ${key} is not a content function (got ${value})`));
        continue;
      }

      if (!isFulfilledContentFunction) {
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

export function getArgsForRelationsAndData(contentFunction, wikiData, ...args) {
  const insertArgs = [];

  if (contentFunction.sprawl) {
    insertArgs.push(contentFunction.sprawl(wikiData, ...args));
  }

  if (contentFunction.query) {
    insertArgs.unshift(contentFunction.query(...insertArgs, ...args));
  }

  // Note: Query is generally intended to "filter" the provided args/sprawl,
  // so in most cases it shouldn't be necessary to access the original args
  // or sprawl afterwards. These are left available for now (as the second
  // and later arguments in relations/data), but if they don't find any use,
  // we can refactor this step to remove them.

  return [...insertArgs, ...args];
}

export function getRelationsTree(dependencies, contentFunctionName, wikiData, ...args) {
  const relationIdentifier = Symbol('Relation');

  function recursive(contentFunctionName, args, traceStack) {
    const contentFunction = dependencies[contentFunctionName];
    if (!contentFunction) {
      throw new Error(`Couldn't find dependency ${contentFunctionName}`);
    }

    // TODO: It's a bit awkward to pair this list of arguments with the output of
    // getRelationsTree, but we do need to evaluate it right away (for the upcoming
    // call to relations), and we're going to be reusing the same results for a
    // later call to data (outside of getRelationsTree). There might be a nicer way
    // of handling this.
    const argsForRelationsAndData =
      decorateErrorWithRelationStack(getArgsForRelationsAndData, traceStack)
        (contentFunction, wikiData, ...args);

    const result = {
      name: contentFunctionName,
      args: argsForRelationsAndData,
      trace: traceStack,
    };

    if (contentFunction.relations) {
      const listedDependencies = new Set(contentFunction.contentDependencies);

      // Note: "slots" here is a completely separate concept from HTML template
      // slots, which are handled completely within the content function. Here,
      // relation slots are just references to a position within the relations
      // layout that are referred to by a symbol - when the relation is ready,
      // its result will be "slotted" into the layout.
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
        const traceError = new Error();

        relationSlots[relationSymbol] = {name, args, traceError};

        return {[relationIdentifier]: relationSymbol};
      };

      const relationsLayout =
        contentFunction.relations(relationFunction, ...argsForRelationsAndData);

      const relationsTree = Object.fromEntries(
        Object.getOwnPropertySymbols(relationSlots)
          .map(symbol => [symbol, relationSlots[symbol]])
          .map(([symbol, {name, args, traceError}]) => [
            symbol,
            recursive(name, args, [...traceStack, {name, args, traceError}]),
          ]));

      result.relations = {
        layout: relationsLayout,
        slots: relationSlots,
        tree: relationsTree,
      };
    }

    return result;
  }

  const root =
    recursive(contentFunctionName, args,
      [{name: contentFunctionName, args, traceError: new Error()}]);

  return {root, relationIdentifier};
}

export function flattenRelationsTree({root, relationIdentifier}) {
  const flatRelationSlots = {};

  function recursive(node) {
    const flatNode = {
      name: node.name,
      args: node.args,
      trace: node.trace,
      relations: node.relations?.layout ?? null,
    };

    if (node.relations) {
      const {tree, slots} = node.relations;
      for (const slot of Object.getOwnPropertySymbols(slots)) {
        flatRelationSlots[slot] = recursive(tree[slot]);
      }
    }

    return flatNode;
  }

  return {
    root: recursive(root, []),
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

export const decorateErrorWithRelationStack = (fn, traceStack) =>
  decorateError(fn, (caughtError, ...args) => {
    let cause = caughtError;

    for (const {name, args, traceError} of traceStack.slice().reverse()) {
      const nameText = colors.green(`"${name}"`);
      const namePart = `Error in relation(${nameText})`;

      const argsPart =
        (empty(args)
          ? ``
          : ` called with args: ${inspect(args)}`);

      const error = new Error(namePart + argsPart, {cause});

      error[Symbol.for('hsmusic.aggregate.alwaysTrace')] = true;
      error[Symbol.for('hsmusic.aggregate.traceFrom')] = traceError;

      error[Symbol.for(`hsmusic.aggregate.unhelpfulTraceLines`)] = [
        /content-function\.js/,
        /util\/html\.js/,
      ];

      error[Symbol.for(`hsmusic.aggregate.helpfulTraceLines`)] = [
        /content\/dependencies\/(.*\.js:.*(?=\)))/,
      ];

      cause = error;
    }

    return cause;
  });

export function quickEvaluate({
  contentDependencies: allContentDependencies,
  extraDependencies: allExtraDependencies,

  name,
  args = [],
  slots = null,
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
        slots: opts.slots ?? slots,
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

  function runContentFunction({name, args, relations: layout, trace: traceStack}) {
    const callDecorated = (fn, ...args) =>
      decorateErrorWithRelationStack(fn, traceStack)(...args);

    const contentFunction = fulfilledContentDependencies[name];

    if (!contentFunction) {
      throw new Error(`Content function ${name} unfulfilled or not listed`);
    }

    const generateArgs = [];

    if (contentFunction.data) {
      generateArgs.push(callDecorated(contentFunction.data, ...args));
    }

    if (layout) {
      generateArgs.push(fillRelationsLayoutFromSlotResults(relationIdentifier, slotResults, layout));
    }

    return callDecorated(contentFunction, ...generateArgs);
  }

  for (const slot of Object.getOwnPropertySymbols(flatRelationSlots)) {
    slotResults[slot] = runContentFunction(flatRelationSlots[slot]);
  }

  let topLevelResult = runContentFunction(root);

  if (slots) {
    topLevelResult.setSlots(slots);
  }

  if (postprocess) {
    topLevelResult = postprocess(topLevelResult);
  }

  return topLevelResult;
}
