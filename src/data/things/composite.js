import {inspect} from 'node:util';

import {colors} from '#cli';

import {
  empty,
  filterProperties,
  openAggregate,
} from '#sugar';

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
//   withResolvedContribs = ({
//     from: contribsByRefDependency,
//     into: outputDependency,
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
//   Track.coverArtists =
//     compositeFrom([
//       doSomethingWhichMightEarlyExit(),
//
//       withResolvedContribs({
//         from: 'coverArtistContribsByRef',
//         into: '#coverArtistContribs',
//       }),
//
//       {
//         flags: {expose: true},
//         expose: {
//           dependencies: ['#coverArtistContribs'],
//           compute: ({'#coverArtistContribs': coverArtistContribs}) =>
//             coverArtistContribs.map(({who}) => who),
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
//   withResolvedContribs = ({
//     from: contribsByRefDependency,
//     into: outputDependency,
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
//   withResolvedContribs = ({from, to}) => ({
//     flags: {expose: true, compose: true},
//     expose: {
//       dependencies: ['artistData'],
//       mapDependencies: {from},
//       mapContinuation: {into},
//       compute({artistData, from: contribsByRef}, continuation) {
//         if (!artistData) return null;
//         return continuation({
//           into: (..resolve contributions one way or another..),
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
// the compositeFrom() function will accept and adapt to a base that
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

