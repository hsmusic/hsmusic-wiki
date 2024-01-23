import {inspect} from 'node:util';

import CacheableObject from '#cacheable-object';
import {colors, logWarn} from '#cli';
import {typeAppearance} from '#sugar';

function warnOrThrow(mode, message) {
  if (mode === 'error') {
    throw new Error(message);
  }

  if (mode === 'warn') {
    logWarn(message);
  }

  return null;
}

export function processAllAvailableMatches(data, {
  include = thing => true,

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

    getMatchableNames: artTag =>
      (artTag.isContentWarning
        ? [`cw: ${artTag.name}`]
        : [artTag.name]),
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
