// Thing: base class for wiki data types, providing wiki-specific utility
// functions on top of essential CacheableObject behavior.

import {inspect} from 'node:util';

import {colors} from '#cli';
import find from '#find';
import {stitchArrays, unique} from '#sugar';
import {filterMultipleArrays, getKebabCase} from '#wiki-data';
import {oneOf} from '#validators';

import {
  compositeFrom,
  exitWithoutDependency,
  exposeConstant,
  exposeDependency,
  exposeDependencyOrContinue,
  input,
  raiseOutputWithoutDependency,
  templateCompositeFrom,
  withResultOfAvailabilityCheck,
  withPropertiesFromList,
} from '#composite';

import {
  isAdditionalFileList,
  isBoolean,
  isCommentary,
  isColor,
  isContributionList,
  isDate,
  isDimensions,
  isDirectory,
  isDuration,
  isFileExtension,
  isName,
  isString,
  isType,
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

// Plain ol' image dimensions. This is a two-item array of positive integers,
// corresponding to width and height respectively.
export function dimensions() {
  return {
    flags: {update: true, expose: true},
    update: {validate: isDimensions},
  };
}

// Duration! This is a number of seconds, possibly floating point, always
// at minimum zero.
export function duration() {
  return {
    flags: {update: true, expose: true},
    update: {validate: isDuration},
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
  return compositeFrom({
    annotation: `contributionList`,

    update: {validate: isContributionList},

    steps: () => [
      withResolvedContribs({from: input.updateValue()}),
      exposeDependencyOrContinue({dependency: '#resolvedContribs'}),
      exposeConstant({value: []}),
    ],
  });
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

const thingClassInput = {
  validate(thingClass) {
    isType(thingClass, 'function');

    if (!Object.hasOwn(thingClass, Thing.referenceType)) {
      throw new TypeError(`Expected a Thing constructor, missing Thing.referenceType`);
    }

    return true;
  },
};

// A reference list! Keep in mind this is for general references to wiki
// objects of (usually) other Thing subclasses, not specifically leitmotif
// references in tracks (although that property uses referenceList too!).
//
// The underlying function validateReferenceList expects a string like
// 'artist' or 'track', but this utility keeps from having to hard-code the
// string in multiple places by referencing the value saved on the class
// instead.
export const referenceList = templateCompositeFrom({
  annotation: `referenceList`,

  compose: false,

  inputs: {
    class: input(thingClassInput),
    find: input({type: 'function'}),

    // todo: validate
    data: input(),
  },

  update: {
    dependencies: [
      input.staticValue('class'),
    ],

    compute({
      [input.staticValue('class')]: thingClass,
    }) {
      const {[Thing.referenceType]: referenceType} = thingClass;
      return {validate: validateReferenceList(referenceType)};
    },
  },

  steps: () => [
    withResolvedReferenceList({
      list: input.updateValue(),
      data: input('data'),
      find: input('find'),
    }),

    exposeDependency({dependency: '#resolvedReferenceList'}),
  ],
});

// Corresponding function for a single reference.
export const singleReference = templateCompositeFrom({
  annotation: `singleReference`,

  compose: false,

  inputs: {
    class: input(thingClassInput),
    find: input({type: 'function'}),

    // todo: validate
    data: input(),
  },

  update: {
    dependencies: [
      input.staticValue('class'),
    ],

    compute({
      [input.staticValue('class')]: thingClass,
    }) {
      const {[Thing.referenceType]: referenceType} = thingClass;
      return {validate: validateReference(referenceType)};
    },
  },

  steps: () => [
    withResolvedReference({
      ref: input.updateValue(),
      data: input('data'),
      find: input('findFunction'),
    }),

    exposeDependency({dependency: '#resolvedReference'}),
  ],
});

// Nice 'n simple shorthand for an exposed-only flag which is true when any
// contributions are present in the specified property.
export const contribsPresent = templateCompositeFrom({
  annotation: `contribsPresent`,

  compose: false,

  inputs: {
    contribs: input({type: 'string'}),
  },

  steps: () => [
    withResultOfAvailabilityCheck({
      fromDependency: input('contribs'),
      mode: input.value('empty'),
    }),

    exposeDependency({dependency: '#availability'}),
  ],
});

// Neat little shortcut for "reversing" the reference lists stored on other
// things - for example, tracks specify a "referenced tracks" property, and
// you would use this to compute a corresponding "referenced *by* tracks"
// property. Naturally, the passed ref list property is of the things in the
// wiki data provided, not the requesting Thing itself.
export const reverseReferenceList = templateCompositeFrom({
  annotation: `reverseReferenceList`,

  compose: false,

  inputs: {
    // todo: validate
    data: input(),

    list: input({type: 'string'}),
  },

  steps: () => [
    withReverseReferenceList({
      data: input('data'),
      list: input('list'),
    }),

    exposeDependency({dependency: '#reverseReferenceList'}),
  ],
});

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
export const commentatorArtists = templateCompositeFrom({
  annotation: `commentatorArtists`,

  compose: false,

  steps: () => [
    exitWithoutDependency({
      dependency: 'commentary',
      mode: input.value('falsy'),
      value: input.value([]),
    }),

    {
      dependencies: ['commentary'],
      compute: (continuation, {commentary}) =>
        continuation({
          '#artistRefs':
            Array.from(
              commentary
                .replace(/<\/?b>/g, '')
                .matchAll(/<i>(?<who>.*?):<\/i>/g))
              .map(({groups: {who}}) => who),
        }),
    },

    withResolvedReferenceList({
      list: '#artistRefs',
      data: 'artistData',
      find: input.value(find.artist),
    }).outputs({
      '#resolvedReferenceList': '#artists',
    }),

    {
      flags: {expose: true},

      expose: {
        dependencies: ['#artists'],
        compute: ({'#artists': artists}) =>
          unique(artists),
      },
    },
  ],
});

// Compositional utilities

// Resolves the contribsByRef contained in the provided dependency,
// providing (named by the second argument) the result. "Resolving"
// means mapping the "who" reference of each contribution to an artist
// object, and filtering out those whose "who" doesn't match any artist.
export const withResolvedContribs = templateCompositeFrom({
  annotation: `withResolvedContribs`,

  inputs: {
    // todo: validate
    from: input(),

    findFunction: input({type: 'function'}),

    notFoundMode: input({
      validate: oneOf('exit', 'filter', 'null'),
      defaultValue: 'null',
    }),
  },

  outputs: {
    into: '#resolvedContribs',
  },

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: input('from'),
      mode: input.value('empty'),
      output: input.value({into: []}),
    }),

    withPropertiesFromList({
      list: input('from'),
      properties: input.value(['who', 'what']),
      prefix: input.value('#contribs'),
    }),

    withResolvedReferenceList({
      list: '#contribs.who',
      data: 'artistData',
      into: '#contribs.who',
      find: input('find'),
      notFoundMode: input('notFoundMode'),
    }),

    {
      dependencies: ['#contribs.who', '#contribs.what'],

      compute(continuation, {
        ['#contribs.who']: who,
        ['#contribs.what']: what,
      }) {
        filterMultipleArrays(who, what, (who, _what) => who);
        return continuation({
          '#composition.into': stitchArrays({who, what}),
        });
      },
    },
  ],
});

