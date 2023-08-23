// Thing: base class for wiki data types, providing wiki-specific utility
// functions on top of essential CacheableObject behavior.

import {inspect} from 'node:util';

import {color} from '#cli';
import find from '#find';
import {empty, filterProperties, openAggregate} from '#sugar';
import {getKebabCase} from '#wiki-data';

import {
  isAdditionalFileList,
  isBoolean,
  isCommentary,
  isColor,
  isContributionList,
  isDate,
  isDirectory,
  isFileExtension,
  isName,
  isString,
  isURL,
  validateArrayItems,
  validateInstanceOf,
  validateReference,
  validateReferenceList,
} from '#validators';

import CacheableObject from './cacheable-object.js';

export default class Thing extends CacheableObject {
  static referenceType = Symbol('Thing.referenceType');

  static getPropertyDescriptors = Symbol('Thing.getPropertyDescriptors');
  static getSerializeDescriptors = Symbol('Thing.getSerializeDescriptors');

  // Regularly reused property descriptors, for ease of access and generally
  // duplicating less code across wiki data types. These are specialized utility
  // functions, so check each for how its own arguments behave!
  static common = {
    name: (defaultName) => ({
      flags: {update: true, expose: true},
      update: {validate: isName, default: defaultName},
    }),

    color: () => ({
      flags: {update: true, expose: true},
      update: {validate: isColor},
    }),

    directory: () => ({
      flags: {update: true, expose: true},
      update: {validate: isDirectory},
      expose: {
        dependencies: ['name'],
        transform(directory, {name}) {
          if (directory === null && name === null) return null;
          else if (directory === null) return getKebabCase(name);
          else return directory;
        },
      },
    }),

    urls: () => ({
      flags: {update: true, expose: true},
      update: {validate: validateArrayItems(isURL)},
      expose: {transform: (value) => value ?? []},
    }),

    // A file extension! Or the default, if provided when calling this.
    fileExtension: (defaultFileExtension = null) => ({
      flags: {update: true, expose: true},
      update: {validate: isFileExtension},
      expose: {transform: (value) => value ?? defaultFileExtension},
    }),

    // Straightforward flag descriptor for a variety of property purposes.
    // Provide a default value, true or false!
    flag: (defaultValue = false) => {
      if (typeof defaultValue !== 'boolean') {
        throw new TypeError(`Always set explicit defaults for flags!`);
      }

      return {
        flags: {update: true, expose: true},
        update: {validate: isBoolean, default: defaultValue},
      };
    },

    // General date type, used as the descriptor for a bunch of properties.
    // This isn't dynamic though - it won't inherit from a date stored on
    // another object, for example.
    simpleDate: () => ({
      flags: {update: true, expose: true},
      update: {validate: isDate},
    }),

    // General string type. This should probably generally be avoided in favor
    // of more specific validation, but using it makes it easy to find where we
    // might want to improve later, and it's a useful shorthand meanwhile.
    simpleString: () => ({
      flags: {update: true, expose: true},
      update: {validate: isString},
    }),

    // External function. These should only be used as dependencies for other
    // properties, so they're left unexposed.
    externalFunction: () => ({
      flags: {update: true},
      update: {validate: (t) => typeof t === 'function'},
    }),

    // Super simple "contributions by reference" list, used for a variety of
    // properties (Artists, Cover Artists, etc). This is the property which is
    // externally provided, in the form:
    //
    //     [
    //         {who: 'Artist Name', what: 'Viola'},
    //         {who: 'artist:john-cena', what: null},
    //         ...
    //     ]
    //
    // ...processed from YAML, spreadsheet, or any other kind of input.
    contribsByRef: () => ({
      flags: {update: true, expose: true},
      update: {validate: isContributionList},
    }),

    // Artist commentary! Generally present on tracks and albums.
    commentary: () => ({
      flags: {update: true, expose: true},
      update: {validate: isCommentary},
    }),

    // This is a somewhat more involved data structure - it's for additional
    // or "bonus" files associated with albums or tracks (or anything else).
    // It's got this form:
    //
    //     [
    //         {title: 'Booklet', files: ['Booklet.pdf']},
    //         {
    //             title: 'Wallpaper',
    //             description: 'Cool Wallpaper!',
    //             files: ['1440x900.png', '1920x1080.png']
    //         },
    //         {title: 'Alternate Covers', description: null, files: [...]},
    //         ...
    //     ]
    //
    additionalFiles: () => ({
      flags: {update: true, expose: true},
      update: {validate: isAdditionalFileList},
      expose: {
        transform: (additionalFiles) =>
          additionalFiles ?? [],
      },
    }),

    // A reference list! Keep in mind this is for general references to wiki
    // objects of (usually) other Thing subclasses, not specifically leitmotif
    // references in tracks (although that property uses referenceList too!).
    //
    // The underlying function validateReferenceList expects a string like
    // 'artist' or 'track', but this utility keeps from having to hard-code the
    // string in multiple places by referencing the value saved on the class
    // instead.
    referenceList: (thingClass) => {
      const {[Thing.referenceType]: referenceType} = thingClass;
      if (!referenceType) {
        throw new Error(`The passed constructor ${thingClass.name} doesn't define Thing.referenceType!`);
      }

      return {
        flags: {update: true, expose: true},
        update: {validate: validateReferenceList(referenceType)},
      };
    },

    // Corresponding function for a single reference.
    singleReference: (thingClass) => {
      const {[Thing.referenceType]: referenceType} = thingClass;
      if (!referenceType) {
        throw new Error(`The passed constructor ${thingClass.name} doesn't define Thing.referenceType!`);
      }

      return {
        flags: {update: true, expose: true},
        update: {validate: validateReference(referenceType)},
      };
    },

    // Corresponding dynamic property to referenceList, which takes the values
    // in the provided property and searches the specified wiki data for
    // matching actual Thing-subclass objects.
    dynamicThingsFromReferenceList: (
      referenceListProperty,
      thingDataProperty,
      findFn
    ) => ({
      flags: {expose: true},

      expose: {
        dependencies: [referenceListProperty, thingDataProperty],
        compute: ({
          [referenceListProperty]: refs,
          [thingDataProperty]: thingData,
        }) =>
          refs && thingData
            ? refs
                .map((ref) => findFn(ref, thingData, {mode: 'quiet'}))
                .filter(Boolean)
            : [],
      },
    }),

    // Corresponding function for a single reference.
    dynamicThingFromSingleReference: (
      singleReferenceProperty,
      thingDataProperty,
      findFn
    ) => ({
      flags: {expose: true},

      expose: {
        dependencies: [singleReferenceProperty, thingDataProperty],
        compute: ({
          [singleReferenceProperty]: ref,
          [thingDataProperty]: thingData,
        }) => (ref && thingData ? findFn(ref, thingData, {mode: 'quiet'}) : null),
      },
    }),

    // Corresponding dynamic property to contribsByRef, which takes the values
    // in the provided property and searches the object's artistData for
    // matching actual Artist objects. The computed structure has the same form
    // as contribsByRef, but with Artist objects instead of string references:
    //
    //     [
    //         {who: (an Artist), what: 'Viola'},
    //         {who: (an Artist), what: null},
    //         ...
    //     ]
    //
    // Contributions whose "who" values don't match anything in artistData are
    // filtered out. (So if the list is all empty, chances are that either the
    // reference list is somehow messed up, or artistData isn't being provided
    // properly.)
    dynamicContribs: (contribsByRefProperty) => ({
      flags: {expose: true},
      expose: {
        dependencies: ['artistData', contribsByRefProperty],
        compute: ({artistData, [contribsByRefProperty]: contribsByRef}) =>
          Thing.findArtistsFromContribs(contribsByRef, artistData),
      },
    }),

    // Dynamically inherit a contribution list from some other object, if it
    // hasn't been overridden on this object. This is handy for solo albums
    // where all tracks have the same artist, for example.
    dynamicInheritContribs: (
      // If this property is explicitly false, the contribution list returned
      // will always be empty.
      nullerProperty,

      // Property holding contributions on the current object.
      contribsByRefProperty,

      // Property holding corresponding "default" contributions on the parent
      // object, which will fallen back to if the object doesn't have its own
      // contribs.
      parentContribsByRefProperty,

      // Data array to search in and "find" function to locate parent object
      // (which will be passed the child object and the wiki data array).
      thingDataProperty,
      findFn
    ) => ({
      flags: {expose: true},
      expose: {
        dependencies: [
          'this',
          contribsByRefProperty,
          thingDataProperty,
          nullerProperty,
          'artistData',
        ].filter(Boolean),

        compute({
          this: thing,
          [nullerProperty]: nuller,
          [contribsByRefProperty]: contribsByRef,
          [thingDataProperty]: thingData,
          artistData,
        }) {
          if (!artistData) return [];
          if (nuller === false) return [];
          const refs =
            contribsByRef ??
            findFn(thing, thingData, {mode: 'quiet'})?.[parentContribsByRefProperty];
          if (!refs) return [];
          return refs
            .map(({who: ref, what}) => ({
              who: find.artist(ref, artistData),
              what,
            }))
            .filter(({who}) => who);
        },
      },
    }),

    // Nice 'n simple shorthand for an exposed-only flag which is true when any
    // contributions are present in the specified property.
    contribsPresent: (contribsByRefProperty) => ({
      flags: {expose: true},
      expose: {
        dependencies: [contribsByRefProperty],
        compute({
          [contribsByRefProperty]: contribsByRef,
        }) {
          return !empty(contribsByRef);
        },
      }
    }),

    // Neat little shortcut for "reversing" the reference lists stored on other
    // things - for example, tracks specify a "referenced tracks" property, and
    // you would use this to compute a corresponding "referenced *by* tracks"
    // property. Naturally, the passed ref list property is of the things in the
    // wiki data provided, not the requesting Thing itself.
    reverseReferenceList: (thingDataProperty, referencerRefListProperty) => ({
      flags: {expose: true},

      expose: {
        dependencies: ['this', thingDataProperty],

        compute: ({this: thing, [thingDataProperty]: thingData}) =>
          thingData?.filter(t => t[referencerRefListProperty].includes(thing)) ?? [],
      },
    }),

    // Corresponding function for single references. Note that the return value
    // is still a list - this is for matching all the objects whose single
    // reference (in the given property) matches this Thing.
    reverseSingleReference: (thingDataProperty, referencerRefListProperty) => ({
      flags: {expose: true},

      expose: {
        dependencies: ['this', thingDataProperty],

        compute: ({this: thing, [thingDataProperty]: thingData}) =>
          thingData?.filter((t) => t[referencerRefListProperty] === thing) ?? [],
      },
    }),

    // General purpose wiki data constructor, for properties like artistData,
    // trackData, etc.
    wikiData: (thingClass) => ({
      flags: {update: true},
      update: {
        validate: validateArrayItems(validateInstanceOf(thingClass)),
      },
    }),

    // This one's kinda tricky: it parses artist "references" from the
    // commentary content, and finds the matching artist for each reference.
    // This is mostly useful for credits and listings on artist pages.
    commentatorArtists: () => ({
      flags: {expose: true},

      expose: {
        dependencies: ['artistData', 'commentary'],

        compute: ({artistData, commentary}) =>
          artistData && commentary
            ? Array.from(
                new Set(
                  Array.from(
                    commentary
                      .replace(/<\/?b>/g, '')
                      .matchAll(/<i>(?<who>.*?):<\/i>/g)
                  ).map(({groups: {who}}) =>
                    find.artist(who, artistData, {mode: 'quiet'})
                  )
                )
              )
            : [],
      },
    }),
  };

