import {inspect as nodeInspect} from 'node:util';

import {decorateError} from '#aggregate';
import {colors, decorateTime, ENABLE_COLOR} from '#cli';
import {Tag, Template} from '#html';
import {empty} from '#sugar';

function inspect(value, opts = {}) {
  return nodeInspect(value, {colors: ENABLE_COLOR, ...opts});
}

const DECORATE_TIME = process.env.HSMUSIC_DEBUG_CONTENT_PERF === '1';

export class ContentFunctionSpecError extends Error {}

function optionalDecorateTime(prefix, dependency, fn) {
  if (DECORATE_TIME) {
    return decorateTime(`${prefix}/${dependency}`, fn);
  } else {
    return fn;
  }
}

export default function contentFunction(spec) {
  if (!spec.generate) {
    throw new ContentFunctionSpecError(`Expected generate function`);
  }

  if (spec.slots) {
    Template.validateSlotsDescription(spec.slots);
  }

  return expectExtraDependencies(spec, null);
}

contentFunction.identifyingSymbol = Symbol(`Is a content function?`);

export function expectExtraDependencies(spec, boundExtraDependencies) {
  const generate =
    (boundExtraDependencies
      ? prepareWorkingGenerateFunction(spec, boundExtraDependencies)
      : () => {
          throw new Error(`Not bound with extraDependencies yet`);
        });

  generate[contentFunction.identifyingSymbol] = true;

  const dependency = spec.generate.name;
  for (const key of ['sprawl', 'query', 'relations', 'data']) {
    if (spec[key]) {
      generate[key] = optionalDecorateTime(key, dependency, spec[key]);
    }
  }

  generate.bindExtraDependencies = (extraDependencies) =>
    expectExtraDependencies(spec, extraDependencies);

  return generate;
}

function prepareWorkingGenerateFunction(spec, boundExtraDependencies) {
  const dependency = spec.generate.name;

  let generate = ([arg1, arg2], ...extraArgs) => {
    if (spec.data && !arg1) {
      throw new Error(`Expected data`);
    }

    if (spec.data && spec.relations && !arg2) {
      throw new Error(`Expected relations`);
    }

    if (spec.relations && !arg1) {
      throw new Error(`Expected relations`);
    }

    try {
      if (spec.data && spec.relations) {
        return spec.generate(arg1, arg2, ...extraArgs, boundExtraDependencies);
      } else if (spec.data || spec.relations) {
        return spec.generate(arg1, ...extraArgs, boundExtraDependencies);
      } else {
        return spec.generate(...extraArgs, boundExtraDependencies);
      }
    } catch (caughtError) {
      const error = new Error(
        `Error generating content for ${dependency}`,
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

  generate = (baseGenerate => (...args) => {
    const result = baseGenerate(...args);

    if (result instanceof Template || result instanceof Tag) {
      if (Object.hasOwn(result, Symbol.for('hsmusic.content.via'))) {
        result[Symbol.for('hsmusic.contentFunction.via')].push(dependency);
      } else {
        result[Symbol.for('hsmusic.contentFunction.via')] = [dependency];
      }
    }

    return result;
  })(generate);

  generate = optionalDecorateTime(`generate`, dependency, generate);

  if (spec.slots) {
    let stationery = null;
    return (...args) => {
      stationery ??= boundExtraDependencies.html.stationery({
        annotation: dependency,

        // These extra slots are for the data and relations (positional) args.
        // No hacks to store them temporarily or otherwise "invisibly" alter
        // the behavior of the template description's `content`, since that
        // would be expressly against the purpose of templates!
        slots: {
          _cfArg1: {validate: v => v.isObject},
          _cfArg2: {validate: v => v.isObject},
          ...spec.slots,
        },

        content(slots) {
          const args = [slots._cfArg1, slots._cfArg2];
          return generate(args, slots);
        },
      });

      return stationery.template().slots({
        _cfArg1: args[0] ?? null,
        _cfArg2: args[1] ?? null,
      });
    };
  }

  return (...args) => generate(args);
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

export const decorateErrorWithRelationStack = (fn, traceStack) =>
  decorateError(fn, caughtError => {
    let cause = caughtError;

    for (const {name, args, traceError} of traceStack.toReversed()) {
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

  allContentDependencies = {...allContentDependencies};
  for (const [name, contentFunction] of Object.entries(allContentDependencies)) {
    allContentDependencies[name] =
      contentFunction.bindExtraDependencies(allExtraDependencies);
  }

  const slotResults = {};

  function runContentFunction({name, args, relations: layout, trace: traceStack}) {
    const callDecorated = (fn, ...args) =>
      decorateErrorWithRelationStack(fn, traceStack)(...args);

    const contentFunction = allContentDependencies[name];
    if (!contentFunction) {
      throw new Error(`Content function ${name} not listed`);
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
