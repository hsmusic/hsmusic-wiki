import {inspect} from 'node:util';

import {color} from '#cli';
import find from '#find';
import {filterMultipleArrays} from '#wiki-data';

import {
  empty,
  filterProperties,
  openAggregate,
  stitchArrays,
} from '#sugar';

import Thing from './thing.js';

// Composes multiple compositional "steps" and a "base" to form a property
// descriptor out of modular building blocks. This is an extension to the
// more general-purpose CacheableObject property descriptor syntax, and
// aims to make modular data processing - which lends to declarativity -
// much easier, without fundamentally altering much of the typical syntax
// or terminology, nor building on it to an excessive degree.
//
// Think of a composition as being a chain of steps which lead into a final
// base property, which is usually responsible for returning the value that
// will actually get exposed when the property being described is accessed.
//
// == The compositional base: ==
//
// The final item in a compositional list is its base, and it identifies
// the essential qualities of the property descriptor. The compositional
// steps preceding it may exit early, in which case the expose function
// defined on the base won't be called; or they will provide dependencies
// that the base may use to compute the final value that gets exposed for
// this property.
//
// The base indicates the capabilities of the composition as a whole.
// It should be {expose: true}, since that's the only area that preceding
// compositional steps (currently) can actually influence. If it's also
// {update: true}, then the composition as a whole accepts an update value
// just like normal update-flag property descriptors - meaning it can be
// set with `thing.someProperty = value` and that value will be paseed
// into each (implementing) step's transform() function, as well as the
// base. Bases usually aren't {compose: true}, but can be - check out the
// section on "nesting compositions" for details about that.
//
// Every composition always has exactly one compositional base, and it's
// always the last item in the composition list. All items preceding it
// are compositional steps, described below.
//
// == Compositional steps: ==
//
// Compositional steps are, in essence, typical property descriptors with
// the extra flag {compose: true}. They operate on existing dependencies,
// and are typically dynamically constructed by "utility" functions (but
// can also be manually declared within the step list of a composition).
// Compositional steps serve two purposes:
//
//  1. exit early, if some condition is matched, returning and exposing
//     some value directly from that step instead of continuing further
//     down the step list;
//
//  2. and/or provide new, dynamically created "private" dependencies which
//     can be accessed by further steps down the list, or at the base at
//     the bottom, modularly supplying information that will contribute to
//     the final value exposed for this property.
//
// Usually it's just one of those two, but it's fine for a step to perform
// both jobs if the situation benefits.
//
// Compositional steps are the real "modular" or "compositional" part of
// this data processing style - they're designed to be combined together
// in dynamic, versatile ways, as each property demands it. You usually
// define a compositional step to be returned by some ordinary static
// property-descriptor-returning function (customarily namespaced under
// the relevant Thing class's static `composite` field) - that lets you
// reuse it in multiple compositions later on.
//
// Compositional steps are implemented with "continuation passing style",
// meaning the connection to the next link on the chain is passed right to
// each step's compute (or transform) function, and the implementation gets
// to decide whether to continue on that chain or exit early by returning
// some other value.
//
// Every step along the chain, apart from the base at the bottom, has to
// have the {compose: true} step. That means its compute() or transform()
// function will be passed an extra argument at the end, `continuation`.
// To provide new dependencies to items further down the chain, just pass
// them directly to this continuation() function, customarily with a hash
// ('#') prefixing each name - for example:
//
//   compute({..some dependencies..}, continuation) {
//     return continuation({
//       '#excitingProperty': (..a value made from dependencies..),
//     });
//   }
//
// Performing an early exit is as simple as returning some other value,
// instead of the continuation. You may also use `continuation.exit(value)`
// to perform the exact same kind of early exit - it's just a different
// syntax that might fit in better in certain longer compositions.
//
// It may be fine to simply provide new dependencies under a hard-coded
// name, such as '#excitingProperty' above, but if you're writing a utility
// that dynamically returns the compositional step and you suspect you
// might want to use this step multiple times in a single composition,
// it's customary to accept a name for the result.
//
// Here's a detailed example showing off early exit, dynamically operating
// on a provided dependency name, and then providing a result in another
// also-provided dependency name:
//
//   static Thing.composite.withResolvedContribs = ({
//     from: contribsByRefDependency,
//     to: outputDependency,
//   }) => ({
//     flags: {expose: true, compose: true},
//     expose: {
//       dependencies: [contribsByRefDependency, 'artistData'],
//       compute({
//         [contribsByRefDependency]: contribsByRef,
//         artistData,
//       }, continuation) {
//         if (!artistData) return null;  /* early exit! */
//         return continuation({
//           [outputDependency]:  /* this is the important part */
//             (..resolve contributions one way or another..),
//         });
//       },
//     },
//   });
//
// And how you might work that into a composition:
//
//   static Track[Thing.getPropertyDescriptors].coverArtists =
//     Thing.composite.from([
//       Track.composite.doSomethingWhichMightEarlyExit(),
//       Thing.composite.withResolvedContribs({
//         from: 'coverArtistContribsByRef',
//         to: '#coverArtistContribs',
//       }),
//
//       {
//         flags: {expose: true},
//         expose: {
//           dependencies: ['#coverArtistContribs'],
//           compute({'#coverArtistContribs': coverArtistContribs}) {
//             return coverArtistContribs.map(({who}) => who);
//           },
//         },
//       },
//     ]);
//
// One last note! A super common code pattern when creating more complex
// compositions is to have several steps which *only* expose and compose.
// As a syntax shortcut, you can skip the outer section. It's basically
// like writing out just the {expose: {...}} part. Remember that this
// indicates that the step you're defining is compositional, so you have
// to specify the flags manually for the base, even if this property isn't
// going to get an {update: true} flag.
//
// == Cache-safe dependency names: ==
//
// [Disclosure: The caching engine hasn't actually been implemented yet.
//  As such, this section is subject to change, and simply provides sound
//  forward-facing advice and interfaces.]
//
// It's a good idea to write individual compositional steps in such a way
// that they're "cache-safe" - meaning the same input (dependency) values
// will always result in the same output (continuation or early exit).
//
// In order to facilitate this, compositional step descriptors may specify
// unique `mapDependencies`, `mapContinuation`, and `options` values.
//
// Consider the `withResolvedContribs` example adjusted to make use of
// two of these options below:
//
//   static Thing.composite.withResolvedContribs = ({
//     from: contribsByRefDependency,
//     to: outputDependency,
//   }) => ({
//     flags: {expose: true, compose: true},
//     expose: {
//       dependencies: ['artistData'],
//       mapDependencies: {contribsByRef: contribsByRefDependency},
//       mapContinuation: {outputDependency},
//       compute({
//         contribsByRef, /* no longer in square brackets */
//         artistData,
//       }, continuation) {
//         if (!artistData) return null;
//         return continuation({
//           outputDependency: /* no longer in square brackets */
//             (..resolve contributions one way or another..),
//         });
//       },
//     },
//   });
//
// With a little destructuring and restructuring JavaScript sugar, the
// above can be simplified some more:
//
//   static Thing.composite.withResolvedContribs = ({from, to}) => ({
//     flags: {expose: true, compose: true},
//     expose: {
//       dependencies: ['artistData'],
//       mapDependencies: {from},
//       mapContinuation: {to},
//       compute({artistData, from: contribsByRef}, continuation) {
//         if (!artistData) return null;
//         return continuation({
//           to: (..resolve contributions one way or another..),
//         });
//       },
//     },
//   });
//
// These two properties let you separate the name-mapping behavior (for
// dependencies and the continuation) from the main body of the compute
// function. That means the compute function will *always* get inputs in
// the same form (dependencies 'artistData' and 'from' above), and will
// *always* provide its output in the same form (early return or 'to').
//
// Thanks to that, this `compute` function is cache-safe! Its outputs can
// be cached corresponding to each set of mapped inputs. So it won't matter
// whether the `from` dependency is named `coverArtistContribsByRef` or
// `contributorContribsByRef` or something else - the compute function
// doesn't care, and only expects that value to be provided via its `from`
// argument. Likewise, it doesn't matter if the output should be sent to
// '#coverArtistContribs` or `#contributorContribs` or some other name;
// the mapping is handled automatically outside, and compute will always
// output its value to the continuation's `to`.
//
// Note that `mapDependencies` and `mapContinuation` should be objects of
// the same "shape" each run - that is, the values will change depending on
// outside context, but the keys are always the same. You shouldn't use
// `mapDependencies` to dynamically select more or fewer dependencies.
// If you need to dynamically select a range of dependencies, just specify
// them in the `dependencies` array like usual. The caching engine will
// understand that differently named `dependencies` indicate separate
// input-output caches should be used.
//
// The 'options' property makes it possible to specify external arguments
// that fundamentally change the behavior of the `compute` function, while
// still remaining cache-safe. It indicates that the caching engine should
// use a completely different input-to-output cache for each permutation
// of the 'options' values. This way, those functions are still cacheable
// at all; they'll just be cached separately for each set of option values.
// Values on the 'options' property will always be provided in compute's
// dependencies under '#options' (to avoid name conflicts with other
// dependencies).
//
// == To compute or to transform: ==
//
// A compositional step can work directly on a property's stored update
// value, transforming it in place and either early exiting with it or
// passing it on (via continuation) to the next item(s) in the
// compositional step list. (If needed, these can provide dependencies
// the same way as compute functions too - just pass that object after
// the updated (or same) transform value in your call to continuation().)
//
// But in order to make them more versatile, compositional steps have an
// extra trick up their sleeve. If a compositional step implements compute
// and *not* transform, it can still be used in a composition targeting a
// property which updates! These retain their full dependency-providing and
// early exit functionality - they just won't be provided the update value.
// If a compute-implementing step returns its continuation, then whichever
// later step (or the base) next implements transform() will receive the
// update value that had so far been running - as well as any dependencies
// the compute() step returned, of course!
//
// Please note that a compositional step which transforms *should not*
// specify, in its flags, {update: true}. Just provide the transform()
// function in its expose descriptor; it will be automatically detected
// and used when appropriate.
//
// It's actually possible for a step to specify both transform and compute,
// in which case the transform() implementation will only be selected if
// the composition's base is {update: true}. It's not exactly known why you
// would want to specify unique-but-related transform and compute behavior,
// but the basic possibility was too cool to skip out on.
//
// == Nesting compositions: ==
//
// Compositional steps are so convenient that you just might want to bundle
// them together, and form a whole new step-shaped unit of its own!
//
// In order to allow for this while helping to ensure internal dependencies
// remain neatly isolated from the composition which nests your bundle,
// the Thing.composite.from() function will accept and adapt to a base that
// specifies the {compose: true} flag, just like the steps preceding it.
//
// The continuation function that gets provided to the base will be mildly
// special - after all, nothing follows the base within the composition's
// own list! Instead of appending dependencies alongside any previously
// provided ones to be available to the next step, the base's continuation
// function should be used to define "exports" of the composition as a
// whole. It's similar to the usual behavior of the continuation, just
// expanded to the scope of the composition instead of following steps.
//
// For example, suppose your composition (which you expect to include in
// other compositions) brings about several private, hash-prefixed
// dependencies to contribute to its own results. Those dependencies won't
// end up "bleeding" into the dependency list of whichever composition is
// nesting this one - they will totally disappear once all the steps in
// the nested composition have finished up.
//
// To "export" the results of processing all those dependencies (provided
// that's something you want to do and this composition isn't used purely
// for a conditional early-exit), you'll want to define them in the
// continuation passed to the base. (Customarily, those should start with
// a hash just like the exports from any other compositional step; they're
// still dynamically provided dependencies!)
//
// Another way to "export" dependencies is by using calling *any* step's
// `continuation.raise()` function. This is sort of like early exiting,
// but instead of quitting out the whole entire property, it will just
// break out of the current, nested composition's list of steps, acting
// as though the composition had finished naturally. The dependencies
// passed to `raise` will be the ones which get exported.
//
// Since `raise` is another way to export dependencies, if you're using
// dynamic export names, you should specify `mapContinuation` on the step
// calling `continuation.raise` as well.
//
// An important note on `mapDependencies` here: A nested composition gets
// free access to all the ordinary properties defined on the thing it's
// working on, but if you want it to depend on *private* dependencies -
// ones prefixed with '#' - which were provided by some other compositional
// step preceding wherever this one gets nested, then you *have* to use
// `mapDependencies` to gain access. Check out the section on "cache-safe
// dependency names" for information on this syntax!
//
// Also - on rare occasion - you might want to make a reusable composition
// that itself causes the composition *it's* nested in to raise. If that's
// the case, give `composition.raiseAbove()` a go! This effectively means
// kicking out of *two* layers of nested composition - the one including
// the step with the `raiseAbove` call, and the composition which that one
// is nested within. You don't need to use `raiseAbove` if the reusable
// utility function just returns a single compositional step, but if you
// want to make use of other compositional steps, it gives you access to
// the same conditional-raise capabilities.
//
// Have some syntax sugar! Since nested compositions are defined by having
// the base be {compose: true}, the composition will infer as much if you
// don't specifying the base's flags at all. Simply use the same shorthand
// syntax as for other compositional steps, and it'll work out cleanly!
//