// Shorthand for exiting if the contribution list (usually a property's update
// value) resolves to empty - ensuring that the later computed results are only
// returned if these contributions are present.
export const exitWithoutContribs = templateCompositeFrom({
  annotation: `exitWithoutContribs`,

  inputs: {
    // todo: validate
    contribs: input(),

    value: input({null: true}),
  },

  steps: () => [
    withResolvedContribs({
      from: input('contribs'),
    }),

    withResultOfAvailabilityCheck({
      from: '#resolvedContribs',
      mode: input.value('empty'),
    }),

    {
      dependencies: ['#availability', input('value')],
      compute: (continuation, {
        ['#availability']: availability,
        [input('value')]: value,
      }) =>
        (availability
          ? continuation()
          : continuation.exit(value)),
    },
  ],
});

// Resolves a reference by using the provided find function to match it
// within the provided thingData dependency. This will early exit if the
// data dependency is null, or, if notFoundMode is set to 'exit', if the find
// function doesn't match anything for the reference. Otherwise, the data
// object is provided on the output dependency; or null, if the reference
// doesn't match anything or itself was null to begin with.
export const withResolvedReference = templateCompositeFrom({
  annotation: `withResolvedReference`,

  inputs: {
    // todo: validate
    ref: input(),

    // todo: validate
    data: input(),

    find: input({type: 'function'}),

    notFoundMode: input({
      validate: oneOf('null', 'exit'),
      defaultValue: 'null',
    }),
  },

  outputs: {
    into: '#resolvedReference',
  },

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: input('ref'),
      output: input.value({into: null}),
    }),

    exitWithoutDependency({
      dependency: input('data'),
    }),

    {
      dependencies: [
        input('ref'),
        input('data'),
        input('find'),
        input('notFoundMode'),
      ],

      compute({
        [input('ref')]: ref,
        [input('data')]: data,
        [input('find')]: findFunction,
        [input('notFoundMode')]: notFoundMode,
      }, continuation) {
        const match = findFunction(ref, data, {mode: 'quiet'});

        if (match === null && notFoundMode === 'exit') {
          return continuation.exit(null);
        }

        return continuation.raise({match});
      },
    },
  ],
});

