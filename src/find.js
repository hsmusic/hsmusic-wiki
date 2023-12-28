import {inspect} from 'node:util';

import CacheableObject from '#cacheable-object';
import {colors, logWarn} from '#cli';
import {typeAppearance} from '#sugar';

export const getMatchableNames = Symbol();

function warnOrThrow(mode, message) {
  if (mode === 'error') {
    throw new Error(message);
  }

  if (mode === 'warn') {
    logWarn(message);
  }

  return null;
}

export class ReferenceMapping {
  forwards = new Map();
  backwards = new Map();

  add(...args) {
    if (args.length <= 1 || args.length >= 4) {
      throw new Error(`Expected 2 or 3 arguments for add`);
    }

    return this.addEdge(args[0], args[1], args[2]);
  }

  addEdge(a, b, detail = null) {
    this.#addDoubleNested(this.forwards, a, b, detail);
    this.#addDoubleNested(this.backwards, b, a, detail);
    return this;
  }

  #addDoubleNested(map, key, value, detail) {
    if (!map.has(key)) {
      const set = new Set([detail]);
      const nested = new Map([[value, set]]);
      map.set(key, nested);
      return this;
    }

    const nested = map.get(key);

    if (!nested.has(value)) {
      const set = new Set([detail]);
      nested.set(value, set);
      return this;
    }

    nested.get(value).add(detail);
    return this;
  }

  delete(...args) {
    if (args.length === 1) {
      return this.deleteNode(args[0]);
    } else if (args.length === 2 || args.length === 3) {
      return this.deleteEdge(args[0], args[1], args[2]);
    } else {
      throw new Error(`Expected 1, 2, or 3 arguments for delete`);
    }
  }

  deleteNode(x) {
    const forwardsCopy = new Set(this.forwards.get(x));
    const backwardsCopy = new Set(this.backwards.get(x));

    let deletedAnything = false;

    for (const b of forwardsCopy) {
      if (this.deleteEdge(x, b)) {
        deletedAnything = true;
      }
    }

    for (const a of backwardsCopy) {
      if (this.deleteEdge(a, x)) {
        deletedAnything = true;
      }
    }

    return deletedAnything;
  }

  deleteEdge(a, b, detail = undefined) {
    let deletedAnything = false;

    if (detail === undefined) {
      if (this.#deleteNested(this.forwards, a, b))
        deletedAnything = true;
      if (this.#deleteNested(this.backwards, b, a))
        deletedAnything = true;
    } else {
      if (this.#deleteDoubleNested(this.forwards, a, b, detail))
        deletedAnything = true;
      if (this.#deleteDoubleNested(this.backwards, a, b, detail))
        deletedAnything = true;
    }

    return deletedAnything;
  }

  #deleteNested(map, key, value) {
    if (!map.has(key)) return false;

    const nested = map.get(key);

    if (!nested.has(value)) return false;

    if (nested.size === 1) {
      map.delete(key);
    } else {
      nested.delete(value);
    }

    return true;
  }

  #deleteDoubleNested(map, key, value, detail) {
    if (!map.has(key)) return false;

    const nested = map.get(key);

    if (!nested.has(value)) return false;

    const doubleNested = nested.get(value);

    if (!doubleNested.has(detail)) return false;

    if (doubleNested.size === 1 && nested.size === 1) {
      map.delete(key);
    } else if (doubleNested.size === 1) {
      nested.delete(value);
    } else {
      doubleNested.delete(detail);
    }

    return true;
  }

  has(...args) {
    if (args.length === 1) {
      return this.hasNode(args[0]);
    } else if (args.length === 2 || args.length === 3) {
      return this.hasEdge(args[0], args[1], args[2]);
    } else {
      throw new Error(`Expected 1, 2, or 3 arguments for delete`);
    }
  }

  hasNode(x) {
    return this.forwards.has(x) || this.backwards.has(x);
  }

  hasEdge(a, b, detail = undefined) {
    if (detail === undefined) {
      return (
        this.forwards.has(a) &&
        this.forwards.get(a).has(b));
    } else {
      return (
        this.forwards.has(a) &&
        this.forwards.get(a).has(b) &&
        this.forwards.get(a).get(b).has(detail));
    }
  }

  get(x) {
    return {
      forwards: this.getForwards(x),
      backwards: this.getBackwards(x),
    };
  }

  getForwards(x) {
    return this.forwards.get(x) ?? new Map();
  }

  getBackwards(x) {
    return this.backwards.get(x) ?? new Map();
  }
}

export class FindStore {
  constructor() {
    this.thingMapping = new ReferenceMapping();
    this.metadataMapping = new ReferenceMapping();
  }

  getMatchableKeys(_thing) {
    throw new Error(`getMatchableKeys not implemented`);
  }

  add(thing) {
    const keys = this.getMatchableKeys(thing);

    for (const key of keys) {
      this.mapping.add(key, thing);
    }
  }

  delete(thing) {
    let deletedAnything = false;

    if (this.mapping.delete(thing)) {
      deletedAnything = true;
    }

    return deletedAnything;
  }

  get(key, {
    mode = 'quiet',
  } = {}) {
    const goodMatch = this.goodMapping.getForwards(key);

    if (goodMatch) {
      return goodMatch;
    }

    const badMatch = this.badMapping.getForwards(key);

    if (mode === 'error') {
      if (badMatch) {
        const goodKeys = this.goodMapping.getBackwards()
        throw new WrongFindKeyError(key, );
      }
    }
  }
}

export class FindByNameStore extends FindStore {
  getMatchableKeys(thing) {
    const getMatchableNamesFn = thing[getMatchableNames];

    const nonNormalizedNames =
      (getMatchableNamesFn
        ? getMatchableNamesFn.apply(thing)
        : [thing.name]);

    const good = new Set();
    const bad = new Set();

    for (const nonNormalizedName of nonNormalizedNames) {
      const normalizedName = this.#normalizeName(nonNormalizedName);

      good.add(normalizedName);

      if (normalizedName !== nonNormalizedName) {
        bad.add(nonNormalizedName);
      }
    }

    return {good, bad};
  }

  #normalizeName(name) {
    return name.toLowerCase();
  }
}