export {compositeFrom as from};
function compositeFrom(firstArg, secondArg) {
  const debug = fn => {
    if (compositeFrom.debug === true) {
      const label =
        (annotation
          ? color.dim(`[composite: ${annotation}]`)
          : color.dim(`[composite]`));
      const result = fn();
      if (Array.isArray(result)) {
        console.log(label, ...result.map(value =>
          (typeof value === 'object'
            ? inspect(value, {depth: 0, colors: true, compact: true, breakLength: Infinity})
            : value)));
      } else {
        console.log(label, result);
      }
    }
  };

  let annotation, composition;
  if (typeof firstArg === 'string') {
    [annotation, composition] = [firstArg, secondArg];
  } else {
    [annotation, composition] = [null, firstArg];
  }

  const base = composition.at(-1);
  const steps = composition.slice();

  const aggregate = openAggregate({
    message:
      `Errors preparing Thing.composite.from() composition` +
      (annotation ? ` (${annotation})` : ''),
  });

  const baseExposes =
    (base.flags
      ? base.flags.expose
      : true);

  const baseUpdates =
    (base.flags
      ? base.flags.update
      : false);

  const baseComposes =
    (base.flags
      ? base.flags.compose
      : true);

  if (!baseExposes) {
    aggregate.push(new TypeError(`All steps, including base, must expose`));
  }

  const exposeDependencies = new Set();

  let anyStepsCompute = false;
  let anyStepsTransform = false;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const isBase = i === steps.length - 1;
    const message =
      `Errors in step #${i + 1}` +
      (isBase ? ` (base)` : ``) +
      (step.annotation ? ` (${step.annotation})` : ``);

    aggregate.nest({message}, ({push}) => {
      if (step.flags) {
        let flagsErrored = false;

        if (!step.flags.compose && !isBase) {
          push(new TypeError(`All steps but base must compose`));
          flagsErrored = true;
        }

        if (!step.flags.expose) {
          push(new TypeError(`All steps must expose`));
          flagsErrored = true;
        }

        if (flagsErrored) {
          return;
        }
      }

      const expose =
        (step.flags
          ? step.expose
          : step);

      const stepComputes = !!expose.compute;
      const stepTransforms = !!expose.transform;

      if (!stepComputes && !stepTransforms) {
        push(new TypeError(`Steps must provide compute or transform (or both)`));
        return;
      }

      if (
        stepTransforms && !stepComputes &&
        !baseUpdates && !baseComposes
      ) {
        push(new TypeError(`Steps which only transform can't be composed with a non-updating base`));
        return;
      }

      if (stepComputes) {
        anyStepsCompute = true;
      }

      if (stepTransforms) {
        anyStepsTransform = true;
      }

      // Unmapped dependencies are exposed on the final composition only if
      // they're "public", i.e. pointing to update values of other properties
      // on the CacheableObject.
      for (const dependency of expose.dependencies ?? []) {
        if (typeof dependency === 'string' && dependency.startsWith('#')) {
          continue;
        }

        exposeDependencies.add(dependency);
      }

      // Mapped dependencies are always exposed on the final composition.
      // These are explicitly for reading values which are named outside of
      // the current compositional step.
      for (const dependency of Object.values(expose.mapDependencies ?? {})) {
        exposeDependencies.add(dependency);
      }
    });
  }

  if (!baseComposes) {
    if (baseUpdates) {
      if (!anyStepsTransform) {
        aggregate.push(new TypeError(`Expected at least one step to transform`));
      }
    } else {
      if (!anyStepsCompute) {
        aggregate.push(new TypeError(`Expected at least one step to compute`));
      }
    }
  }

  aggregate.close();

  function _filterDependencies(availableDependencies, {
    dependencies,
    mapDependencies,
    options,
  }) {
    if (!dependencies && !mapDependencies && !options) {
      return null;
    }

    const filteredDependencies =
      (dependencies
        ? filterProperties(availableDependencies, dependencies)
        : {});

    if (mapDependencies) {
      for (const [to, from] of Object.entries(mapDependencies)) {
        filteredDependencies[to] = availableDependencies[from] ?? null;
      }
    }

    if (options) {
      filteredDependencies['#options'] = options;
    }

    return filteredDependencies;
  }

  function _assignDependencies(continuationAssignment, {mapContinuation}) {
    if (!mapContinuation) {
      return continuationAssignment;
    }

    const assignDependencies = {};

    for (const [from, to] of Object.entries(mapContinuation)) {
      assignDependencies[to] = continuationAssignment[from] ?? null;
    }

    return assignDependencies;
  }

  function _prepareContinuation(callingTransformForThisStep) {
    const continuationStorage = {
      returnedWith: null,
      providedDependencies: undefined,
      providedValue: undefined,
    };

    const continuation =
      (callingTransformForThisStep
        ? (providedValue, providedDependencies = null) => {
            continuationStorage.returnedWith = 'continuation';
            continuationStorage.providedDependencies = providedDependencies;
            continuationStorage.providedValue = providedValue;
            return continuationSymbol;
          }
        : (providedDependencies = null) => {
            continuationStorage.returnedWith = 'continuation';
            continuationStorage.providedDependencies = providedDependencies;
            return continuationSymbol;
          });

    continuation.exit = (providedValue) => {
      continuationStorage.returnedWith = 'exit';
      continuationStorage.providedValue = providedValue;
      return continuationSymbol;
    };

    if (baseComposes) {
      const makeRaiseLike = returnWith =>
        (callingTransformForThisStep
          ? (providedValue, providedDependencies = null) => {
              continuationStorage.returnedWith = returnWith;
              continuationStorage.providedDependencies = providedDependencies;
              continuationStorage.providedValue = providedValue;
              return continuationSymbol;
            }
          : (providedDependencies = null) => {
              continuationStorage.returnedWith = returnWith;
              continuationStorage.providedDependencies = providedDependencies;
              return continuationSymbol;
            });

      continuation.raise = makeRaiseLike('raise');
      continuation.raiseAbove = makeRaiseLike('raiseAbove');
    }

    return {continuation, continuationStorage};
  }

  const continuationSymbol = Symbol('continuation symbol');
  const noTransformSymbol = Symbol('no-transform symbol');

  function _computeOrTransform(initialValue, initialDependencies, continuationIfApplicable) {
    const expectingTransform = initialValue !== noTransformSymbol;

    let valueSoFar =
      (expectingTransform
        ? initialValue
        : undefined);

    const availableDependencies = {...initialDependencies};

    if (expectingTransform) {
      debug(() => [color.bright(`begin composition - transforming from:`), initialValue]);
    } else {
      debug(() => color.bright(`begin composition - not transforming`));
    }

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const isBase = i === steps.length - 1;

      debug(() => [
        `step #${i+1}` +
        (isBase
          ? ` (base):`
          : ` of ${steps.length}:`),
        step]);

      const expose =
        (step.flags
          ? step.expose
          : step);

      const callingTransformForThisStep =
        expectingTransform && expose.transform;

      const filteredDependencies = _filterDependencies(availableDependencies, expose);
      const {continuation, continuationStorage} = _prepareContinuation(callingTransformForThisStep);

      debug(() => [
        `step #${i+1} - ${callingTransformForThisStep ? 'transform' : 'compute'}`,
        `with dependencies:`, filteredDependencies]);

      const result =
        (callingTransformForThisStep
          ? (filteredDependencies
              ? expose.transform(valueSoFar, filteredDependencies, continuation)
              : expose.transform(valueSoFar, continuation))
          : (filteredDependencies
              ? expose.compute(filteredDependencies, continuation)
              : expose.compute(continuation)));

      if (result !== continuationSymbol) {
        debug(() => [`step #${i+1} - result: exit (inferred) ->`, result]);

        if (baseComposes) {
          throw new TypeError(`Inferred early-exit is disallowed in nested compositions`);
        }

        debug(() => color.bright(`end composition - exit (inferred)`));

        return result;
      }

      const {returnedWith} = continuationStorage;

      if (returnedWith === 'exit') {
        const {providedValue} = continuationStorage;

        debug(() => [`step #${i+1} - result: exit (explicit) ->`, providedValue]);
        debug(() => color.bright(`end composition - exit (explicit)`));

        if (baseComposes) {
          return continuationIfApplicable.exit(providedValue);
        } else {
          return providedValue;
        }
      }

      const {providedValue, providedDependencies} = continuationStorage;

      const continuingWithValue =
        (expectingTransform
          ? (callingTransformForThisStep
              ? providedValue ?? null
              : valueSoFar ?? null)
          : undefined);

      const continuingWithDependencies =
        (providedDependencies
          ? _assignDependencies(providedDependencies, expose)
          : null);

      const continuationArgs = [];
      if (continuingWithValue !== undefined) continuationArgs.push(continuingWithValue);
      if (continuingWithDependencies !== null) continuationArgs.push(continuingWithDependencies);

      debug(() => {
        const base = `step #${i+1} - result: ` + returnedWith;
        const parts = [];

        if (callingTransformForThisStep) {
          if (continuingWithValue === undefined) {
            parts.push(`(no value)`);
          } else {
            parts.push(`value:`, providedValue);
          }
        }

        if (continuingWithDependencies !== null) {
          parts.push(`deps:`, continuingWithDependencies);
        } else {
          parts.push(`(no deps)`);
        }

        if (empty(parts)) {
          return base;
        } else {
          return [base + ' ->', ...parts];
        }
      });

      switch (returnedWith) {
        case 'raise':
          debug(() =>
            (isBase
              ? color.bright(`end composition - raise (base: explicit)`)
              : color.bright(`end composition - raise`)));
          return continuationIfApplicable(...continuationArgs);

        case 'raiseAbove':
          debug(() => color.bright(`end composition - raiseAbove`));
          return continuationIfApplicable.raise(...continuationArgs);

        case 'continuation':
          if (isBase) {
            debug(() => color.bright(`end composition - raise (inferred)`));
            return continuationIfApplicable(...continuationArgs);
          } else {
            Object.assign(availableDependencies, continuingWithDependencies);
            break;
          }
      }
    }
  }

  const constructedDescriptor = {};

  if (annotation) {
    constructedDescriptor.annotation = annotation;
  }

  constructedDescriptor.flags = {
    update: baseUpdates,
    expose: baseExposes,
    compose: baseComposes,
  };

  if (baseUpdates) {
    constructedDescriptor.update = base.update;
  }

  if (baseExposes) {
    const expose = constructedDescriptor.expose = {};
    expose.dependencies = Array.from(exposeDependencies);

    const transformFn =
      (value, initialDependencies, continuationIfApplicable) =>
        _computeOrTransform(value, initialDependencies, continuationIfApplicable);

    const computeFn =
      (initialDependencies, continuationIfApplicable) =>
        _computeOrTransform(noTransformSymbol, initialDependencies, continuationIfApplicable);

    if (baseComposes) {
      if (anyStepsTransform) expose.transform = transformFn;
      if (anyStepsCompute) expose.compute = computeFn;
    } else if (baseUpdates) {
      expose.transform = transformFn;
    } else {
      expose.compute = computeFn;
    }
  }

  return constructedDescriptor;
}

