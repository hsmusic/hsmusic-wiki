import {inspect} from 'node:util';

import {colors} from '#cli';
import {TupleMap} from '#wiki-data';

import {
  isArray,
  isWholeNumber,
  oneOf,
  validateArrayItems,
} from '#validators';

import {
  decorateErrorWithIndex,
  empty,
  filterProperties,
  openAggregate,
  stitchArrays,
  unique,
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

const globalCompositeCache = {};

export function input(nameOrDescription) {
  if (typeof nameOrDescription === 'string') {
    return Symbol.for(`hsmusic.composite.input:${nameOrDescription}`);
  } else {
    return {
      symbol: Symbol.for('hsmusic.composite.input'),
      shape: 'input',
      value: nameOrDescription,
    };
  }
}

input.symbol = Symbol.for('hsmusic.composite.input');

input.updateValue = () => Symbol.for('hsmusic.composite.input.updateValue');
input.myself = () => Symbol.for(`hsmusic.composite.input.myself`);

input.value = value => ({symbol: input.symbol, shape: 'input.value', value});
input.dependency = name => Symbol.for(`hsmusic.composite.input.dependency:${name}`);
input.staticDependency = name => Symbol.for(`hsmusic.composite.input.staticDependency:${name}`);
input.staticValue = name => Symbol.for(`hsmusic.composite.input.staticValue:${name}`);

function isInputToken(token) {
  if (typeof token === 'object') {
    return token.symbol === Symbol.for('hsmusic.composite.input');
  } else if (typeof token === 'symbol') {
    return token.description.startsWith('hsmusic.composite.input');
  } else {
    return false;
  }
}

function getInputTokenShape(token) {
  if (!isInputToken(token)) {
    throw new TypeError(`Expected an input token, got ${token}`);
  }

  if (typeof token === 'object') {
    return token.shape;
  } else {
    return token.description.match(/hsmusic\.composite\.(input.*?)(:|$)/)[1];
  }
}

function getInputTokenValue(token) {
  if (!isInputToken(token)) {
    throw new TypeError(`Expected an input token, got ${token}`);
  }

  if (typeof token === 'object') {
    return token.value;
  } else {
    return token.description.match(/hsmusic\.composite\.input.*?:(.*)/)?.[1] ?? null;
  }
}

function getStaticInputMetadata(inputOptions) {
  const metadata = {};

  for (const [name, token] of Object.entries(inputOptions)) {
    if (typeof token === 'string') {
      metadata[input.staticDependency(name)] = token;
      metadata[input.staticValue(name)] = null;
    } else if (isInputToken(token)) {
      const tokenShape = getInputTokenShape(token);
      const tokenValue = getInputTokenValue(token);

      metadata[input.staticDependency(name)] =
        (tokenShape === 'input.dependency'
          ? tokenValue
          : null);

      metadata[input.staticValue(name)] =
        (tokenShape === 'input.value'
          ? tokenValue
          : null);
    } else {
      metadata[input.staticDependency(name)] = null;
      metadata[input.staticValue(name)] = null;
    }
  }

  return metadata;
}

export function templateCompositeFrom(description) {
  const compositeName =
    (description.annotation
      ? description.annotation
      : `unnamed composite`);

  const descriptionAggregate = openAggregate({message: `Errors in description for ${compositeName}`});

  if ('steps' in description) {
    if (Array.isArray(description.steps)) {
      descriptionAggregate.push(new TypeError(`Wrap steps array in a function`));
    } else if (typeof description.steps !== 'function') {
      descriptionAggregate.push(new TypeError(`Expected steps to be a function (returning an array)`));
    }
  }

  validateInputs:
  if ('inputs' in description) {
    if (Array.isArray(description.inputs)) {
      descriptionAggregate.push(new Error(`Expected inputs to be object, got array`));
      break validateInputs;
    } else if (typeof description.inputs !== 'object') {
      descriptionAggregate.push(new Error(`Expected inputs to be object, got ${typeof description.inputs}`));
      break validateInputs;
    }

    descriptionAggregate.nest({message: `Errors in input descriptions for ${compositeName}`}, ({push}) => {
      const missingCallsToInput = [];
      const wrongCallsToInput = [];

      for (const [name, value] of Object.entries(description.inputs)) {
        if (!isInputToken(value)) {
          missingCallsToInput.push(name);
          continue;
        }

        if (!['input', 'input.staticDependency', 'input.staticValue'].includes(getInputTokenShape(value))) {
          wrongCallsToInput.push(name);
        }
      }

      for (const name of missingCallsToInput) {
        push(new Error(`${name}: Missing call to input()`));
      }

      for (const name of wrongCallsToInput) {
        const shape = getInputTokenShape(description.inputs[name]);
        push(new Error(`${name}: Expected call to input, input.staticDependency, or input.staticValue, got ${shape}`));
      }
    });
  }

  validateOutputs:
  if ('outputs' in description) {
    if (
      !Array.isArray(description.outputs) &&
      typeof description.outputs !== 'function'
    ) {
      descriptionAggregate.push(new Error(`Expected outputs to be array or function, got ${typeof description.outputs}`));
      break validateOutputs;
    }

    if (Array.isArray(description.outputs)) {
      descriptionAggregate.map(
        description.outputs,
        decorateErrorWithIndex(value => {
          if (typeof value !== 'string') {
            throw new Error(`${value}: Expected string, got ${typeof value}`)
          } else if (!value.startsWith('#')) {
            throw new Error(`${value}: Expected "#" at start`);
          }
        }),
        {message: `Errors in output descriptions for ${compositeName}`});
    }
  }

  descriptionAggregate.close();

  const expectedInputNames =
    (description.inputs
      ? Object.keys(description.inputs)
      : []);

  const instantiate = (inputOptions = {}) => {
    const inputOptionsAggregate = openAggregate({message: `Errors in input options passed to ${compositeName}`});

    const providedInputNames = Object.keys(inputOptions);

    const misplacedInputNames =
      providedInputNames
        .filter(name => !expectedInputNames.includes(name));

    const missingInputNames =
      expectedInputNames
        .filter(name => !providedInputNames.includes(name))
        .filter(name => {
          const inputDescription = description.inputs[name].value;
          if (!inputDescription) return true;
          if ('defaultValue' in inputDescription) return false;
          if ('defaultDependency' in inputDescription) return false;
          if (inputDescription.null === true) return false;
          return true;
        });

    const wrongTypeInputNames = [];
    const wrongInputCallInputNames = [];

    for (const [name, value] of Object.entries(inputOptions)) {
      if (misplacedInputNames.includes(name)) {
        continue;
      }

      if (typeof value !== 'string' && !isInputToken(value)) {
        wrongTypeInputNames.push(name);
        continue;
      }
    }

    if (!empty(misplacedInputNames)) {
      inputOptionsAggregate.push(new Error(`Unexpected input names: ${misplacedInputNames.join(', ')}`));
    }

    if (!empty(missingInputNames)) {
      inputOptionsAggregate.push(new Error(`Required these inputs: ${missingInputNames.join(', ')}`));
    }

    for (const name of wrongTypeInputNames) {
      const type = typeof inputOptions[name];
      inputOptionsAggregate.push(new Error(`${name}: Expected string or input() call, got ${type}`));
    }

    inputOptionsAggregate.close();

    const expectedOutputNames =
      (Array.isArray(description.outputs)
        ? description.outputs
     : typeof description.outputs === 'function'
        ? description.outputs(getStaticInputMetadata(inputOptions))
        : []);

    const outputOptions = {};

    const instantiatedTemplate = {
      symbol: templateCompositeFrom.symbol,

      outputs(providedOptions) {
        const outputOptionsAggregate = openAggregate({message: `Errors in output options passed to ${compositeName}`});

        const misplacedOutputNames = [];
        const wrongTypeOutputNames = [];
        // const notPrivateOutputNames = [];

        for (const [name, value] of Object.entries(providedOptions)) {
          if (!expectedOutputNames.includes(name)) {
            misplacedOutputNames.push(name);
            continue;
          }

          if (typeof value !== 'string') {
            wrongTypeOutputNames.push(name);
            continue;
          }

          /*
          if (!value.startsWith('#')) {
            notPrivateOutputNames.push(name);
            continue;
          }
          */
        }

        if (!empty(misplacedOutputNames)) {
          outputOptionsAggregate.push(new Error(`Unexpected output names: ${misplacedOutputNames.join(', ')}`));
        }

        for (const name of wrongTypeOutputNames) {
          const type = typeof providedOptions[name];
          outputOptionsAggregate.push(new Error(`${name}: Expected string, got ${type}`));
        }

        /*
        for (const name of notPrivateOutputNames) {
          const into = providedOptions[name];
          outputOptionsAggregate.push(new Error(`${name}: Expected "#" at start, got ${into}`));
        }
        */

        outputOptionsAggregate.close();

        Object.assign(outputOptions, providedOptions);
        return instantiatedTemplate;
      },

      toDescription() {
        const finalDescription = {};

        if ('annotation' in description) {
          finalDescription.annotation = description.annotation;
        }

        if ('compose' in description) {
          finalDescription.compose = description.compose;
        }

        if ('update' in description) {
          finalDescription.update = description.update;
        }

        if ('inputs' in description) {
          const finalInputs = {};

          for (const [name, description_] of Object.entries(description.inputs)) {
            // TODO: Validate inputOptions[name] against staticValue, staticDependency shapes
            const description = getInputTokenValue(description_);
            const tokenShape = getInputTokenShape(description_);

            if (name in inputOptions) {
              if (typeof inputOptions[name] === 'string') {
                finalInputs[name] = input.dependency(inputOptions[name]);
              } else {
                finalInputs[name] = inputOptions[name];
              }
            } else if (description.defaultValue) {
              finalInputs[name] = input.value(description.defaultValue);
            } else if (description.defaultDependency) {
              finalInputs[name] = input.dependency(description.defaultDependency);
            } else {
              finalInputs[name] = input.value(null);
            }
          }

          finalDescription.inputs = finalInputs;
        }

        if ('outputs' in description) {
          const finalOutputs = {};

          for (const name of expectedOutputNames) {
            if (name in outputOptions) {
              finalOutputs[name] = outputOptions[name];
            } else {
              finalOutputs[name] = name;
            }
          }

          finalDescription.outputs = finalOutputs;
        }

        if ('steps' in description) {
          finalDescription.steps = description.steps;
        }

        return finalDescription;
      },

      toResolvedComposition() {
        const ownDescription = instantiatedTemplate.toDescription();

        const finalDescription = {...ownDescription};

        const aggregate = openAggregate({message: `Errors resolving ${compositeName}`});

        const steps = ownDescription.steps();

        const resolvedSteps =
          aggregate.map(
            steps,
            decorateErrorWithIndex(step =>
              (step.symbol === templateCompositeFrom.symbol
                ? compositeFrom(step.toResolvedComposition())
                : step)),
            {message: `Errors resolving steps`});

        aggregate.close();

        finalDescription.steps = resolvedSteps;

        return finalDescription;
      },
    };

    return instantiatedTemplate;
  };

  instantiate.inputs = instantiate;

  return instantiate;
}

templateCompositeFrom.symbol = Symbol();

export function compositeFrom(description) {
  const {annotation} = description;

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
            ? inspect(value, {depth: 1, colors: true, compact: true, breakLength: Infinity})
            : value)));
      } else {
        console.log(label, result);
      }
    }
  };

  if (!Array.isArray(description.steps)) {
    throw new TypeError(
      `Expected steps to be array, got ${typeof description.steps}` +
      (annotation ? ` (${annotation})` : ''));
  }

  const composition =
    description.steps.map(step =>
      ('toResolvedComposition' in step
        ? compositeFrom(step.toResolvedComposition())
        : step));

  const inputMetadata = getStaticInputMetadata(description.inputs ?? {});

  function _mapDependenciesToOutputs(providedDependencies) {
    if (!description.outputs) {
      return {};
    }

    if (!providedDependencies) {
      return {};
    }

    return (
      Object.fromEntries(
        Object.entries(description.outputs)
          .map(([continuationName, outputName]) => [
            outputName,
            providedDependencies[continuationName],
          ])));
  }

  // These dependencies were all provided by the composition which this one is
  // nested inside, so input('name')-shaped tokens are going to be evaluated
  // in the context of the containing composition.
  const dependenciesFromInputs =
    Object.values(description.inputs ?? {})
      .map(token => {
        const tokenShape = getInputTokenShape(token);
        const tokenValue = getInputTokenValue(token);
        switch (tokenShape) {
          case 'input.dependency':
            return tokenValue;
          case 'input':
          case 'input.updateValue':
            return token;
          default:
            return null;
        }
      })
      .filter(Boolean);

  const anyInputsUseUpdateValue =
    dependenciesFromInputs.includes(input.updateValue());

  const base = composition.at(-1);
  const steps = composition.slice();

  const aggregate = openAggregate({
    message:
      `Errors preparing composition` +
      (annotation ? ` (${annotation})` : ''),
  });

  // TODO: Check description.compose ?? true instead.
  const compositionNests = description.compose ?? true;

  const exposeDependencies = new Set();
  const updateDescription = {};

  // Steps default to exposing if using a shorthand syntax where flags aren't
  // specified at all.
  const stepsExpose =
    steps
      .map(step =>
        (step.flags
          ? step.flags.expose ?? false
          : true));

  // Steps default to composing if using a shorthand syntax where flags aren't
  // specified at all - *and* aren't the base (final step), unless the whole
  // composition is nestable.
  const stepsCompose =
    steps
      .map((step, index, {length}) =>
        (step.flags
          ? step.flags.compose ?? false
          : (index === length - 1
              ? compositionNests
              : true)));

  // Steps don't update unless the corresponding flag is explicitly set.
  const stepsUpdate =
    steps
      .map(step =>
        (step.flags
          ? step.flags.update ?? false
          : false));

  // The expose description for a step is just the entire step object, when
  // using the shorthand syntax where {flags: {expose: true}} is left implied.
  const stepExposeDescriptions =
    steps
      .map((step, index) =>
        (stepsExpose[index]
          ? (step.flags
              ? step.expose ?? null
              : step)
          : null));

  // The update description for a step, if present at all, is always set
  // explicitly.
  const stepUpdateDescriptions =
    steps
      .map((step, index) =>
        (stepsUpdate[index]
          ? step.update ?? null
          : null));

  // Indicates presence of a {compute} function on the expose description.
  const stepsCompute =
    stepExposeDescriptions
      .map(expose => !!expose?.compute);

  // Indicates presence of a {transform} function on the expose description.
  const stepsTransform =
    stepExposeDescriptions
      .map(expose => !!expose?.transform);

  const dependenciesFromSteps =
    unique(
      stepExposeDescriptions
        .flatMap(expose => expose?.dependencies ?? [])
        .map(dependency => {
          if (typeof dependency === 'string')
            return (dependency.startsWith('#') ? null : dependency);

          const tokenShape = getInputTokenShape(dependency);
          const tokenValue = getInputTokenValue(dependency);
          switch (tokenShape) {
            case 'input.dependency':
              return (tokenValue.startsWith('#') ? null : tokenValue);
            case 'input.myself':
              return 'this';
            default:
              return null;
          }
        })
        .filter(Boolean));

  const anyStepsUseUpdateValue =
    stepExposeDescriptions
      .some(expose =>
        (expose?.dependencies
          ? expose.dependencies.includes(input.updateValue())
          : false));

  const anyStepsExpose =
    stepsExpose.includes(true);

  const anyStepsUpdate =
    stepsUpdate.includes(true);

  const anyStepsCompute =
    stepsCompute.includes(true);

  const anyStepsTransform =
    stepsTransform.includes(true);

  const compositionExposes =
    anyStepsExpose;

  const compositionUpdates =
    anyInputsUseUpdateValue ||
    anyStepsUseUpdateValue ||
    anyStepsUpdate;

  const stepEntries = stitchArrays({
    step: steps,
    expose: stepExposeDescriptions,
    update: stepUpdateDescriptions,
    stepComposes: stepsCompose,
    stepComputes: stepsCompute,
    stepTransforms: stepsTransform,
  });

  for (let i = 0; i < stepEntries.length; i++) {
    const {
      step,
      expose,
      update,
      stepComposes,
      stepComputes,
      stepTransforms,
    } = stepEntries[i];

    const isBase = i === stepEntries.length - 1;
    const message =
      `Errors in step #${i + 1}` +
      (isBase ? ` (base)` : ``) +
      (step.annotation ? ` (${step.annotation})` : ``);

    aggregate.nest({message}, ({push}) => {
      if (isBase && stepComposes !== compositionNests) {
        return push(new TypeError(
          (compositionNests
            ? `Base must compose, this composition is nestable`
            : `Base must not compose, this composition isn't nestable`)));
      } else if (!isBase && !stepComposes) {
        return push(new TypeError(
          (compositionNests
            ? `All steps must compose`
            : `All steps (except base) must compose`)));
      }

      if (
        !compositionNests && !compositionUpdates &&
        stepTransforms && !stepComputes
      ) {
        return push(new TypeError(
          `Steps which only transform can't be used in a composition that doesn't update`));
      }

      if (update) {
        // TODO: This is a dumb assign statement, and it could probably do more
        // interesting things, like combining validation functions.
        Object.assign(updateDescription, update);
      }
    });
  }

  if (!compositionNests && !anyStepsUpdate && !anyStepsCompute) {
    aggregate.push(new TypeError(`Expected at least one step to compute or update`));
  }

  aggregate.close();

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

    if (compositionNests) {
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

      continuation.raiseOutput = makeRaiseLike('raiseOutput');
      continuation.raiseOutputAbove = makeRaiseLike('raiseOutputAbove');
    }

    return {continuation, continuationStorage};
  }

  const continuationSymbol = Symbol.for('compositeFrom: continuation symbol');
  const noTransformSymbol = Symbol.for('compositeFrom: no-transform symbol');

  function _computeOrTransform(initialValue, continuationIfApplicable, initialDependencies) {
    const expectingTransform = initialValue !== noTransformSymbol;

    let valueSoFar =
      (expectingTransform
        ? initialValue
        : undefined);

    const availableDependencies = {...initialDependencies};

    const inputValues =
      ('inputs' in description
        ? Object.fromEntries(Object.entries(description.inputs)
            .map(([name, token]) => {
              const tokenShape = getInputTokenShape(token);
              const tokenValue = getInputTokenValue(token);
              switch (tokenShape) {
                case 'input.dependency':
                  return [input(name), initialDependencies[tokenValue]];
                case 'input.value':
                  return [input(name), tokenValue];
                case 'input.updateValue':
                  if (!expectingTransform) {
                    throw new Error(`Unexpected input.updateValue() accessed on non-transform call`);
                  }
                  return [input(name), valueSoFar];
                case 'input.myself':
                  return [input(name), initialDependencies['this']];
                case 'input':
                  return [input(name), initialDependencies[token]];
                default:
                  throw new TypeError(`Unexpected input shape ${tokenShape}`);
              }
            }))
        : {});

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
        if (!isBase) {
          debug(() => `step #${i+1} - no expose description, nothing to do for this step`);
          continue;
        }

        if (expectingTransform) {
          debug(() => `step #${i+1} (base) - no expose description, returning so-far update value:`, valueSoFar);
          if (continuationIfApplicable) {
            debug(() => colors.bright(`end composition - raise (inferred - composing)`));
            return continuationIfApplicable(valueSoFar);
          } else {
            debug(() => colors.bright(`end composition - exit (inferred - not composing)`));
            return valueSoFar;
          }
        } else {
          debug(() => `step #${i+1} (base) - no expose description, nothing to continue with`);
          if (continuationIfApplicable) {
            debug(() => colors.bright(`end composition - raise (inferred - composing)`));
            return continuationIfApplicable();
          } else {
            debug(() => colors.bright(`end composition - exit (inferred - not composing)`));
            return null;
          }
        }
      }

      const callingTransformForThisStep =
        expectingTransform && expose.transform;

      let continuationStorage;

      const filteredDependencies =
        filterProperties({
          ...availableDependencies,
          ...inputMetadata,
          ...inputValues,
          ...
            (callingTransformForThisStep
              ? {[input.updateValue()]: valueSoFar}
              : {}),
          [input.myself()]: initialDependencies['this'],
        }, expose.dependencies ?? []);

      debug(() => [
        `step #${i+1} - ${callingTransformForThisStep ? 'transform' : 'compute'}`,
        `with dependencies:`, filteredDependencies,
        ...callingTransformForThisStep ? [`from value:`, valueSoFar] : []]);

      let result;

      const getExpectedEvaluation = () =>
        (callingTransformForThisStep
          ? (filteredDependencies
              ? ['transform', valueSoFar, continuationSymbol, filteredDependencies]
              : ['transform', valueSoFar, continuationSymbol])
          : (filteredDependencies
              ? ['compute', continuationSymbol, filteredDependencies]
              : ['compute', continuationSymbol]));

      const naturalEvaluate = () => {
        const [name, ...argsLayout] = getExpectedEvaluation();

        let args;

        if (isBase && !compositionNests) {
          args =
            argsLayout.filter(arg => arg !== continuationSymbol);
        } else {
          let continuation;

          ({continuation, continuationStorage} =
            _prepareContinuation(callingTransformForThisStep));

          args =
            argsLayout.map(arg =>
              (arg === continuationSymbol
                ? continuation
                : arg));
        }

        return expose[name](...args);
      }

      switch (step.cache) {
        // Warning! Highly WIP!
        case 'aggressive': {
          const hrnow = () => {
            const hrTime = process.hrtime();
            return hrTime[0] * 1000000000 + hrTime[1];
          };

          const [name, ...args] = getExpectedEvaluation();

          let cache = globalCompositeCache[step.annotation];
          if (!cache) {
            cache = globalCompositeCache[step.annotation] = {
              transform: new TupleMap(),
              compute: new TupleMap(),
              times: {
                read: [],
                evaluate: [],
              },
            };
          }

          const tuplefied = args
            .flatMap(arg => [
              Symbol.for('compositeFrom: tuplefied arg divider'),
              ...(typeof arg !== 'object' || Array.isArray(arg)
                ? [arg]
                : Object.entries(arg).flat()),
            ]);

          const readTime = hrnow();
          const cacheContents = cache[name].get(tuplefied);
          cache.times.read.push(hrnow() - readTime);

          if (cacheContents) {
            ({result, continuationStorage} = cacheContents);
          } else {
            const evaluateTime = hrnow();
            result = naturalEvaluate();
            cache.times.evaluate.push(hrnow() - evaluateTime);
            cache[name].set(tuplefied, {result, continuationStorage});
          }

          break;
        }

        default: {
          result = naturalEvaluate();
          break;
        }
      }

      if (result !== continuationSymbol) {
        debug(() => [`step #${i+1} - result: exit (inferred) ->`, result]);

        if (compositionNests) {
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

        if (compositionNests) {
          return continuationIfApplicable.exit(providedValue);
        } else {
          return providedValue;
        }
      }

      const {providedValue, providedDependencies} = continuationStorage;

      const continuationArgs = [];
      if (expectingTransform) {
        continuationArgs.push(
          (callingTransformForThisStep
            ? providedValue ?? null
            : valueSoFar ?? null));
      }

      debug(() => {
        const base = `step #${i+1} - result: ` + returnedWith;
        const parts = [];

        if (callingTransformForThisStep) {
          parts.push('value:', providedValue);
        }

        if (providedDependencies !== null) {
          parts.push(`deps:`, providedDependencies);
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
        case 'raiseOutput':
          debug(() =>
            (isBase
              ? colors.bright(`end composition - raiseOutput (base: explicit)`)
              : colors.bright(`end composition - raiseOutput`)));
          continuationArgs.push(_mapDependenciesToOutputs(providedDependencies));
          return continuationIfApplicable(...continuationArgs);

        case 'raiseOutputAbove':
          debug(() => colors.bright(`end composition - raiseOutputAbove`));
          continuationArgs.push(_mapDependenciesToOutputs(providedDependencies));
          return continuationIfApplicable.raiseOutput(...continuationArgs);

        case 'continuation':
          if (isBase) {
            debug(() => colors.bright(`end composition - raiseOutput (inferred)`));
            continuationArgs.push(_mapDependenciesToOutputs(providedDependencies));
            return continuationIfApplicable(...continuationArgs);
          } else {
            Object.assign(availableDependencies, providedDependencies);
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
    update: compositionUpdates,
    expose: compositionExposes,
    compose: compositionNests,
  };

  if (constructedDescriptor.update) {
    constructedDescriptor.update = updateDescription;
  }

  if (compositionExposes) {
    const expose = constructedDescriptor.expose = {};

    expose.dependencies =
      unique([
        ...dependenciesFromInputs,
        ...dependenciesFromSteps,
      ]);

    if (compositionNests) {
      if (compositionUpdates) {
        expose.transform = (value, continuation, dependencies) =>
          _computeOrTransform(value, continuation, dependencies);
      }

      if (anyStepsCompute) {
        expose.compute = (continuation, dependencies) =>
          _computeOrTransform(noTransformSymbol, continuation, dependencies);
      }

      if (base.cacheComposition) {
        expose.cache = base.cacheComposition;
      }
    } else if (compositionUpdates) {
      expose.transform = (value, dependencies) =>
        _computeOrTransform(value, null, dependencies);
    } else {
      expose.compute = (dependencies) =>
        _computeOrTransform(noTransformSymbol, null, dependencies);
    }
  }

  return constructedDescriptor;
}

export function displayCompositeCacheAnalysis() {
  const showTimes = (cache, key) => {
    const times = cache.times[key].slice().sort();

    const all = times;
    const worst10pc = times.slice(-times.length / 10);
    const best10pc = times.slice(0, times.length / 10);
    const middle50pc = times.slice(times.length / 4, -times.length / 4);
    const middle80pc = times.slice(times.length / 10, -times.length / 10);

    const fmt = val => `${(val / 1000).toFixed(2)}ms`.padStart(9);
    const avg = times => times.reduce((a, b) => a + b, 0) / times.length;

    const left = ` - ${key}: `;
    const indn = ' '.repeat(left.length);
    console.log(left + `${fmt(avg(all))} (all ${all.length})`);
    console.log(indn + `${fmt(avg(worst10pc))} (worst 10%)`);
    console.log(indn + `${fmt(avg(best10pc))} (best 10%)`);
    console.log(indn + `${fmt(avg(middle80pc))} (middle 80%)`);
    console.log(indn + `${fmt(avg(middle50pc))} (middle 50%)`);
  };

  for (const [annotation, cache] of Object.entries(globalCompositeCache)) {
    console.log(`Cached ${annotation}:`);
    showTimes(cache, 'evaluate');
    showTimes(cache, 'read');
  }
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
//
// Please note that this *doesn't* verify that the dependency exists, so
// if you provide the wrong name or it hasn't been set by a previous
// compositional step, the property will be exposed as undefined instead
// of null.
//
export function exposeDependency({dependency}) {
  return {
    annotation: `exposeDependency`,
    flags: {expose: true},

    expose: {
      mapDependencies: {dependency},
      compute: ({dependency}) => dependency,
    },
  };
}

// Exposes a constant value exactly as it is; like exposeDependency, this
// is typically the base of a composition serving as a particular property
// descriptor. It generally follows steps which will conditionally early
// exit with some other value, with the exposeConstant base serving as the
// fallback default value.
export function exposeConstant({value}) {
  return {
    annotation: `exposeConstant`,
    flags: {expose: true},

    expose: {
      options: {value},
      compute: ({'#options': {value}}) => value,
    },
  };
}

// Checks the availability of a dependency and provides the result to later
// steps under '#availability' (by default). This is mainly intended for use
// by the more specific utilities, which you should consider using instead.
// Customize {mode} to select one of these modes, or default to 'null':
//
// * 'null':  Check that the value isn't null (and not undefined either).
// * 'empty': Check that the value is neither null nor an empty array.
//            This will outright error for undefined.
// * 'falsy': Check that the value isn't false when treated as a boolean
//            (nor an empty array). Keep in mind this will also be false
//            for values like zero and the empty string!
//

const availabilityCheckModeInput = {
  validate: oneOf('null', 'empty', 'falsy'),
  defaultValue: 'null',
};

export const withResultOfAvailabilityCheck = templateCompositeFrom({
  annotation: `withResultOfAvailabilityCheck`,

  inputs: {
    from: input(),
    mode: input(availabilityCheckModeInput),
  },

  outputs: ['#availability'],

  steps: () => [
    {
      dependencies: [input('from'), input('mode')],

      compute: (continuation, {
        [input('from')]: dependency,
        [input('mode')]: mode,
      }) => {
        let availability;

        switch (mode) {
          case 'null':
            availability = value !== null && value !== undefined;
            break;

          case 'empty':
            availability = !empty(value);
            break;

          case 'falsy':
            availability = !!value && (!Array.isArray(value) || !empty(value));
            break;
        }

        return continuation({'#availability': availability});
      },
    },
  ],
});

// Exposes a dependency as it is, or continues if it's unavailable.
// See withResultOfAvailabilityCheck for {mode} options!
export const exposeDependencyOrContinue = templateCompositeFrom({
  annotation: `exposeDependencyOrContinue`,

  inputs: {
    dependency: input(),
    mode: input(availabilityCheckModeInput),
  },

  steps: () => [
    withResultOfAvailabilityCheck({
      from: input('dependency'),
      mode: input('mode'),
    }),

    {
      dependencies: ['#availability', input('dependency')],
      compute: (continuation, {
        ['#availability']: availability,
        [input('dependency')]: dependency,
      }) =>
        (availability
          ? continuation.exit(dependency)
          : continuation()),
    },
  ],
});

// Exposes the update value of an {update: true} property as it is,
// or continues if it's unavailable. See withResultOfAvailabilityCheck
// for {mode} options! Also provide {validate} here to conveniently
// set a custom validation check for this property's update value.
export const exposeUpdateValueOrContinue = templateCompositeFrom({
  annotation: `exposeUpdateValueOrContinue`,

  inputs: {
    mode: input(availabilityCheckModeInput),
    validate: input({type: 'function', null: true}),
  },

  update: {
    dependencies: [input.staticValue('validate')],
    compute: ({
      [input.staticValue('validate')]: validate,
    }) =>
      (validate
        ? {validate}
        : {}),
  },

  steps: () => [
    exposeDependencyOrContinue({
      dependency: input.updateValue(),
      mode: input('mode'),
    }),
  ],
});

// Early exits if a dependency isn't available.
// See withResultOfAvailabilityCheck for {mode} options!
export const exitWithoutDependency = templateCompositeFrom({
  annotation: `exitWithoutDependency`,

  inputs: {
    dependency: input(),
    mode: input(availabilityCheckModeInput),
    value: input({null: true}),
  },

  steps: () => [
    withResultOfAvailabilityCheck({
      from: input('dependency'),
      mode: input('mode'),
    }),

    {
      dependencies: ['#availability', input('value')],
      continuation: (continuation, {
        ['#availability']: availability,
        [input('value')]: value,
      }) =>
        (availability
          ? continuation()
          : continuation.exit(value)),
    },
  ],
});

// Early exits if this property's update value isn't available.
// See withResultOfAvailabilityCheck for {mode} options!
export const exitWithoutUpdateValue = templateCompositeFrom({
  annotation: `exitWithoutUpdateValue`,

  inputs: {
    mode: input(availabilityCheckModeInput),
    value: input({defaultValue: null}),
  },

  steps: () => [
    exitWithoutDependency({
      dependency: input.updateValue(),
      mode: input('mode'),
    }),
  ],
});

// Raises if a dependency isn't available.
// See withResultOfAvailabilityCheck for {mode} options!
export const raiseOutputWithoutDependency = templateCompositeFrom({
  annotation: `raiseOutputWithoutDependency`,

  inputs: {
    dependency: input(),
    mode: input(availabilityCheckModeInput),
    output: input({defaultValue: {}}),
  },

  steps: () => [
    withResultOfAvailabilityCheck({
      from: input('dependency'),
      mode: input('mode'),
    }),

    {
      dependencies: ['#availability', input('output')],
      compute: (continuation, {
        ['#availability']: availability,
        [input('output')]: output,
      }) =>
        (availability
          ? continuation()
          : continuation.raiseOutputAbove(output)),
    },
  ],
});

// Raises if this property's update value isn't available.
// See withResultOfAvailabilityCheck for {mode} options!
export const raiseOutputWithoutUpdateValue = templateCompositeFrom({
  annotation: `raiseOutputWithoutUpdateValue`,

  inputs: {
    mode: input(availabilityCheckModeInput),
    output: input({defaultValue: {}}),
  },

  steps: () => [
    withResultOfAvailabilityCheck({
      from: input.updateValue(),
      mode: input('mode'),
    }),

    {
      dependencies: ['#availability', input('output')],
      compute: (continuation, {
        ['#availability']: availability,
        [input('output')]: output,
      }) =>
        (availability
          ? continuation()
          : continuation.raiseOutputAbove(output)),
    },
  ],
});

// Gets a property of some object (in a dependency) and provides that value.
// If the object itself is null, or the object doesn't have the listed property,
// the provided dependency will also be null.
export const withPropertyFromObject = templateCompositeFrom({
  annotation: `withPropertyFromObject`,

  inputs: {
    object: input({type: 'object', null: true}),
    property: input({type: 'string'}),
  },

  outputs: ({
    [input.staticDependency('object')]: object,
    [input.staticValue('property')]: property,
  }) => {
    return [
      (object && property
        ? (object.startsWith('#')
            ? `${object}.${property}`
            : `#${object}.${property}`)
        : '#value'),
    ];
  },

  steps: () => [
    {
      dependencies: [
        input.staticDependency('object'),
        input.staticValue('property'),
      ],

      compute: (continuation, {
        [input.staticDependency('object')]: object,
        [input.staticValue('property')]: property,
      }) => continuation({
        '#output':
          (object && property
            ? (object.startsWith('#')
                ? `${object}.${property}`
                : `#${object}.${property}`)
            : '#value'),
      }),
    },

    {
      dependencies: [
        '#output',
        input('object'),
        input('property'),
      ],

      compute: (continuation, {
        ['#output']: output,
        [input('object')]: object,
        [input('property')]: property,
      }) => continuation({
        [output]:
          (object === null
            ? null
            : object[property] ?? null),
      }),
    },
  ],
});

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

      compute: (continuation, {object, '#options': {prefix, properties}}) =>
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

      compute(continuation, {list, '#options': {property}}) {
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

      compute(continuation, {list, '#options': {prefix, properties}}) {
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

        compute: (continuation, {list, dependency}) =>
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

        compute: (continuation, {list, '#options': {value}}) =>
          continuation({
            into: list.map(item => item ?? value),
          }),
      },
    };
  }
}

// Filters particular values out of a list. Note that this will always
// completely skip over null, but can be used to filter out any other
// primitive or object value.
export const excludeFromList = templateCompositeFrom({
  annotation: `excludeFromList`,

  inputs: {
    list: input(),

    item: input({null: true}),
    items: input({validate: isArray, null: true}),
  },

  outputs: ({
    [input.staticDependency('list')]: list,
  }) => [list ?? '#list'],

  steps: () => [
    {
      dependencies: [
        input.staticDependency('list'),
        input('list'),
        input('item'),
        input('items'),
      ],

      compute: (continuation, {
        [input.staticDependency('list')]: listName,
        [input('list')]: listContents,
        [input('item')]: excludeItem,
        [input('items')]: excludeItems,
      }) => continuation({
        [listName ?? '#list']:
          listContents.filter(item => {
            if (excludeItem !== null && item === excludeItem) return false;
            if (!empty(excludeItems) && excludeItems.includes(item)) return false;
            return true;
          }),
      }),
    },
  ],
});

// Flattens an array with one level of nested arrays, providing as dependencies
// both the flattened array as well as the original starting indices of each
// successive source array.
export const withFlattenedList = templateCompositeFrom({
  annotation: `withFlattenedList`,

  inputs: {
    list: input({type: 'array'}),
  },

  outputs: ['#flattenedList', '#flattenedIndices'],

  steps: () => [
    {
      dependencies: [input('list')],
      compute(continuation, {
        [input('list')]: sourceList,
      }) {
        const flattenedList = sourceList.flat();
        const indices = [];
        let lastEndIndex = 0;
        for (const {length} of sourceArray) {
          indices.push(lastEndIndex);
          lastEndIndex += length;
        }

        return continuation({
          ['#flattenedList']: flattenedList,
          ['#flattenedIndices']: indices,
        });
      },
    },
  ],
});

// After mapping the contents of a flattened array in-place (being careful to
// retain the original indices by replacing unmatched results with null instead
// of filtering them out), this function allows for recombining them. It will
// filter out null and undefined items by default (pass {filter: false} to
// disable this).
export const withUnflattenedList = templateCompositeFrom({
  annotation: `withUnflattenedList`,

  inputs: {
    list: input({
      type: 'array',
      defaultDependency: '#flattenedList',
    }),

    indices: input({
      validate: validateArrayItems(isWholeNumber),
      defaultDependency: '#flattenedIndices',
    }),

    filter: input({
      type: 'boolean',
      defaultValue: true,
    }),
  },

  outputs: ['#unflattenedList'],

  steps: () => [
    {
      dependencies: [input('list'), input('indices')],
      compute({
        [input('list')]: list,
        [input('indices')]: indices,
        [input('filter')]: filter,
      }) {
        const unflattenedList = [];

        for (let i = 0; i < indices.length; i++) {
          const startIndex = indices[i];
          const endIndex =
            (i === indices.length - 1
              ? list.length
              : indices[i + 1]);

          const values = list.slice(startIndex, endIndex);
          unflattenedList.push(
            (filter
              ? values.filter(value => value !== null && value !== undefined)
              : values));
        }

        return continuation({
          ['#unflattenedList']: unflattenedList,
        });
      },
    },
  ],
});
