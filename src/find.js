import {inspect} from 'node:util';

import {colors, logWarn} from '#cli';
import {compareObjects, stitchArrays, typeAppearance} from '#sugar';
import thingConstructors from '#things';
import {isFunction, validateArrayItems} from '#validators';
import {getCaseSensitiveKebabCase} from '#wiki-data';

import * as fr from './find-reverse.js';

import {
  tokenKey as findTokenKey,
  boundData as boundFindData,
  boundOptions as boundFindOptions,
} from './find-reverse.js';

export {findTokenKey, boundFindData, boundFindOptions};

export class FindError extends Error {
  constructor(reference, message) {
    super(message);

    this.reference = reference;
  }
}

export class MalformedReferenceFindError extends FindError {
  constructor(reference) {
    const refPart = colors.bright(reference);
    super(reference, `Malformed link reference: ${refPart}`)
  }
}

export class WrongReferenceTypeFindError extends FindError {
  constructor(reference, referenceType, referenceTypes) {
    super(reference,
      `Reference starts with "${referenceType}:", expected ` +
      referenceTypes.map(type => `"${type}:"`).join(', '));
  }
}

export class NoMatchFindError extends FindError {
  constructor(reference) {
    const refPart = colors.bright(reference);
    super(reference, `Didn't match anything for ${refPart}`);
  }
}

export class MultipleMatchesFindError extends FindError {
  constructor(reference, matches) {
    const refPart = colors.bright(reference);
    super(reference,
      `Multiple matches for reference ${refPart}. Please resolve:\n` +
      matches
        .map(match => `- ${inspect(match)}\n`)
        .join('') +
      `Returning null for this reference.`);

    this.matches = matches;
  }
}

export class CapitalizationMismatchFindError extends FindError {
  constructor(matchingName, matchedName) {
    if (matchingName.length === matchedName.length) {
      let a = '', b = '';
      for (let i = 0; i < matchingName.length; i++) {
        if (
          matchingName[i] === matchedName[i] ||
          matchingName[i].toLowerCase() !== matchingName[i].toLowerCase()
        ) {
          a += matchingName[i];
          b += matchedName[i];
        } else {
          a += colors.bright(colors.red(matchingName[i]));
          b += colors.bright(colors.green(matchedName[i]));
        }
      }

      matchingName = a;
      matchedName = b;
    }

    super(matchingName,
      `Provided capitalization differs from the matched name. Please resolve:\n` +
      `- provided: ${matchingName}\n` +
      `- should be: ${matchedName}\n` +
      `Returning null for this reference.`);

    this.matchingName = matchingName;
    this.matchedName = matchedName;
  }
}

function warnOrThrow(mode, error) {
  if (typeof error !== 'object' || !(error instanceof Error)) {
    throw new Error(`Expected an error object`);
  }

  if (mode === 'error') {
    throw error;
  }

  if (mode === 'warn') {
    logWarn(error.message);
  }

  return null;
}

export const keyRefRegex =
  new RegExp(String.raw`^(?:(?<key>[a-z-]*):(?=\S))?(?<ref>.*)$`);

function getFuzzHash(fuzz = {}) {
  if (!fuzz) {
    return 0;
  }

  return (
    fuzz.capitalization << 0 +
    fuzz.kebab << 1
  );
}

export function fuzzName(name, fuzz = {}) {
  if (!fuzz) {
    return name;
  }

  if (fuzz.capitalization) {
    name = name.toLowerCase();
  }

  if (fuzz.kebab) {
    name = getCaseSensitiveKebabCase(name);
  }

  return name;
}

export function nativeGetMatchableNames(thing, _nativeGetMatchableNames) {
  if (thing.nameForReferencingAcrossWiki === null) {
    return [];
  }

  if (thing.nameForReferencingAcrossWiki) {
    return [thing.nameForReferencingAcrossWiki];
  }

  if (thing.name) {
    return [thing.name];
  }

  return [];
}

