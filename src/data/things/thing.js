// Thing: base class for wiki data types, providing wiki-specific utility
// functions on top of essential CacheableObject behavior.

import {inspect} from 'node:util';

import {color} from '#cli';
import find from '#find';
import {empty, openAggregate} from '#sugar';
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
          contribsByRef && artistData
            ? contribsByRef
                .map(({who: ref, what}) => ({
                  who: find.artist(ref, artistData),
                  what,
                }))
                .filter(({who}) => who)
            : [],
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
          contribsByRefProperty,
          thingDataProperty,
          nullerProperty,
          'artistData',
        ].filter(Boolean),

        compute({
          [Thing.instance]: thing,
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
        dependencies: [thingDataProperty],

        compute: ({[thingDataProperty]: thingData, [Thing.instance]: thing}) =>
          thingData?.filter(t => t[referencerRefListProperty].includes(thing)) ?? [],
      },
    }),

    // Corresponding function for single references. Note that the return value
    // is still a list - this is for matching all the objects whose single
    // reference (in the given property) matches this Thing.
    reverseSingleReference: (thingDataProperty, referencerRefListProperty) => ({
      flags: {expose: true},

      expose: {
        dependencies: [thingDataProperty],

        compute: ({[thingDataProperty]: thingData, [Thing.instance]: thing}) =>
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
          who: find.artist(who, artistData),
          what,
        }))
        .filter(({who}) => who));
  }

  static composite = {
    from(composition) {
      const base = composition.at(-1);
      const steps = composition.slice(0, -1);

      const aggregate = openAggregate({message: `Errors preparing Thing.composite.from() composition`});

      if (base.flags.compose) {
        aggregate.push(new TypeError(`Base (bottom item) must not be {compose: true}`));
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
                exposeDependencies.add(dependency);
              }
            }

            if (base.flags.update) {
              if (step.expose.transform) {
                exposeFunctionOrder.push({type: 'transform', fn: step.expose.transform});
              } else {
                exposeFunctionOrder.push({type: 'compute', fn: step.expose.compute});
              }
            } else {
              if (step.expose.transform && !step.expose.compute) {
                push(new TypeError(`Steps which only transform can't be composed with a non-updating base`));
                break expose;
              }

              exposeFunctionOrder.push({type: 'compute', fn: step.expose.compute});
            }
          }
        });
      }

      aggregate.close();

      const constructedDescriptor = {};

      constructedDescriptor.flags = {
        update: !!base.flags.update,
        expose: !!base.flags.expose,
        compose: false,
      };

      if (base.flags.update) {
        constructedDescriptor.update = base.flags.update;
      }

      if (base.flags.expose) {
        const expose = constructedDescriptor.expose = {};
        expose.dependencies = Array.from(exposeDependencies);

        const continuationSymbol = Symbol();

        if (base.flags.update) {
          expose.transform = (value, initialDependencies) => {
            const dependencies = {...initialDependencies};
            let valueSoFar = value;

            for (const {type, fn} of exposeFunctionOrder) {
              const result =
                (type === 'transform'
                  ? fn(valueSoFar, dependencies, (updatedValue, providedDependencies) => {
                      valueSoFar = updatedValue ?? null;
                      Object.assign(dependencies, providedDependencies ?? {});
                      return continuationSymbol;
                    })
                  : fn(dependencies, providedDependencies => {
                      Object.assign(dependencies, providedDependencies ?? {});
                      return continuationSymbol;
                    }));

              if (result !== continuationSymbol) {
                return result;
              }
            }

            if (base.expose.transform) {
              return base.expose.transform(valueSoFar, dependencies);
            } else {
              return base.expose.compute(dependencies);
            }
          };
        } else {
          expose.compute = (initialDependencies) => {
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

            return base.expose.compute(dependencies);
          };
        }
      }

      return constructedDescriptor;
    },
  };
}