  // Default custom inspect function, which may be overridden by Thing
  // subclasses. This will be used when displaying aggregate errors and other
  // command-line logging - it's the place to provide information useful in
  // identifying the Thing being presented.
  [inspect.custom]() {
    const cname = this.constructor.name;

    return (
      (this.name ? `${cname} ${color.green(`"${this.name}"`)}` : `${cname}`) +
      (this.directory ? ` (${color.blue(Thing.getReference(this))})` : '')
    );
  }

  static getReference(thing) {
    if (!thing.constructor[Thing.referenceType]) {
      throw TypeError(`Passed Thing is ${thing.constructor.name}, which provides no [Thing.referenceType]`);
    }

    if (!thing.directory) {
      throw TypeError(`Passed ${thing.constructor.name} is missing its directory`);
    }

    return `${thing.constructor[Thing.referenceType]}:${thing.directory}`;
  }

  static findArtistsFromContribs(contribsByRef, artistData) {
    if (empty(contribsByRef)) return null;

    return (
      contribsByRef
        .map(({who, what}) => ({
          who: find.artist(who, artistData, {mode: 'quiet'}),
          what,
        }))
        .filter(({who}) => who));
  }

  static composite = {
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
    // instead of the continuation.
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
    // other compositions) brings about several internal, hash-prefixed
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
    from(firstArg, secondArg) {
      let annotation, composition;
      if (typeof firstArg === 'string') {
        [annotation, composition] = [firstArg, secondArg];
      } else {
        [annotation, composition] = [null, firstArg];
      }

      const base = composition.at(-1);
      const steps = composition.slice(0, -1);

      const aggregate = openAggregate({
        message:
          `Errors preparing Thing.composite.from() composition` +
          (annotation ? ` (${annotation})` : ''),
      });

      if (base.flags.compose && base.flags.compute) {
        push(new TypeError(`Base which composes can't also update yet`));
      }

      const exposeFunctionOrder = [];
      const exposeDependencies = new Set(base.expose?.dependencies);

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const message =
          (step.annotation
            ? `Errors in step #${i + 1} (${step.annotation})`
            : `Errors in step #${i + 1}`);

        aggregate.nest({message}, ({push}) => {
          if (!step.flags.compose) {
            push(new TypeError(`Steps (all but bottom item) must be {compose: true}`));
          }

          if (step.flags.update) {
            push(new Error(`Steps which update aren't supported yet`));
          }

          if (step.flags.expose) expose: {
            if (!step.expose.transform && !step.expose.compute) {
              push(new TypeError(`Steps which expose must provide at least one of transform or compute`));
              break expose;
            }

            if (step.expose.dependencies) {
              for (const dependency of step.expose.dependencies) {
                if (typeof dependency === 'string' && dependency.startsWith('#')) continue;
                exposeDependencies.add(dependency);
              }
            }

            let fn, type;
            if (base.flags.update) {
              if (step.expose.transform) {
                type = 'transform';
                fn = step.expose.transform;
              } else {
                type = 'compute';
                fn = step.expose.compute;
              }
            } else {
              if (step.expose.transform && !step.expose.compute) {
                push(new TypeError(`Steps which only transform can't be composed with a non-updating base`));
                break expose;
              }

              type = 'compute';
              fn = step.expose.compute;
            }

            exposeFunctionOrder.push({
              type,
              fn,
              ownDependencies: step.expose.dependencies,
            });
          }
        });
      }

      aggregate.close();

      const constructedDescriptor = {};

      if (annotation) {
        constructedDescriptor.annotation = annotation;
      }

      constructedDescriptor.flags = {
        update: !!base.flags.update,
        expose: !!base.flags.expose,
        compose: !!base.flags.compose,
      };

      if (base.flags.update) {
        constructedDescriptor.update = base.update;
      }

      if (base.flags.expose) {
        const expose = constructedDescriptor.expose = {};
        expose.dependencies = Array.from(exposeDependencies);

        const continuationSymbol = Symbol();

        if (base.flags.update) {
          expose.transform = (value, initialDependencies) => {
            const dependencies = {...initialDependencies};
            let valueSoFar = value;

            for (const {type, fn, ownDependencies} of exposeFunctionOrder) {
              const filteredDependencies =
                (ownDependencies
                  ? filterProperties(dependencies, ownDependencies)
                  : {})

              const result =
                (type === 'transform'
                  ? fn(valueSoFar, filteredDependencies, (updatedValue, providedDependencies) => {
                      valueSoFar = updatedValue ?? null;
                      Object.assign(dependencies, providedDependencies ?? {});
                      return continuationSymbol;
                    })
                  : fn(filteredDependencies, providedDependencies => {
                      Object.assign(dependencies, providedDependencies ?? {});
                      return continuationSymbol;
                    }));

              if (result !== continuationSymbol) {
                return result;
              }
            }

            const filteredDependencies =
              filterProperties(dependencies, base.expose.dependencies);

            // Note: base.flags.compose is not compatible with base.flags.update,
            // so the base.flags.compose case is not handled here.

            if (base.expose.transform) {
              return base.expose.transform(valueSoFar, filteredDependencies);
            } else {
              return base.expose.compute(filteredDependencies);
            }
          };
        } else {
          expose.compute = (initialDependencies, continuationIfApplicable) => {
            const dependencies = {...initialDependencies};

            for (const {fn} of exposeFunctionOrder) {
              const result =
                fn(dependencies, providedDependencies => {
                  Object.assign(dependencies, providedDependencies ?? {});
                  return continuationSymbol;
                });

              if (result !== continuationSymbol) {
                return result;
              }
            }

            if (base.flags.compose) {
              let exportDependencies;

              const result =
                base.expose.compute(dependencies, providedDependencies => {
                  exportDependencies = providedDependencies;
                  return continuationSymbol;
                });

              if (result !== continuationSymbol) {
                return result;
              }

              return exportDependencies;
            } else {
              return base.expose.compute(dependencies);
            }
          };
        }
      }

      return constructedDescriptor;
    },

