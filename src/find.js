import {inspect} from 'node:util';

import {colors, logWarn} from '#cli';

function warnOrThrow(mode, message) {
  if (mode === 'error') {
    throw new Error(message);
  }

  if (mode === 'warn') {
    logWarn(message);
  }

  return null;
}

function findHelper(keys, findFns = {}) {
  // Note: This cache explicitly *doesn't* support mutable data arrays. If the
  // data array is modified, make sure it's actually a new array object, not
  // the original, or the cache here will break and act as though the data
  // hasn't changed!
  const cache = new WeakMap();

  const byDirectory = findFns.byDirectory || matchDirectory;
  const byName = findFns.byName || matchName;

  const keyRefRegex = new RegExp(String.raw`^(?:(${keys.join('|')}):(?=\S))?(.*)$`);

  // The mode argument here may be 'warn', 'error', or 'quiet'. 'error' throws
  // errors for null matches (with details about the error), while 'warn' and
  // 'quiet' both return null, with 'warn' logging details directly to the
  // console.
  return (fullRef, data, {mode = 'warn'} = {}) => {
    if (!fullRef) return null;

    if (typeof fullRef !== 'string' && !Array.isArray(fullRef)) {
      throw new Error(`Got a reference that is ${typeof fullRef}, not string or array: ${fullRef}`);
    }

    if (!data) {
      throw new Error(`Expected data to be present`);
    }

    let cacheForThisData = cache.get(data);
    if (!cacheForThisData) {
      cacheForThisData = Object.create(null);
      cache.set(data, cacheForThisData);
    }

    const parseFullRef = fullRef => {
      const regexMatch = fullRef.match(keyRefRegex);
      if (!regexMatch) {
        warnOrThrow(mode, `Malformed link reference: "${fullRef[i]}"`);
        return {error: true, key: null, ref: null};
      }

      const key = regexMatch[1];
      const ref = regexMatch[2];

      return {error: false, key, ref};
    };

    if (typeof fullRef === 'string') {
      const cachedMatch = cacheForThisData[fullRef];
      if (cachedMatch) return cachedMatch;

      const {error: regexError, key, ref} = parseFullRef(fullRef);
      if (regexError) return null;

      const match =
        (key
          ? byDirectory(ref, data, mode)
          : byName(ref, data, mode));

      if (!match) {
        warnOrThrow(mode, `Didn't match anything for ${colors.bright(fullRef)}`);
      }

      cacheForThisData[fullRef] = match;

      return match;
    }

    const fullRefList = fullRef;
    if (Array.isArray(fullRefList)) {
      const byDirectoryUncachedIndices = [];
      const byDirectoryUncachedRefs = [];
      const byNameUncachedIndices = [];
      const byNameUncachedRefs = [];

      for (let index = 0; index < fullRefList.length; index++) {
        const cachedMatch = cacheForThisData[fullRefList[index]];
        if (cachedMatch) return cachedMatch;

        const {error: regexError, key, ref} = parseFullRef(fullRefList[index]);
        if (regexError) return null;

        if (key) {
          byDirectoryUncachedIndices.push(index);
          byDirectoryUncachedRefs.push(ref);
        } else {
          byNameUncachedIndices.push(index);
          byNameUncachedRefs.push(ref);
        }
      }

      const byDirectoryMatches = byDirectory(byDirectoryUncachedRefs, data, mode);
      const byNameMatches = byName(byNameUncachedRefs, data, mode);

      const results = [];

      const processMatch = (match, sourceIndex) => {
        if (match) {
          cacheForThisData[fullRefList[sourceIndex]] = match;
          results[sourceIndex] = match;
        } else {
          // TODO: Aggregate errors
          warnOrThrow(mode, `Didn't match anything for ${fullRefList[sourceIndex]}`);
          results[sourceIndex] = null;
        }
      };

      for (let index = 0; index < byDirectoryMatches.length; index++) {
        const sourceIndex = byDirectoryUncachedIndices[index];
        const match = byDirectoryMatches[index];
        processMatch(match, sourceIndex);
      }

      for (let index = 0; index < byNameMatches.length; index++) {
        const sourceIndex = byNameUncachedIndices[index];
        const match = byNameMatches[index];
        processMatch(match, sourceIndex);
      }

      return results;
    }
  };
}