// Evaluates a function with composite debugging enabled, turns debugging
// off again, and returns the result of the function. This is mostly syntax
// sugar, but also helps avoid unit tests avoid accidentally printing debug
// info for a bunch of unrelated composites (due to property enumeration
// when displaying an unexpected result). Use as so:
//
//   Without debugging:
//     t.same(thing.someProp, value)
//
//   With debugging:
//     t.same(Thing.composite.debug(() => thing.someProp), value)
//
export function debug(fn) {
  compositeFrom.debug = true;
  const value = fn();
  compositeFrom.debug = false;
  return value;
}

// -- Compositional steps for compositions to nest --

// Provides dependencies exactly as they are (or null if not defined) to the
// continuation. Although this can *technically* be used to alias existing
// dependencies to some other name within the middle of a composition, it's
// intended to be used only as a composition's base - doing so makes the
// composition as a whole suitable as a step in some other composition,
// providing the listed (internal) dependencies to later steps just like
// other compositional steps.
export {_export as export};
function _export(mapping) {
  const mappingEntries = Object.entries(mapping);

  return {
    annotation: `Thing.composite.export`,
    flags: {expose: true, compose: true},

    expose: {
      options: {mappingEntries},
      dependencies: Object.values(mapping),

      compute({'#options': {mappingEntries}, ...dependencies}, continuation) {
        const exports = {};

        // Note: This is slightly different behavior from filterProperties,
        // as defined in sugar.js, which doesn't fall back to null for
        // properties which don't exist on the original object.
        for (const [exportKey, dependencyKey] of mappingEntries) {
          exports[exportKey] =
            (Object.hasOwn(dependencies, dependencyKey)
              ? dependencies[dependencyKey]
              : null);
        }

        return continuation.raise(exports);
      }
    },
  };
}