// Resolves a list of references, with each reference matched with provided
// data in the same way as withResolvedReference. This will early exit if the
// data dependency is null (even if the reference list is empty). By default
// it will filter out references which don't match, but this can be changed
// to early exit ({notFoundMode: 'exit'}) or leave null in place ('null').
export const withResolvedReferenceList = templateCompositeFrom({
  annotation: `withResolvedReferenceList`,

  inputs: {
    // todo: validate
    list: input(),

    // todo: validate
    data: input(),

    find: input({type: 'function'}),

    notFoundMode: input({
      validate: oneOf('exit', 'filter', 'null'),
      defaultValue: 'filter',
    }),
  },

  outputs: {
    into: '#resolvedReferenceList',
  },

  steps: () => [
    exitWithoutDependency({
      dependency: input('data'),
      value: input.value([]),
    }),

    raiseOutputWithoutDependency({
      dependency: input('list'),
      mode: input.value('empty'),
      output: input.value({into: []}),
    }),

    {
      dependencies: [input('list'), input('data'), input('find')],
      compute: ({
        [input('list')]: list,
        [input('data')]: data,
        [input('find')]: findFunction,
      }, continuation) =>
        continuation({
          '#matches': list.map(ref => findFunction(ref, data, {mode: 'quiet'})),
        }),
    },

    {
      dependencies: ['#matches'],
      compute: ({'#matches': matches}, continuation) =>
        (matches.every(match => match)
          ? continuation.raise({'#continuation.into': matches})
          : continuation()),
    },

    {
      dependencies: ['#matches', input('notFoundMode')],
      compute({
        ['#matches']: matches,
        [input('notFoundMode')]: notFoundMode,
      }, continuation) {
        switch (notFoundMode) {
          case 'exit':
            return continuation.exit([]);

          case 'filter':
            matches = matches.filter(match => match);
            return continuation.raise({'#continuation.into': matches});

          case 'null':
            matches = matches.map(match => match ?? null);
            return continuation.raise({'#continuation.into': matches});

          default:
            throw new TypeError(`Expected notFoundMode to be exit, filter, or null`);
        }
      },
    },
  ],
});

// Check out the info on reverseReferenceList!
// This is its composable form.
export const withReverseReferenceList = templateCompositeFrom({
  annotation: `withReverseReferenceList`,

  inputs: {
    // todo: validate
    data: input(),

    list: input({type: 'string'}),
  },

  outputs: {
    into: '#reverseReferenceList',
  },

  steps: () => [
    exitWithoutDependency({
      dependency: '#composition.data',
      value: [],
    }),

    {
      dependencies: [
        'this',
        '#composition.data',
        '#composition.refListProperty',
      ],

      compute: ({
        this: thisThing,
        '#composition.data': data,
        '#composition.refListProperty': refListProperty,
      }, continuation) =>
        continuation({
          '#composition.into':
            data.filter(thing => thing[refListProperty].includes(thisThing)),
        }),
    },
  ],
});