export class FindByDirectoryStore extends FindStore {
  getMappingValues(thing) {
    return [thing.directory];
  }
}

export class CachedFind {
  constructor({
    referenceTypes = {},
  } = {}) {
    this.referenceTypes = referenceTypes;

    this.byNameStore = new FindByNameStore();
    this.byDirectoryStore = new FindByDirectoryStore();
  }

  addThing(thing) {
    const {name, directory} = thing;

    if (name in this.byName) {
      this.byName[name].add(thing);
    } else {
      this.byName[name] = new Set([thing]);
    }

    if (directory in this.byDirectory) {
      this.byDirectory[directory].add(thing);
    } else {
      this.byDirectory[directory] = new Set([thing]);
    }
  }

  deleteThing(thing) {
    const {name, directory} = thing;

    if (name in this.byName) {
      this.byName[name].delete(thing);
    }

    if (directory in this.byDirectory) {
      this.byDirectory[directory].delete(thing);
    }
  }
}

export function processAllAvailableMatches(data, {
  include = _thing => true,

  getMatchableNames = thing =>
    (Object.hasOwn(thing, 'name')
      ? [thing.name]
      : []),
} = {}) {
  const byName = Object.create(null);
  const byDirectory = Object.create(null);
  const multipleNameMatches = Object.create(null);

  for (const thing of data) {
    if (!include(thing)) continue;

    byDirectory[thing.directory] = thing;

    for (const name of getMatchableNames(thing)) {
      if (typeof name !== 'string') {
        logWarn`Unexpected ${typeAppearance(name)} returned in names for ${inspect(thing)}`;
        continue;
      }

      const normalizedName = name.toLowerCase();

      if (normalizedName in byName) {
        const alreadyMatchesByName = byName[normalizedName];
        byName[normalizedName] = null;
        if (normalizedName in multipleNameMatches) {
          multipleNameMatches[normalizedName].push(thing);
        } else {
          multipleNameMatches[normalizedName] = [alreadyMatchesByName, thing];
        }
      } else {
        byName[normalizedName] = thing;
      }
    }
  }

  return {byName, byDirectory, multipleNameMatches};
}