// -- Compositional steps for top-level property descriptors --

// Exposes a dependency exactly as it is; this is typically the base of a
// composition which was created to serve as one property's descriptor.
// Since this serves as a base, specify a value for {update} to indicate
// that the property as a whole updates (and some previous compositional
// step works with that update value). Set {update: true} to only enable
// the update flag, or set update to an object to specify a descriptor
// (e.g. for custom value validation).
//
// Please note that this *doesn't* verify that the dependency exists, so
// if you provide the wrong name or it hasn't been set by a previous
// compositional step, the property will be exposed as undefined instead
// of null.
//
export function exposeDependency(dependency, {
  update = false,
} = {}) {
  return {
    annotation: `Thing.composite.exposeDependency`,
    flags: {expose: true, update: !!update},

    expose: {
      mapDependencies: {dependency},
      compute: ({dependency}) => dependency,
    },

    update:
      (typeof update === 'object'
        ? update
        : null),
  };
}

// Exposes a constant value exactly as it is; like exposeDependency, this
// is typically the base of a composition serving as a particular property
// descriptor. It generally follows steps which will conditionally early
// exit with some other value, with the exposeConstant base serving as the
// fallback default value. Like exposeDependency, set {update} to true or
// an object to indicate that the property as a whole updates.
export function exposeConstant(value, {
  update = false,
} = {}) {
  return {
    annotation: `Thing.composite.exposeConstant`,
    flags: {expose: true, update: !!update},

    expose: {
      options: {value},
      compute: ({'#options': {value}}) => value,
    },

    update:
      (typeof update === 'object'
        ? update
        : null),
  };
}