    // Provides dependencies exactly as they are (or null if not defined) to the
    // continuation. Although this can *technically* be used to alias existing
    // dependencies to some other name within the middle of a composition, it's
    // intended to be used only as a composition's base - doing so makes the
    // composition as a whole suitable as a step in some other composition,
    // providing the listed (internal) dependencies to later steps just like
    // other compositional steps.
    export(mapping) {
      const mappingEntries = Object.entries(mapping);

      return {
        annotation: `Thing.composite.export`,
        flags: {expose: true, compose: true},

        expose: {
          dependencies: Object.values(mapping),

          compute(dependencies, continuation) {
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

            return continuation(exports);
          }
        },
      };
    },

    // Resolves the contribsByRef contained in the provided dependency,
    // providing (named by the second argument) the result. "Resolving"
    // means mapping the "who" reference of each contribution to an artist
    // object, and filtering out those whose "who" doesn't match any artist.
    withResolvedContribs: ({from: contribsByRefDependency, to: outputDependency}) => ({
      annotation: `Thing.composite.withResolvedContribs`,
      flags: {expose: true, compose: true},

      expose: {
        dependencies: ['artistData', contribsByRefDependency],
        compute: ({artistData, [contribsByRefDependency]: contribsByRef}, callback) =>
          callback({
            [outputDependency]:
              Thing.findArtistsFromContribs(contribsByRef, artistData),
          }),
      },
    }),

    // Resolves a reference by using the provided find function to match it
    // within the provided thingData dependency. This will early exit if the
    // data dependency is null, or, if earlyExitIfNotFound is set to true,
    // if the find function doesn't match anything for the reference.
    // Otherwise, the data object (or null, if not found) is provided on
    // the output dependency.
    withResolvedReference({
      ref: refDependency,
      data: dataDependency,
      to: outputDependency,
      find: findFunction,
      earlyExitIfNotFound = false,
    }) {
      return {
        annotation: `Thing.composite.withResolvedReference`,
        flags: {expose: true, compose: true},

        expose: {
          dependencies: [refDependency, dataDependency],

          compute({[refDependency]: ref, [dataDependency]: data}, continuation) {
            if (data === null) return null;

            const match = findFunction(ref, data, {mode: 'quiet'});
            if (match === null && earlyExitIfNotFound) return null;

            return continuation({[outputDependency]: match});
          },
        },
      };
    }
  };
}