function matchDirectory(ref, data) {
  if (typeof ref === 'string') {
    return data.find(({directory}) => directory === ref);
  }

  const refList = ref;
  if (Array.isArray(refList)) {
    const refSet = new Set(refList);
    const refMap = new Map();

    for (const thing of data) {
      const {directory} = thing;
      if (refSet.has(directory)) {
        refMap.set(directory, thing);
      }
    }

    return refList.map(ref => refMap.get(ref) ?? null);
  }
}

function matchName(ref, data, mode) {
  if (typeof ref === 'string') {
    const matches =
      data
        .filter(({name}) => name.toLowerCase() === ref.toLowerCase())
        .filter(thing =>
          (Object.hasOwn(thing, 'alwaysReferenceByDirectory')
            ? !thing.alwaysReferenceByDirectory
            : true));

    if (matches.length > 1) {
      return warnOrThrow(mode,
        `Multiple matches for reference "${ref}". Please resolve:\n` +
        matches.map(match => `- ${inspect(match)}\n`).join('') +
        `Returning null for this reference.`);
    }

    if (matches.length === 0) {
      return null;
    }

    const match = matches[0];

    if (ref !== match.name) {
      warnOrThrow(mode,
        `Bad capitalization: ${colors.red(ref)} -> ${colors.green(match.name)}`);
    }

    return match;
  }

  const refList = ref;
  if (Array.isArray(refList)) {
    const refSet = new Set(refList.map(name => name.toLowerCase()));
    const refMap = new Map();
    const multipleMatchesMap = new Map();

    for (const thing of data) {
      if (thing.alwaysReferenceByDirectory) continue;
      const name = thing.name.toLowerCase();
      if (refSet.has(name)) {
        if (refMap.has(name)) {
          refMap.set(name, null); // .has() will still return true
          if (multipleMatchesMap.has(name)) {
            multipleMatchesMap.get(name).push(thing);
          } else {
            multipleMatchesMap.set(name, [thing]);
          }
        } else {
          refMap.set(name, thing);
        }
      }
    }

    // TODO: Aggregate errors
    for (const [name, matches] of multipleMatchesMap.entries()) {
      warnOrThrow(mode,
        `Multiple matches for reference "${ref}". Please resolve:\n` +
        matches.map(match => `- ${inspect(match)}\n`).join('') +
        `Returning null for this reference.`);
    }

    return refList.map(ref => {
      const match = refMap.get(ref);
      if (!match) return null;

      // TODO: Aggregate errors
      if (ref !== match.name) {
        warnOrThrow(mode,
          `Bad capitalization: ${colors.red(ref)} -> ${colors.green(match.name)}`);
      }

      return match;
    });
  }
}

function matchTagName(ref, data, mode) {
  if (typeof ref === 'string') {
    return matchName(
      ref.startsWith('cw: ') ? ref.slice(4) : ref,
      data,
      mode);
  }

  if (Array.isArray(ref)) {
    return matchName(
      ref.map(ref => ref.startsWith('cw: ') ? ref.slice(4) : ref),
      data,
      mode);
  }
}

const find = {
  album: findHelper(['album', 'album-commentary', 'album-gallery']),
  artist: findHelper(['artist', 'artist-gallery']),
  artTag: findHelper(['tag'], {byName: matchTagName}),
  flash: findHelper(['flash']),
  group: findHelper(['group', 'group-gallery']),
  listing: findHelper(['listing']),
  newsEntry: findHelper(['news-entry']),
  staticPage: findHelper(['static']),
  track: findHelper(['track']),
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
      group: 'groupData',
      listing: 'listingSpec',
      newsEntry: 'newsData',
      staticPage: 'staticPageData',
      track: 'trackData',
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