// Checks the availability of a dependency or the update value and provides
// the result to later steps under '#availability' (by default). This is
// mainly intended for use by the more specific utilities, which you should
// consider using instead. Customize {mode} to select one of these modes,
// or leave unset and default to 'null':
//
// * 'null':  Check that the value isn't null.
// * 'empty': Check that the value is neither null nor an empty array.
// * 'falsy': Check that the value isn't false when treated as a boolean
//            (nor an empty array). Keep in mind this will also be false
//            for values like zero and the empty string!
//
export function withResultOfAvailabilityCheck({
  fromUpdateValue,
  fromDependency,
  mode = 'null',
  to = '#availability',
}) {
  if (!['null', 'empty', 'falsy'].includes(mode)) {
    throw new TypeError(`Expected mode to be null, empty, or falsy`);
  }

  if (fromUpdateValue && fromDependency) {
    throw new TypeError(`Don't provide both fromUpdateValue and fromDependency`);
  }

  if (!fromUpdateValue && !fromDependency) {
    throw new TypeError(`Missing dependency name (or fromUpdateValue)`);
  }

  const checkAvailability = (value, mode) => {
    switch (mode) {
      case 'null': return value !== null;
      case 'empty': return !empty(value);
      case 'falsy': return !!value && (!Array.isArray(value) || !empty(value));
      default: return false;
    }
  };

  if (fromDependency) {
    return {
      annotation: `Thing.composite.withResultOfAvailabilityCheck.fromDependency`,
      flags: {expose: true, compose: true},
      expose: {
        mapDependencies: {from: fromDependency},
        mapContinuation: {to},
        options: {mode},
        compute: ({from, '#options': {mode}}, continuation) =>
          continuation({to: checkAvailability(from, mode)}),
      },
    };
  } else {
    return {
      annotation: `Thing.composite.withResultOfAvailabilityCheck.fromUpdateValue`,
      flags: {expose: true, compose: true},
      expose: {
        mapContinuation: {to},
        options: {mode},
        transform: (value, {'#options': {mode}}, continuation) =>
          continuation(value, {to: checkAvailability(value, mode)}),
      },
    };
  }
}