export function processAvailableMatchesByName(data, fuzz, {
  include = _thing => true,
  getMatchableNames = nativeGetMatchableNames,

  results = Object.create(null),
  multipleNameMatches = Object.create(null),
}) {
  for (const thing of data) {
    if (!include(thing)) continue;

    for (const name of getMatchableNames(thing, nativeGetMatchableNames)) {
      if (typeof name !== 'string') {
        logWarn`Unexpected ${typeAppearance(name)} returned in names for ${inspect(thing)}`;
        continue;
      }

      const normalizedName = fuzzName(name, fuzz);

      if (normalizedName in results) {
        if (normalizedName in multipleNameMatches) {
          multipleNameMatches[normalizedName].push(thing);
        } else {
          multipleNameMatches[normalizedName] = [
            results[normalizedName].thing,
            thing,
          ];
          results[normalizedName] = null;
        }
      } else {
        results[normalizedName] = {thing, name};
      }
    }
  }

  return {results, multipleNameMatches};
}

export function nativeGetMatchableDirectories(thing, _nativeGetMatchableDirectories) {
  if (thing.directory) {
    return [thing.directory];
  } else {
    return [];
  }
}

export function processAvailableMatchesByDirectory(data, {
  include = _thing => true,
  getMatchableDirectories = nativeGetMatchableDirectories,

  results = Object.create(null),
}) {
  for (const thing of data) {
    if (!include(thing, thingConstructors)) continue;

    for (const directory of getMatchableDirectories(thing, nativeGetMatchableDirectories)) {
      if (typeof directory !== 'string') {
        logWarn`Unexpected ${typeAppearance(directory)} returned in directories for ${inspect(thing)}`;
        continue;
      }

      results[directory] = {thing, directory};
    }
  }

  return {results};
}

export function processAllAvailableMatches(data, fuzz, spec) {
  const {results: byName, multipleNameMatches} =
    processAvailableMatchesByName(data, fuzz, spec);

  const {results: byDirectory} =
    processAvailableMatchesByDirectory(data, spec);

  return {byName, byDirectory, multipleNameMatches};
}

export function prepareMatchByName(mode, fuzz, {byName, multipleNameMatches}) {
  return (name) => {
    const normalizedName = fuzzName(name, fuzz);
    const match = byName[normalizedName];

    if (match) {
      return match.thing;
    } else if (multipleNameMatches[normalizedName]) {
      return warnOrThrow(mode,
        new MultipleMatchesFindError(name, multipleNameMatches[normalizedName]));
    } else {
      return null;
    }
  };
}

export function prepareMatchByDirectory(mode, {referenceTypes, byDirectory}) {
  return (referenceType, directory) => {
    if (!referenceTypes.includes(referenceType)) {
      return warnOrThrow(mode,
        new WrongReferenceTypeFindError(
            `${referenceType}:${directory}`,
          referenceType,
          referenceTypes));
    }

    const match = byDirectory[directory];

    if (match) {
      return match.thing;
    } else {
      return null;
    }
  };
}

function matchHelper(fullRef, mode, {
  matchByDirectory = (_referenceType, _directory) => null,
  matchByName = (_name) => null,
}) {
  const regexMatch = fullRef.match(keyRefRegex);
  if (!regexMatch) {
    return warnOrThrow(mode, new MalformedReferenceFindError(fullRef));
  }

  const {key: keyPart, ref: refPart} = regexMatch.groups;

  const match =
    (keyPart
      ? matchByDirectory(keyPart, refPart)
      : matchByName(refPart));

  if (match) {
    return match;
  } else {
    return warnOrThrow(mode, new NoMatchFindError(fullRef));
  }
}

