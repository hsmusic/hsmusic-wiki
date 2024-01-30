import {inspect} from 'node:util';

import CacheableObject from '#cacheable-object';
import {colors, logWarn} from '#cli';
import {typeAppearance} from '#sugar';
import {getKebabCase} from '#wiki-data';

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

  getMatchableDirectories = thing =>
    (Object.hasOwn(thing, 'directory')
      ? [thing.directory]
      : [null]),
} = {}) {
  const byName = Object.create(null);
  const byDirectory = Object.create(null);
  const multipleNameMatches = Object.create(null);

  for (const thing of data) {
    if (!include(thing)) continue;

    for (const directory of getMatchableDirectories(thing)) {
      if (typeof directory !== 'string') {
        logWarn`Unexpected ${typeAppearance(directory)} returned in directories for ${inspect(thing)}`;
        continue;
      }

      byDirectory[directory] = thing;
    }

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

    include: artist => !artist.isAlias,
  }),

  artistIncludingAliases: findHelper({
    referenceTypes: ['artist', 'artist-gallery'],

    getMatchableDirectories(artist) {
      // Regular artists are always matchable by their directory.
      if (!artist.isAlias) {
        return [artist.directory];
      }

      const originalArtist = artist.aliasedArtist;

      // Aliases never match by the same directory as the original.
      if (artist.directory === originalArtist.directory) {
        return [];
      }

      // Aliases never match by the same directory as some *previous* alias
      // in the original's alias list. This is honestly a bit awkward, but it
      // avoids artist aliases conflicting with each other when checking for
      // duplicate directories.
      for (const aliasName of originalArtist.aliasNames) {
        // These are trouble. We should be accessing aliases' directories
        // directly, but artists currently don't expose a reverse reference
        // list for aliases. (This is pending a cleanup of "reverse reference"
        // behavior in general.) It doesn't actually cause problems *here*
        // because alias directories are computed from their names 100% of the
        // time, but that *is* an assumption this code makes.
        if (aliasName === artist.name) continue;
        if (artist.directory === getKebabCase(aliasName)) {
          return [];
        }
      }

      // And, aliases never return just a blank string. This part is pretty
      // spooky because it doesn't handle two differently named aliases, on
      // different artists, who have names that are similar *apart* from a
      // character that's shortened. But that's also so fundamentally scary
      // that we can't support it properly with existing code, anyway - we
      // would need to be able to specifically set a directory *on an alias,*
      // which currently can't be done in YAML data files.
      if (artist.directory === '') {
        return [];
      }

      return [artist.directory];
    },
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