// Exposes a dependency as it is, or continues if it's unavailable.
// See withResultOfAvailabilityCheck for {mode} options!
export function exposeDependencyOrContinue(dependency, {
  mode = 'null',
} = {}) {
  return compositeFrom(`Thing.composite.exposeDependencyOrContinue`, [
    withResultOfAvailabilityCheck({
      fromDependency: dependency,
      mode,
    }),

    {
      dependencies: ['#availability'],
      compute: ({'#availability': availability}, continuation) =>
        (availability
          ? continuation()
          : continuation.raise()),
    },

    {
      mapDependencies: {dependency},
      compute: ({dependency}, continuation) =>
        continuation.exit(dependency),
    },
  ]);
}

// Exposes the update value of an {update: true} property as it is,
// or continues if it's unavailable. See withResultOfAvailabilityCheck
// for {mode} options!
export function exposeUpdateValueOrContinue({
  mode = 'null',
} = {}) {
  return compositeFrom(`Thing.composite.exposeUpdateValueOrContinue`, [
    withResultOfAvailabilityCheck({
      fromUpdateValue: true,
      mode,
    }),

    {
      dependencies: ['#availability'],
      compute: ({'#availability': availability}, continuation) =>
        (availability
          ? continuation()
          : continuation.raise()),
    },

    {
      transform: (value, continuation) =>
        continuation.exit(value),
    },
  ]);
}