function findHelper({
  referenceTypes,

  byob = undefined,

  include = undefined,
  getMatchableNames = undefined,
  getMatchableDirectories = undefined,
}) {
  // Note: This cache explicitly *doesn't* support mutable data arrays. If the
  // data array is modified, make sure it's actually a new array object, not
  // the original, or the cache here will break and act as though the data
  // hasn't changed!
  const cache = new WeakMap();

  const entry = (fullRef, data, opts = {}) => {
    if (!fullRef) return null;

    const {
      // The mode argument here may be 'warn', 'error', or 'quiet'. 'error' throws
      // errors for null matches (with details about the error), while 'warn' and
      // 'quiet' both return null, with 'warn' logging details directly to the
      // console.
      mode = 'warn',

      from = null,

      fuzz = {
        capitalization: false,
        kebab: false,
      },
    } = opts;

    if (typeof fullRef !== 'string') {
      throw new TypeError(`Expected a string, got ${typeAppearance(fullRef)}`);
    }

    if (!data) {
      throw new TypeError(`Expected data to be present`);
    }

    if (byob) {
      let match = null;

      try {
        match = byob(fullRef, data, {mode, from, fuzz});
      } catch (caught) {
        if (typeof caught === 'string') {
          return warnOrThrow(mode, new Error(caught));
        } else {
          throw caught;
        }
      }

      if (match) {
        return match;
      } else {
        return warnOrThrow(mode, NoMatchFindError(fullRef));
      }
    }

    let dataSubcache = cache.get(data);
    if (!dataSubcache) {
      cache.set(data, dataSubcache = new Map());
    }

    const fuzzHash = getFuzzHash(fuzz);
    let fuzzSubcache = dataSubcache.get(fuzzHash);
    if (!fuzzSubcache) {
      dataSubcache.set(fuzzHash, fuzzSubcache =
        processAllAvailableMatches(data, fuzz, {
          include,
          getMatchableNames,
          getMatchableDirectories,
        }));
    }

    const {byDirectory, byName, multipleNameMatches} = fuzzSubcache;

    let match, matchError;
    try {
      match =
        matchHelper(fullRef, mode, {
          matchByDirectory:
            prepareMatchByDirectory(mode, {
              referenceTypes,
              byDirectory,
            }),

          matchByName:
            prepareMatchByName(mode, fuzz, {
              byName,
              multipleNameMatches,
            }),
        });
    } catch (caughtError) {
      match = null;
      matchError = caughtError;
    }

    if (match) {
      return match;
    }

    if (!fuzz?.capitalization && !fullRef.match(keyRefRegex)?.groups.key) {
      let miscapitalizedMatch;

      try {
        miscapitalizedMatch =
          entry(fullRef, data, {
            ...opts,
            fuzz: {
              ...fuzz ?? {},
              capitalization: true,
            },
          });
      } catch {
        miscapitalizedMatch = null;
      }

      if (miscapitalizedMatch) {
        return warnOrThrow(mode,
          new CapitalizationMismatchFindError(
            fullRef,
            miscapitalizedMatch.name));
      }
    }

    if (matchError) {
      throw matchError;
    } else {
      return null;
    }
  };

  return entry;
}

const hardcodedFindSpecs = {
  // Listings aren't Thing objects, so this find spec isn't provided by any
  // Thing constructor.
  listing: {
    referenceTypes: ['listing'],
    bindTo: 'listingSpec',

    // TODO: find functions (including a would-be "include" part of this spec)
    // don't get called with direct access to the entire wikiData object, so
    // there's no way to check a listing's condition here. Listing things will
    // take care of this later.
  },
};

const findReverseHelperConfig = {
  word: `find`,
  constructorKey: Symbol.for('Thing.findSpecs'),

  hardcodedSpecs: hardcodedFindSpecs,
  postprocessSpec: postprocessFindSpec,
};

export function postprocessFindSpec(spec, {thingConstructor}) {
  const newSpec = {...spec};

  // Default behavior is to find only instances of the constructor.
  // This symbol field lets a spec opt out.
  if (spec[Symbol.for('Thing.findThisThingOnly')] !== false) {
    if (spec.include) {
      const oldInclude = spec.include;
      newSpec.include = (thing, ...args) =>
        thing instanceof thingConstructor &&
        oldInclude(thing, ...args);
    } else {
      newSpec.include = thing =>
        thing instanceof thingConstructor;
    }
  }

  return newSpec;
}