export function compositeFrom(firstArg, secondArg) {
  const debug = fn => {
    if (compositeFrom.debug === true) {
      const label =
        (annotation
          ? colors.dim(`[composite: ${annotation}]`)
          : colors.dim(`[composite]`));
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
      `Errors preparing composition` +
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

      const stepComputes = !!expose?.compute;
      const stepTransforms = !!expose?.transform;

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
      for (const dependency of expose?.dependencies ?? []) {
        if (typeof dependency === 'string' && dependency.startsWith('#')) {
          continue;
        }

        exposeDependencies.add(dependency);
      }

      // Mapped dependencies are always exposed on the final composition.
      // These are explicitly for reading values which are named outside of
      // the current compositional step.
      for (const dependency of Object.values(expose?.mapDependencies ?? {})) {
        exposeDependencies.add(dependency);
      }
    });
  }

  if (!baseComposes && !baseUpdates && !anyStepsCompute) {
    aggregate.push(new TypeError(`Expected at least one step to compute`));
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
      for (const [into, from] of Object.entries(mapDependencies)) {
        filteredDependencies[into] = availableDependencies[from] ?? null;
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

    for (const [from, into] of Object.entries(mapContinuation)) {
      assignDependencies[into] = continuationAssignment[from] ?? null;
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
      debug(() => [colors.bright(`begin composition - transforming from:`), initialValue]);
    } else {
      debug(() => colors.bright(`begin composition - not transforming`));
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

      if (!expose) {
        debug(() => `step #${i+1} - no expose description, nothing to do for this step`);
        continue;
      }

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

        debug(() => colors.bright(`end composition - exit (inferred)`));

        return result;
      }

      const {returnedWith} = continuationStorage;

      if (returnedWith === 'exit') {
        const {providedValue} = continuationStorage;

        debug(() => [`step #${i+1} - result: exit (explicit) ->`, providedValue]);
        debug(() => colors.bright(`end composition - exit (explicit)`));

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
              ? colors.bright(`end composition - raise (base: explicit)`)
              : colors.bright(`end composition - raise`)));
          return continuationIfApplicable(...continuationArgs);

        case 'raiseAbove':
          debug(() => colors.bright(`end composition - raiseAbove`));
          return continuationIfApplicable.raise(...continuationArgs);

        case 'continuation':
          if (isBase) {
            debug(() => colors.bright(`end composition - raise (inferred)`));
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
//     t.same(debugComposite(() => thing.someProp), value)
//
export function debugComposite(fn) {
  compositeFrom.debug = true;
  const value = fn();
  compositeFrom.debug = false;
  return value;
}

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
export function exposeDependency({
  dependency,
  update = false,
}) {
  return {
    annotation: `exposeDependency`,
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
export function exposeConstant({
  value,
  update = false,
}) {
  return {
    annotation: `exposeConstant`,
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
// * 'null':  Check that the value isn't null (and not undefined either).
// * 'empty': Check that the value is neither null nor an empty array.
//            This will outright error for undefined.
// * 'falsy': Check that the value isn't false when treated as a boolean
//            (nor an empty array). Keep in mind this will also be false
//            for values like zero and the empty string!
//
export function withResultOfAvailabilityCheck({
  fromUpdateValue,
  fromDependency,
  mode = 'null',
  into = '#availability',
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
      case 'null': return value !== null && value !== undefined;
      case 'empty': return !empty(value);
      case 'falsy': return !!value && (!Array.isArray(value) || !empty(value));
      default: return false;
    }
  };

  if (fromDependency) {
    return {
      annotation: `withResultOfAvailabilityCheck.fromDependency`,
      flags: {expose: true, compose: true},
      expose: {
        mapDependencies: {from: fromDependency},
        mapContinuation: {into},
        options: {mode},
        compute: ({from, '#options': {mode}}, continuation) =>
          continuation({into: checkAvailability(from, mode)}),
      },
    };
  } else {
    return {
      annotation: `withResultOfAvailabilityCheck.fromUpdateValue`,
      flags: {expose: true, compose: true},
      expose: {
        mapContinuation: {into},
        options: {mode},
        transform: (value, {'#options': {mode}}, continuation) =>
          continuation(value, {into: checkAvailability(value, mode)}),
      },
    };
  }
}

// Exposes a dependency as it is, or continues if it's unavailable.
// See withResultOfAvailabilityCheck for {mode} options!
export function exposeDependencyOrContinue({
  dependency,
  mode = 'null',
}) {
  return compositeFrom(`exposeDependencyOrContinue`, [
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
  return compositeFrom(`exposeUpdateValueOrContinue`, [
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
// This is for internal use only - use `exitWithoutDependency` or
// `exitWithoutUpdateValue` instead.
export function exitIfAvailabilityCheckFailed({
  availability = '#availability',
  value = null,
} = {}) {
  return compositeFrom(`exitIfAvailabilityCheckFailed`, [
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
export function exitWithoutDependency({
  dependency,
  mode = 'null',
  value = null,
}) {
  return compositeFrom(`exitWithoutDependency`, [
    withResultOfAvailabilityCheck({fromDependency: dependency, mode}),
    exitIfAvailabilityCheckFailed({value}),
  ]);
}

// Early exits if this property's update value isn't available.
// See withResultOfAvailabilityCheck for {mode} options!
export function exitWithoutUpdateValue({
  mode = 'null',
  value = null,
} = {}) {
  return compositeFrom(`exitWithoutUpdateValue`, [
    withResultOfAvailabilityCheck({fromUpdateValue: true, mode}),
    exitIfAvailabilityCheckFailed({value}),
  ]);
}

// Raises if a dependency isn't available.
// See withResultOfAvailabilityCheck for {mode} options!
export function raiseWithoutDependency({
  dependency,
  mode = 'null',
  map = {},
  raise = {},
}) {
  return compositeFrom(`raiseWithoutDependency`, [
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
  return compositeFrom(`raiseWithoutUpdateValue`, [
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

// Turns an updating property's update value into a dependency, so it can be
// conveniently passed to other functions.
export function withUpdateValueAsDependency({
  into = '#updateValue',
} = {}) {
  return {
    annotation: `withUpdateValueAsDependency`,
    flags: {expose: true, compose: true},

    expose: {
      mapContinuation: {into},
      transform: (value, continuation) =>
        continuation(value, {into: value}),
    },
  };
}

// Gets a property of some object (in a dependency) and provides that value.
// If the object itself is null, or the object doesn't have the listed property,
// the provided dependency will also be null.
export function withPropertyFromObject({
  object,
  property,
  into = null,
}) {
  into ??=
    (object.startsWith('#')
      ? `${object}.${property}`
      : `#${object}.${property}`);

  return {
    annotation: `withPropertyFromObject`,
    flags: {expose: true, compose: true},

    expose: {
      mapDependencies: {object},
      mapContinuation: {into},
      options: {property},

      compute: ({object, '#options': {property}}, continuation) =>
        (object === null || object === undefined
          ? continuation({into: null})
          : continuation({into: object[property] ?? null})),
    },
  };
}

// Gets the listed properties from some object, providing each property's value
// as a dependency prefixed with the same name as the object (by default).
// If the object itself is null, all provided dependencies will be null;
// if it's missing only select properties, those will be provided as null.
export function withPropertiesFromObject({
  object,
  properties,
  prefix =
    (object.startsWith('#')
      ? object
      : `#${object}`),
}) {
  return {
    annotation: `withPropertiesFromObject`,
    flags: {expose: true, compose: true},

    expose: {
      mapDependencies: {object},
      options: {prefix, properties},

      compute: ({object, '#options': {prefix, properties}}, continuation) =>
        continuation(
          Object.fromEntries(
            properties.map(property => [
              `${prefix}.${property}`,
              (object === null || object === undefined
                ? null
                : object[property] ?? null),
            ]))),
    },
  };
}

// Gets a property from each of a list of objects (in a dependency) and
// provides the results. This doesn't alter any list indices, so positions
// which were null in the original list are kept null here. Objects which don't
// have the specified property are retained in-place as null.
export function withPropertyFromList({
  list,
  property,
  into = null,
}) {
  into ??=
    (list.startsWith('#')
      ? `${list}.${property}`
      : `#${list}.${property}`);

  return {
    annotation: `withPropertyFromList`,
    flags: {expose: true, compose: true},

    expose: {
      mapDependencies: {list},
      mapContinuation: {into},
      options: {property},

      compute({list, '#options': {property}}, continuation) {
        if (list === undefined || empty(list)) {
          return continuation({into: []});
        }

        return continuation({
          into:
            list.map(item =>
              (item === null || item === undefined
                ? null
                : item[property] ?? null)),
        });
      },
    },
  };
}

// Gets the listed properties from each of a list of objects, providing lists
// of property values each into a dependency prefixed with the same name as the
// list (by default). Like withPropertyFromList, this doesn't alter indices.
export function withPropertiesFromList({
  list,
  properties,
  prefix =
    (list.startsWith('#')
      ? list
      : `#${list}`),
}) {
  return {
    annotation: `withPropertiesFromList`,
    flags: {expose: true, compose: true},

    expose: {
      mapDependencies: {list},
      options: {prefix, properties},

      compute({list, '#options': {prefix, properties}}, continuation) {
        const lists =
          Object.fromEntries(
            properties.map(property => [`${prefix}.${property}`, []]));

        for (const item of list) {
          for (const property of properties) {
            lists[`${prefix}.${property}`].push(
              (item === null || item === undefined
                ? null
                : item[property] ?? null));
          }
        }

        return continuation(lists);
      }
    }
  }
}

// Replaces items of a list, which are null or undefined, with some fallback
// value, either a constant (set {value}) or from a dependency ({dependency}).
// By default, this replaces the passed dependency.
export function fillMissingListItems({
  list,
  value,
  dependency,
  into = list,
}) {
  if (value !== undefined && dependency !== undefined) {
    throw new TypeError(`Don't provide both value and dependency`);
  }

  if (value === undefined && dependency === undefined) {
    throw new TypeError(`Missing value or dependency`);
  }

  if (dependency) {
    return {
      annotation: `fillMissingListItems.fromDependency`,
      flags: {expose: true, compose: true},

      expose: {
        mapDependencies: {list, dependency},
        mapContinuation: {into},

        compute: ({list, dependency}, continuation) =>
          continuation({
            into: list.map(item => item ?? dependency),
          }),
      },
    };
  } else {
    return {
      annotation: `fillMissingListItems.fromValue`,
      flags: {expose: true, compose: true},

      expose: {
        mapDependencies: {list},
        mapContinuation: {into},
        options: {value},

        compute: ({list, '#options': {value}}, continuation) =>
          continuation({
            into: list.map(item => item ?? value),
          }),
      },
    };
  }
}

// Flattens an array with one level of nested arrays, providing as dependencies
// both the flattened array as well as the original starting indices of each
// successive source array.
export function withFlattenedArray({
  from,
  into = '#flattenedArray',
  intoIndices = '#flattenedIndices',
}) {
  return {
    annotation: `withFlattenedArray`,
    flags: {expose: true, compose: true},

    expose: {
      mapDependencies: {from},
      mapContinuation: {into, intoIndices},

      compute({from: sourceArray}, continuation) {
        const into = sourceArray.flat();
        const intoIndices = [];

        let lastEndIndex = 0;
        for (const {length} of sourceArray) {
          intoIndices.push(lastEndIndex);
          lastEndIndex += length;
        }

        return continuation({into, intoIndices});
      },
    },
  };
}

// After mapping the contents of a flattened array in-place (being careful to
// retain the original indices by replacing unmatched results with null instead
// of filtering them out), this function allows for recombining them. It will
// filter out null and undefined items by default (pass {filter: false} to
// disable this).
export function withUnflattenedArray({
  from,
  fromIndices = '#flattenedIndices',
  into = '#unflattenedArray',
  filter = true,
}) {
  return {
    annotation: `withUnflattenedArray`,
    flags: {expose: true, compose: true},

    expose: {
      mapDependencies: {from, fromIndices},
      mapContinuation: {into},
      compute({from, fromIndices}, continuation) {
        const arrays = [];

        for (let i = 0; i < fromIndices.length; i++) {
          const startIndex = fromIndices[i];
          const endIndex =
            (i === fromIndices.length - 1
              ? from.length
              : fromIndices[i + 1]);

          const values = from.slice(startIndex, endIndex);
          arrays.push(
            (filter
              ? values.filter(value => value !== null && value !== undefined)
              : values));
        }

        return continuation({into: arrays});
      },
    },
  };
}