// Early exits if an availability check has failed.
// This is for internal use only - use `earlyExitWithoutDependency` or
// `earlyExitWIthoutUpdateValue` instead.
export function earlyExitIfAvailabilityCheckFailed({
  availability = '#availability',
  value = null,
} = {}) {
  return compositeFrom(`Thing.composite.earlyExitIfAvailabilityCheckFailed`, [
    {
      mapDependencies: {availability},
      compute: ({availability}, continuation) =>
        (availability
          ? continuation.raise()
          : continuation()),
    },

    {
      options: {value},
      compute: ({'#options': {value}}, continuation) =>
        continuation.exit(value),
    },
  ]);
}

// Early exits if a dependency isn't available.
// See withResultOfAvailabilityCheck for {mode} options!
export function earlyExitWithoutDependency(dependency, {
  mode = 'null',
  value = null,
} = {}) {
  return compositeFrom(`Thing.composite.earlyExitWithoutDependency`, [
    withResultOfAvailabilityCheck({fromDependency: dependency, mode}),
    earlyExitIfAvailabilityCheckFailed({value}),
  ]);
}

// Early exits if this property's update value isn't available.
// See withResultOfAvailabilityCheck for {mode} options!
export function earlyExitWithoutUpdateValue({
  mode = 'null',
  value = null,
} = {}) {
  return compositeFrom(`Thing.composite.earlyExitWithoutDependency`, [
    withResultOfAvailabilityCheck({fromUpdateValue: true, mode}),
    earlyExitIfAvailabilityCheckFailed({value}),
  ]);
}

// Raises if a dependency isn't available.
// See withResultOfAvailabilityCheck for {mode} options!
export function raiseWithoutDependency(dependency, {
  mode = 'null',
  map = {},
  raise = {},
} = {}) {
  return compositeFrom(`Thing.composite.raiseWithoutDependency`, [
    withResultOfAvailabilityCheck({fromDependency: dependency, mode}),

    {
      dependencies: ['#availability'],
      compute: ({'#availability': availability}, continuation) =>
        (availability
          ? continuation.raise()
          : continuation()),
    },

    {
      options: {raise},
      mapContinuation: map,
      compute: ({'#options': {raise}}, continuation) =>
        continuation.raiseAbove(raise),
    },
  ]);
}