export function getAllFindSpecs() {
  return fr.getAllSpecs(findReverseHelperConfig);
}

export function findFindSpec(key) {
  return fr.findSpec(key, findReverseHelperConfig);
}

function findMixedHelper(config) {
  const
    keys = Object.keys(config),
    tokens = Object.values(config),
    specKeys = tokens.map(token => token[findTokenKey]),
    specs = specKeys.map(specKey => findFindSpec(specKey));

  const cache = new WeakMap();

  return (fullRef, data, {mode = 'warn'} = {}) => {
    if (!fullRef) return null;

    if (typeof fullRef !== 'string') {
      throw new TypeError(`Expected a string, got ${typeAppearance(fullRef)}`);
    }

    if (!data) {
      throw new TypeError(`Expected data to be present`);
    }

    let subcache = cache.get(data);
    if (!subcache) {
      const byName = Object.create(null);
      const multipleNameMatches = Object.create(null);

      for (const spec of specs) {
        processAvailableMatchesByName(data, null, {
          ...spec,

          results: byName,
          multipleNameMatches,
        });
      }

      const byDirectory =
        Object.fromEntries(
          stitchArrays({
            referenceType: keys,
            spec: specs,
          }).map(({referenceType, spec}) => [
              referenceType,
              processAvailableMatchesByDirectory(data, spec).results,
            ]));

      subcache = {byName, multipleNameMatches, byDirectory};
      cache.set(data, subcache);
    }

    const {byName, multipleNameMatches, byDirectory} = subcache;

    return matchHelper(fullRef, mode, {
      matchByDirectory: (referenceType, directory) => {
        if (!keys.includes(referenceType)) {
          return oopsWrongReferenceType(mode, {
            referenceType,
            referenceTypes: keys,
          });
        }

        const match = byDirectory[referenceType][directory];

        if (match) {
          return match.thing;
        } else {
          return null;
        }
      },

      matchByName:
        prepareMatchByName(mode, null, {
          byName,
          multipleNameMatches,
        }),
    });
  };
}

const findMixedStore = new Map();

export function findMixed(config) {
  for (const key of findMixedStore.keys()) {
    if (compareObjects(key, config)) {
      return findMixedStore.get(key);
    }
  }

  // Validate that this is a valid config to begin with - we can do this
  // before find specs are actually available.
  const tokens = Object.values(config);

  try {
    validateArrayItems(token => {
      isFunction(token);

      if (token[boundFindData])
        throw new Error(`find.mixed doesn't work with bindFind yet`);

      if (!token[findTokenKey])
        throw new Error(`missing findTokenKey, is this actually a find.thing token?`);

      return true;
    })(tokens);
  } catch (caughtError) {
    throw new Error(
      `Expected find.mixed mapping to include valid find.thing tokens only`,
      {cause: caughtError});
  }

  let behavior = (...args) => {
    // findMixedHelper will error if find specs aren't available yet,
    // canceling overwriting `behavior` here.
    return (behavior = findMixedHelper(config))(...args);
  };

  findMixedStore.set(config, (...args) => behavior(...args));
  return findMixedStore.get(config);
}

export default fr.tokenProxy({
  findSpec: findFindSpec,
  prepareBehavior: findHelper,

  handle(key) {
    if (key === 'mixed') {
      return findMixed;
    }
  },
});

// Handy utility function for binding the find.thing() functions to a complete
// wikiData object, optionally taking default options to provide to the find
// function. Note that this caches the arrays read from wikiData right when it's
// called, so if their values change, you'll have to continue with a fresh call
// to bindFind.
export function bindFind(wikiData, opts) {
  const boundFind = fr.bind(wikiData, opts, {
    getAllSpecs: getAllFindSpecs,
    prepareBehavior: findHelper,
  });

  boundFind.mixed = findMixed;

  return boundFind;
}
