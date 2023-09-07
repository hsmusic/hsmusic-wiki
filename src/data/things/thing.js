// Thing: base class for wiki data types, providing wiki-specific utility
// functions on top of essential CacheableObject behavior.

import {inspect} from 'node:util';

import {colors} from '#cli';
import find from '#find';
import {empty, stitchArrays} from '#sugar';
import {filterMultipleArrays, getKebabCase} from '#wiki-data';

import {
  compositeFrom,
  exitWithoutDependency,
  exposeConstant,
  exposeDependency,
  exposeDependencyOrContinue,
  raiseWithoutDependency,
  withUpdateValueAsDependency,
} from '#composite';

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

  // Default custom inspect function, which may be overridden by Thing
  // subclasses. This will be used when displaying aggregate errors and other
  // command-line logging - it's the place to provide information useful in
  // identifying the Thing being presented.
  [inspect.custom]() {
    const cname = this.constructor.name;

    return (
      (this.name ? `${cname} ${colors.green(`"${this.name}"`)}` : `${cname}`) +
      (this.directory ? ` (${colors.blue(Thing.getReference(this))})` : '')
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
}

// Property descriptor templates
//
// Regularly reused property descriptors, for ease of access and generally
// duplicating less code across wiki data types. These are specialized utility
// functions, so check each for how its own arguments behave!

export function name(defaultName) {
  return {
    flags: {update: true, expose: true},
    update: {validate: isName, default: defaultName},
  };
}

export function color() {
  return {
    flags: {update: true, expose: true},
    update: {validate: isColor},
  };
}

export function directory() {
  return {
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
  };
}

export function urls() {
  return {
    flags: {update: true, expose: true},
    update: {validate: validateArrayItems(isURL)},
    expose: {transform: (value) => value ?? []},
  };
}

// A file extension! Or the default, if provided when calling this.
export function fileExtension(defaultFileExtension = null) {
  return {
    flags: {update: true, expose: true},
    update: {validate: isFileExtension},
    expose: {transform: (value) => value ?? defaultFileExtension},
  };
}

// Straightforward flag descriptor for a variety of property purposes.
// Provide a default value, true or false!
export function flag(defaultValue = false) {
  // TODO:                        ^ Are you actually kidding me
  if (typeof defaultValue !== 'boolean') {
    throw new TypeError(`Always set explicit defaults for flags!`);
  }

  return {
    flags: {update: true, expose: true},
    update: {validate: isBoolean, default: defaultValue},
  };
}

// General date type, used as the descriptor for a bunch of properties.
// This isn't dynamic though - it won't inherit from a date stored on
// another object, for example.
export function simpleDate() {
  return {
    flags: {update: true, expose: true},
    update: {validate: isDate},
  };
}

// General string type. This should probably generally be avoided in favor
// of more specific validation, but using it makes it easy to find where we
// might want to improve later, and it's a useful shorthand meanwhile.
export function simpleString() {
  return {
    flags: {update: true, expose: true},
    update: {validate: isString},
  };
}

// External function. These should only be used as dependencies for other
// properties, so they're left unexposed.
export function externalFunction() {
  return {
    flags: {update: true},
    update: {validate: (t) => typeof t === 'function'},
  };
}

// Strong 'n sturdy contribution list, rolling a list of references (provided
// as this property's update value) and the resolved results (as get exposed)
// into one property. Update value will look something like this:
//
//   [
//     {who: 'Artist Name', what: 'Viola'},
//     {who: 'artist:john-cena', what: null},
//     ...
//   ]
//
// ...typically as processed from YAML, spreadsheet, or elsewhere.
// Exposes as the same, but with the "who" replaced with matches found in
// artistData - which means this always depends on an `artistData` property
// also existing on this object!
//
export function contributionList() {
  return compositeFrom(`contributionList`, [
    withUpdateValueAsDependency(),
    withResolvedContribs({from: '#updateValue'}),
    exposeDependencyOrContinue({dependency: '#resolvedContribs'}),
    exposeConstant({
      value: [],
      update: {validate: isContributionList},
    }),
  ]);
}

// Artist commentary! Generally present on tracks and albums.
export function commentary() {
  return {
    flags: {update: true, expose: true},
    update: {validate: isCommentary},
  };
}

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
export function additionalFiles() {
  return {
    flags: {update: true, expose: true},
    update: {validate: isAdditionalFileList},
    expose: {
      transform: (additionalFiles) =>
        additionalFiles ?? [],
    },
  };
}

// A reference list! Keep in mind this is for general references to wiki
// objects of (usually) other Thing subclasses, not specifically leitmotif
// references in tracks (although that property uses referenceList too!).
//
// The underlying function validateReferenceList expects a string like
// 'artist' or 'track', but this utility keeps from having to hard-code the
// string in multiple places by referencing the value saved on the class
// instead.
export function referenceList({
  class: thingClass,
  data,
  find,
}) {
  if (!thingClass) {
    throw new TypeError(`Expected a Thing class`);
  }

  const {[Thing.referenceType]: referenceType} = thingClass;
  if (!referenceType) {
    throw new Error(`The passed constructor ${thingClass.name} doesn't define Thing.referenceType!`);
  }

  return compositeFrom(`referenceList`, [
    withUpdateValueAsDependency(),

    withResolvedReferenceList({
      data, find,
      list: '#updateValue',
      notFoundMode: 'filter',
    }),

    exposeDependency({
      dependency: '#resolvedReferenceList',
      update: {
        validate: validateReferenceList(referenceType),
      },
    }),
  ]);
}

// Corresponding function for a single reference.
export function singleReference({
  class: thingClass,
  data,
  find,
}) {
  if (!thingClass) {
    throw new TypeError(`Expected a Thing class`);
  }

  const {[Thing.referenceType]: referenceType} = thingClass;
  if (!referenceType) {
    throw new Error(`The passed constructor ${thingClass.name} doesn't define Thing.referenceType!`);
  }

  return compositeFrom(`singleReference`, [
    withUpdateValueAsDependency(),

    withResolvedReference({ref: '#updateValue', data, find}),

    exposeDependency({
      dependency: '#resolvedReference',
      update: {
        validate: validateReference(referenceType),
      },
    }),
  ]);
}

// Nice 'n simple shorthand for an exposed-only flag which is true when any
// contributions are present in the specified property.
export function contribsPresent(contribsProperty) {
  return {
    flags: {expose: true},
    expose: {
      dependencies: [contribsProperty],
      compute: ({[contribsProperty]: contribs}) =>
        !empty(contribs),
    },
  };
}

// Neat little shortcut for "reversing" the reference lists stored on other
// things - for example, tracks specify a "referenced tracks" property, and
// you would use this to compute a corresponding "referenced *by* tracks"
// property. Naturally, the passed ref list property is of the things in the
// wiki data provided, not the requesting Thing itself.
export function reverseReferenceList({data, list}) {
  return compositeFrom(`reverseReferenceList`, [
    withReverseReferenceList({data, list}),
    exposeDependency({dependency: '#reverseReferenceList'}),
  ]);
}

// General purpose wiki data constructor, for properties like artistData,
// trackData, etc.
export function wikiData(thingClass) {
  return {
    flags: {update: true},
    update: {
      validate: validateArrayItems(validateInstanceOf(thingClass)),
    },
  };
}

// This one's kinda tricky: it parses artist "references" from the
// commentary content, and finds the matching artist for each reference.
// This is mostly useful for credits and listings on artist pages.
export function commentatorArtists(){
  return {
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
  };
}

// Compositional utilities

// Resolves the contribsByRef contained in the provided dependency,
// providing (named by the second argument) the result. "Resolving"
// means mapping the "who" reference of each contribution to an artist
// object, and filtering out those whose "who" doesn't match any artist.
export function withResolvedContribs({
  from,
  into = '#resolvedContribs',
}) {
  return compositeFrom(`withResolvedContribs`, [
    raiseWithoutDependency({
      dependency: from,
      mode: 'empty',
      map: {into},
      raise: {into: []},
    }),

    {
      mapDependencies: {from},
      compute: ({from}, continuation) =>
        continuation({
          '#artistRefs': from.map(({who}) => who),
          '#what': from.map(({what}) => what),
        }),
    },

    withResolvedReferenceList({
      list: '#artistRefs',
      data: 'artistData',
      into: '#who',
      find: find.artist,
      notFoundMode: 'null',
    }),

    {
      dependencies: ['#who', '#what'],
      mapContinuation: {into},
      compute({'#who': who, '#what': what}, continuation) {
        filterMultipleArrays(who, what, (who, _what) => who);
        return continuation({
          into: stitchArrays({who, what}),
        });
      },
    },
  ]);
}

// Resolves a reference by using the provided find function to match it
// within the provided thingData dependency. This will early exit if the
// data dependency is null, or, if notFoundMode is set to 'exit', if the find
// function doesn't match anything for the reference. Otherwise, the data
// object is provided on the output dependency; or null, if the reference
// doesn't match anything or itself was null to begin with.
export function withResolvedReference({
  ref,
  data,
  find: findFunction,
  into = '#resolvedReference',
  notFoundMode = 'null',
}) {
  if (!['exit', 'null'].includes(notFoundMode)) {
    throw new TypeError(`Expected notFoundMode to be exit or null`);
  }

  return compositeFrom(`withResolvedReference`, [
    raiseWithoutDependency({
      dependency: ref,
      map: {into},
      raise: {into: null},
    }),

    exitWithoutDependency({
      dependency: data,
    }),

    {
      options: {findFunction, notFoundMode},
      mapDependencies: {ref, data},
      mapContinuation: {match: into},

      compute({ref, data, '#options': {findFunction, notFoundMode}}, continuation) {
        const match = findFunction(ref, data, {mode: 'quiet'});

        if (match === null && notFoundMode === 'exit') {
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
  into = '#resolvedReferenceList',
  notFoundMode = 'filter',
}) {
  if (!['filter', 'exit', 'null'].includes(notFoundMode)) {
    throw new TypeError(`Expected notFoundMode to be filter, exit, or null`);
  }

  return compositeFrom(`withResolvedReferenceList`, [
    exitWithoutDependency({
      dependency: data,
      value: [],
    }),

    raiseWithoutDependency({
      dependency: list,
      mode: 'empty',
      map: {into},
      raise: {into: []},
    }),

    {
      options: {findFunction, notFoundMode},
      mapDependencies: {list, data},
      mapContinuation: {matches: into},

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

// Check out the info on reverseReferenceList!
// This is its composable form.
export function withReverseReferenceList({
  data,
  list: refListProperty,
  into = '#reverseReferenceList',
}) {
  return compositeFrom(`withReverseReferenceList`, [
    exitWithoutDependency({
      dependency: data,
      value: [],
    }),

    {
      dependencies: ['this'],
      mapDependencies: {data},
      mapContinuation: {into},
      options: {refListProperty},

      compute: ({this: thisThing, data, '#options': {refListProperty}}, continuation) =>
        continuation({
          into: data.filter(thing => thing[refListProperty].includes(thisThing)),
        }),
    },
  ]);
}