function findHelper({
  referenceTypes,

  include = undefined,
  getMatchableNames = undefined,
}) {
  const keyRefRegex =
    new RegExp(String.raw`^(?:(${referenceTypes.join('|')}):(?=\S))?(.*)$`);

  // Note: This cache explicitly *doesn't* support mutable data arrays. If the
  // data array is modified, make sure it's actually a new array object, not
  // the original, or the cache here will break and act as though the data
  // hasn't changed!
  const cache = new WeakMap();

  // The mode argument here may be 'warn', 'error', or 'quiet'. 'error' throws
  // errors for null matches (with details about the error), while 'warn' and
  // 'quiet' both return null, with 'warn' logging details directly to the
  // console.
  return (fullRef, data, {mode = 'warn'}) => {
    if (!fullRef) return null;
    if (typeof fullRef !== 'string') {
      throw new TypeError(`Expected a string, got ${typeAppearance(fullRef)}`);
    }

    if (!data) {
      throw new TypeError(`Expected data to be present`);
    }

    let subcache = cache.get(data);
    if (!subcache) {
      subcache =
        processAllAvailableMatches(data, {
          include,
          getMatchableNames,
        });

      cache.set(data, subcache);
    }

    const regexMatch = fullRef.match(keyRefRegex);
    if (!regexMatch) {
      warnOrThrow(mode, `Malformed link reference: "${fullRef}"`);
    }

    const typePart = regexMatch[1];
    const refPart = regexMatch[2];

    const normalizedName =
      (typePart
        ? null
        : refPart.toLowerCase());

    const match =
      (typePart
        ? subcache.byDirectory[refPart]
        : subcache.byName[normalizedName]);

    if (!match && !typePart) {
      if (subcache.multipleNameMatches[normalizedName]) {
        return warnOrThrow(mode,
          `Multiple matches for reference "${fullRef}". Please resolve:\n` +
          subcache.multipleNameMatches[normalizedName]
            .map(match => `- ${inspect(match)}\n`)
            .join('') +
          `Returning null for this reference.`);
      }
    }

    if (!match) {
      warnOrThrow(mode, `Didn't match anything for ${colors.bright(fullRef)}`);
      return null;
    }

    return match;
  };
}

const find = {
  album: findHelper({
    referenceTypes: ['album', 'album-commentary', 'album-gallery'],
  }),

  artist: findHelper({
    referenceTypes: ['artist', 'artist-gallery'],
  }),

  artTag: findHelper({
    referenceTypes: ['tag'],

    getMatchableNames: tag =>
      (tag.isContentWarning
        ? [`cw: ${tag.name}`]
        : [tag.name]),
  }),

  flash: findHelper({
    referenceTypes: ['flash'],
  }),

  flashAct: findHelper({
    referenceTypes: ['flash-act'],
  }),

  group: findHelper({
    referenceTypes: ['group', 'group-gallery'],
  }),

  listing: findHelper({
    referenceTypes: ['listing'],
  }),

  newsEntry: findHelper({
    referenceTypes: ['news-entry'],
  }),

  staticPage: findHelper({
    referenceTypes: ['static'],
  }),

  track: findHelper({
    referenceTypes: ['track'],

    getMatchableNames: track =>
      (track.alwaysReferenceByDirectory
        ? []
        : [track.name]),
  }),

  trackOriginalReleasesOnly: findHelper({
    referenceTypes: ['track'],

    include: track =>
      !CacheableObject.getUpdateValue(track, 'originalReleaseTrack'),

    // It's still necessary to check alwaysReferenceByDirectory here, since it
    // may be set manually (with the `Always Reference By Directory` field), and
    // these shouldn't be matched by name (as per usual). See the definition for
    // that property for more information.
    getMatchableNames: track =>
      (track.alwaysReferenceByDirectory
        ? []
        : [track.name]),
  }),
};

export default find;

// Handy utility function for binding the find.thing() functions to a complete
// wikiData object, optionally taking default options to provide to the find
// function. Note that this caches the arrays read from wikiData right when it's
// called, so if their values change, you'll have to continue with a fresh call
// to bindFind.
export function bindFind(wikiData, opts1) {
  return Object.fromEntries(
    Object.entries({
      album: 'albumData',
      artist: 'artistData',
      artTag: 'artTagData',
      flash: 'flashData',
      flashAct: 'flashActData',
      group: 'groupData',
      listing: 'listingSpec',
      newsEntry: 'newsData',
      staticPage: 'staticPageData',
      track: 'trackData',
      trackOriginalReleasesOnly: 'trackData',
    }).map(([key, value]) => {
      const findFn = find[key];
      const thingData = wikiData[value];
      return [
        key,
        opts1
          ? (ref, opts2) =>
              opts2
                ? findFn(ref, thingData, {...opts1, ...opts2})
                : findFn(ref, thingData, opts1)
          : (ref, opts2) =>
              opts2
                ? findFn(ref, thingData, opts2)
                : findFn(ref, thingData),
      ];
    })
  );
}