// Raises if this property's update value isn't available.
// See withResultOfAvailabilityCheck for {mode} options!
export function raiseWithoutUpdateValue({
  mode = 'null',
  map = {},
  raise = {},
} = {}) {
  return compositeFrom(`Thing.composite.raiseWithoutUpdateValue`, [
    withResultOfAvailabilityCheck({fromUpdateValue: true, mode}),

    {
      dependencies: ['#availability'],
      compute: ({'#availability': availability}, continuation) =>
        (availability
          ? continuation.raise()
          : continuation()),
    },

    {
      options: {raise},
      mapContinuation: map,
      compute: ({'#options': {raise}}, continuation) =>
        continuation.raiseAbove(raise),
    },
  ]);
}

// -- Compositional steps for processing data --

// Resolves the contribsByRef contained in the provided dependency,
// providing (named by the second argument) the result. "Resolving"
// means mapping the "who" reference of each contribution to an artist
// object, and filtering out those whose "who" doesn't match any artist.
export function withResolvedContribs({from, to}) {
  return Thing.composite.from(`Thing.composite.withResolvedContribs`, [
    Thing.composite.raiseWithoutDependency(from, {
      mode: 'empty',
      map: {to},
      raise: {to: []},
    }),

    {
      mapDependencies: {from},
      compute: ({from}, continuation) =>
        continuation({
          '#whoByRef': from.map(({who}) => who),
          '#what': from.map(({what}) => what),
        }),
    },

    withResolvedReferenceList({
      list: '#whoByRef',
      data: 'artistData',
      to: '#who',
      find: find.artist,
      notFoundMode: 'null',
    }),

    {
      dependencies: ['#who', '#what'],
      mapContinuation: {to},
      compute({'#who': who, '#what': what}, continuation) {
        filterMultipleArrays(who, what, (who, _what) => who);
        return continuation({
          to: stitchArrays({who, what}),
        });
      },
    },
  ]);
}

// Resolves a reference by using the provided find function to match it
// within the provided thingData dependency. This will early exit if the
// data dependency is null, or, if earlyExitIfNotFound is set to true,
// if the find function doesn't match anything for the reference.
// Otherwise, the data object is provided on the output dependency;
// or null, if the reference doesn't match anything or itself was null
// to begin with.
export function withResolvedReference({
  ref,
  data,
  find: findFunction,
  to = '#resolvedReference',
  earlyExitIfNotFound = false,
}) {
  return compositeFrom(`Thing.composite.withResolvedReference`, [
    raiseWithoutDependency(ref, {map: {to}, raise: {to: null}}),
    earlyExitWithoutDependency(data),

    {
      options: {findFunction, earlyExitIfNotFound},
      mapDependencies: {ref, data},
      mapContinuation: {match: to},

      compute({ref, data, '#options': {findFunction, earlyExitIfNotFound}}, continuation) {
        const match = findFunction(ref, data, {mode: 'quiet'});

        if (match === null && earlyExitIfNotFound) {
          return continuation.exit(null);
        }

        return continuation.raise({match});
      },
    },
  ]);
}

// Resolves a list of references, with each reference matched with provided
// data in the same way as withResolvedReference. This will early exit if the
// data dependency is null (even if the reference list is empty). By default
// it will filter out references which don't match, but this can be changed
// to early exit ({notFoundMode: 'exit'}) or leave null in place ('null').
export function withResolvedReferenceList({
  list,
  data,
  find: findFunction,
  to = '#resolvedReferenceList',
  notFoundMode = 'filter',
}) {
  if (!['filter', 'exit', 'null'].includes(notFoundMode)) {
    throw new TypeError(`Expected notFoundMode to be filter, exit, or null`);
  }

  return compositeFrom(`Thing.composite.withResolvedReferenceList`, [
    earlyExitWithoutDependency(data, {value: []}),

    raiseWithoutDependency(list, {
      map: {to},
      raise: {to: []},
      mode: 'empty',
    }),

    {
      options: {findFunction, notFoundMode},
      mapDependencies: {list, data},
      mapContinuation: {matches: to},

      compute({list, data, '#options': {findFunction, notFoundMode}}, continuation) {
        let matches =
          list.map(ref => findFunction(ref, data, {mode: 'quiet'}));

        if (!matches.includes(null)) {
          return continuation.raise({matches});
        }

        switch (notFoundMode) {
          case 'filter':
            matches = matches.filter(value => value !== null);
            return continuation.raise({matches});

          case 'exit':
            return continuation.exit([]);

          case 'null':
            return continuation.raise({matches});
        }
      },
    },
  ]);
}

// Check out the info on Thing.common.reverseReferenceList!
// This is its composable form.
export function withReverseReferenceList({
  data,
  list: refListProperty,
  to = '#reverseReferenceList',
}) {
  return compositeFrom(`Thing.common.reverseReferenceList`, [
    earlyExitWithoutDependency(data, {value: []}),

    {
      dependencies: ['this'],
      mapDependencies: {data},
      mapContinuation: {to},
      options: {refListProperty},

      compute: ({this: thisThing, data, '#options': {refListProperty}}, continuation) =>
        continuation({
          to: data.filter(thing => thing[refListProperty].includes(thisThing)),
        }),
    },
  ]);
}