// Utility functions for interacting with wiki data.

import {empty} from './sugar.js';

// Generic value operations

export function getKebabCase(name) {
  return name
    .split(' ')
    .join('-')
    .replace(/&/g, 'and')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function chunkByConditions(array, conditions) {
  if (empty(array)) {
    return [];
  }

  if (empty(conditions)) {
    return [array];
  }

  const out = [];
  let cur = [array[0]];
  for (let i = 1; i < array.length; i++) {
    const item = array[i];
    const prev = array[i - 1];
    let chunk = false;
    for (const condition of conditions) {
      if (condition(item, prev)) {
        chunk = true;
        break;
      }
    }
    if (chunk) {
      out.push(cur);
      cur = [item];
    } else {
      cur.push(item);
    }
  }
  out.push(cur);
  return out;
}

export function chunkByProperties(array, properties) {
  return chunkByConditions(
    array,
    properties.map((p) => (a, b) => {
      if (a[p] instanceof Date && b[p] instanceof Date) return +a[p] !== +b[p];

      if (a[p] !== b[p]) return true;

      // Not sure if this line is still necessary with the specific check for
      // d8tes a8ove, 8ut, uh, keeping it anyway, just in case....?
      if (a[p] != b[p]) return true;

      return false;
    })
  ).map((chunk) => ({
    ...Object.fromEntries(properties.map((p) => [p, chunk[0][p]])),
    chunk,
  }));
}

// Sorting functions - all utils here are mutating, so make sure to initially
// slice/filter/somehow generate a new array from input data if retaining the
// initial sort matters! (Spoilers: If what you're doing involves any kind of
// parallelization, it definitely matters.)

// General sorting utilities! These don't do any sorting on their own but are
// handy in the sorting functions below (or if you're making your own sort).

export function compareCaseLessSensitive(a, b) {
  // Compare two strings without considering capitalization... unless they
  // happen to be the same that way.

  const al = a.toLowerCase();
  const bl = b.toLowerCase();

  return al === bl
    ? a.localeCompare(b, undefined, {numeric: true})
    : al.localeCompare(bl, undefined, {numeric: true});
}

// Subtract common prefixes and other characters which some people don't like
// to have considered while sorting. The words part of this is English-only for
// now, which is totally evil.
export function normalizeName(s) {
  // Turn (some) ligatures into expanded variant for cleaner sorting, e.g.
  // "ﬀ" into "ff", in decompose mode, so that "ü" is represented as two
  // bytes ("u" + \u0308 combining diaeresis).
  s = s.normalize('NFKD');

  // Replace one or more whitespace of any kind in a row, as well as certain
  // punctuation, with a single typical space, then trim the ends.
  s = s
    .replace(
      /[\p{Separator}\p{Dash_Punctuation}\p{Connector_Punctuation}]+/gu,
      ' '
    )
    .trim();

  // Discard anything that isn't a letter, number, or space.
  s = s.replace(/[^\p{Letter}\p{Number} ]/gu, '');

  // Remove common English (only, for now) prefixes.
  s = s.replace(/^(?:an?|the) /i, '');

  return s;
}

// Component sort functions - these sort by one particular property, applying
// unique particulars where appropriate. Usually you don't want to use these
// directly, but if you're making a custom sort they can come in handy.

// Universal method for sorting things into a predictable order, as directory
// is taken to be unique. There are two exceptions where this function (and
// thus any of the composite functions that start with it) *can't* be taken as
// deterministic:
//
//  1) Mixed data of two different Things, as directories are only taken as
//     unique within one given class of Things. For example, this function
//     won't be deterministic if its array contains both <album:ithaca> and
//     <track:ithaca>.
//
//  2) Duplicate directories, or multiple instances of the "same" Thing.
//     This function doesn't differentiate between two objects of the same
//     directory, regardless of any other properties or the overall "identity"
//     of the object.
//
// These exceptions are unavoidable except for not providing that kind of data
// in the first place, but you can still ensure the overall program output is
// deterministic by ensuring the input is arbitrarily sorted according to some
// other criteria - ex, although sortByDirectory itself isn't determinstic when
// given mixed track and album data, the final output (what goes on the site)
// will always be the same if you're doing sortByDirectory([...albumData,
// ...trackData]), because the initial sort places albums before tracks - and
// sortByDirectory will handle the rest, given all directories are unique
// except when album and track directories overlap with each other.
export function sortByDirectory(data, {
  getDirectory = (o) => o.directory,
} = {}) {
  return data.sort((a, b) => {
    const ad = getDirectory(a);
    const bd = getDirectory(b);
    return compareCaseLessSensitive(ad, bd);
  });
}

export function sortByName(data, {
  getName = (o) => o.name,
} = {}) {
  const nameMap = new Map();
  const normalizedNameMap = new Map();
  for (const o of data) {
    const name = getName(o);
    const normalizedName = normalizeName(name);
    nameMap.set(o, name);
    normalizedNameMap.set(o, normalizedName);
  }

  return data.sort((a, b) => {
    const ann = normalizedNameMap.get(a);
    const bnn = normalizedNameMap.get(b);
    const comparison = compareCaseLessSensitive(ann, bnn);
    if (comparison !== 0)
      return comparison;

    const an = nameMap.get(a);
    const bn = nameMap.get(b);
    return compareCaseLessSensitive(an, bn);
  });
}

export function sortByDate(data, {
  getDate = (o) => o.date,
} = {}) {
  return data.sort((a, b) => {
    const ad = getDate(a);
    const bd = getDate(b);

    // It's possible for objects with and without dates to be mixed
    // together in the same array. If that's the case, we put all items
    // without dates at the end.
    if (ad && bd) {
      return ad - bd;
    } else if (ad) {
      return -1;
    } else if (bd) {
      return 1;
    } else {
      // If neither of the items being compared have a date, don't move
      // them relative to each other. This is basically the same as
      // filtering out all non-date items and then pushing them at the
      // end after sorting the rest.
      return 0;
    }
  });
}

export function sortByPositionInAlbum(data) {
  return data.sort((a, b) => {
    const aa = a.album;
    const ba = b.album;

    // Don't change the sort when the two tracks are from separate albums.
    // This function doesn't change the order of albums or try to "merge"
    // two separated chunks of tracks from the same album together.
    if (aa !== ba) {
      return 0;
    }

    // Don't change the sort when only one (or neither) item is actually
    // a track (i.e. has an album).
    if (!aa || !ba) {
      return 0;
    }

    const ai = aa.tracks.indexOf(a);
    const bi = ba.tracks.indexOf(b);

    // There's no reason this two-way reference (a track's album and the
    // album's track list) should be broken, but if for any reason it is,
    // don't change the sort.
    if (ai === -1 || bi === -1) {
      return 0;
    }

    return ai - bi;
  });
}

// Sorts data so that items are grouped together according to whichever of a
// set of arbitrary given conditions is true first. If no conditions are met
// for a given item, it's moved over to the end!
export function sortByConditions(data, conditions) {
  data.sort((a, b) => {
    const ai = conditions.findIndex((f) => f(a));
    const bi = conditions.findIndex((f) => f(b));

    if (ai >= 0 && bi >= 0) {
      return ai - bi;
    } else if (ai >= 0) {
      return -1;
    } else if (bi >= 0) {
      return 1;
    } else {
      return 0;
    }
  });
}

// Composite sorting functions - these consider multiple properties, generally
// always returning the same output regardless of how the input was originally
// sorted (or left unsorted). If you're working with arbitrarily sorted inputs
// (typically wiki data, either in full or unsorted filter), these make sure
// what gets put on the actual website (or wherever) is deterministic. Also
// they're just handy sorting utilities.
//
// Note that because these are each comprised of multiple component sorting
// functions, they expect more than just one property to be present for full
// sorting (listed above each function). If you're mapping thing objects to
// another representation, try to include all of these listed properties.

// Expects thing properties:
//  * directory (or override getDirectory)
//  * name (or override getName)
export function sortAlphabetically(data, {
  getDirectory,
  getName,
} = {}) {
  sortByDirectory(data, {getDirectory});
  sortByName(data, {getName});
  return data;
}

// Expects thing properties:
//  * directory (or override getDirectory)
//  * name (or override getName)
//  * date (or override getDate)
export function sortChronologically(data, {
  getDirectory,
  getName,
  getDate,
} = {}) {
  sortAlphabetically(data, {getDirectory, getName});
  sortByDate(data, {getDate});
  return data;
}

// Highly contextual sort functions - these are only for very specific types
// of Things, and have appropriately hard-coded behavior.

// Sorts so that tracks from the same album are generally grouped together in
// their original (album track list) order, while prioritizing date (by default
// release date but can be overridden) above all else.
//
// This function also works for data lists which contain only tracks.
export function sortAlbumsTracksChronologically(data, {
  getDate,
} = {}) {
  // Sort albums before tracks...
  sortByConditions(data, [(t) => t.album === undefined]);

  // Group tracks by album...
  sortByDirectory(data, {
    getDirectory: (t) => (t.album ? t.album.directory : t.directory),
  });

  // Sort tracks by position in album...
  sortByPositionInAlbum(data);

  // ...and finally sort by date. If tracks from more than one album were
  // released on the same date, they'll still be grouped together by album,
  // and tracks within an album will retain their relative positioning (i.e.
  // stay in the same order as part of the album's track listing).
  sortByDate(data, {getDate});

  return data;
}

// Specific data utilities

export function filterAlbumsByCommentary(albums) {
  return albums
    .filter((album) => [album, ...album.tracks].some((x) => x.commentary));
}

export function getAlbumCover(album, {to}) {
  // Some albums don't have art! This function returns null in that case.
  if (album.hasCoverArt) {
    return to('media.albumCover', album.directory, album.coverArtFileExtension);
  } else {
    return null;
  }
}

export function getAlbumListTag(album) {
  return album.hasTrackNumbers ? 'ol' : 'ul';
}

// This gets all the track o8jects defined in every al8um, and sorts them 8y
// date released. Generally, albumData will pro8a8ly already 8e sorted 8efore
// you pass it to this function, 8ut individual tracks can have their own
// original release d8, distinct from the al8um's d8. I allowed that 8ecause
// in Homestuck, the first four Vol.'s were com8ined into one al8um really
// early in the history of the 8andcamp, and I still want to use that as the
// al8um listing (not the original four al8um listings), 8ut if I only did
// that, all the tracks would 8e sorted as though they were released at the
// same time as the compilation al8um - i.e, after some other al8ums (including
// Vol.'s 5 and 6!) were released. That would mess with chronological listings
// including tracks from multiple al8ums, like artist pages. So, to fix that,
// I gave tracks an Original Date field, defaulting to the release date of the
// al8um if not specified. Pretty reasona8le, I think! Oh, and this feature can
// 8e used for other projects too, like if you wanted to have an al8um listing
// compiling a 8unch of songs with radically different & interspersed release
// d8s, 8ut still keep the al8um listing in a specific order, since that isn't
// sorted 8y date.
export function getAllTracks(albumData) {
  return sortByDate(albumData.flatMap((album) => album.tracks));
}

export function getArtistNumContributions(artist) {
  return (
    (artist.tracksAsAny?.length ?? 0) +
    (artist.albumsAsCoverArtist?.length ?? 0) +
    (artist.flashesAsContributor?.length ?? 0)
  );
}

export function getFlashCover(flash, {to}) {
  return to('media.flashArt', flash.directory, flash.coverArtFileExtension);
}

export function getFlashLink(flash) {
  return `https://homestuck.com/story/${flash.page}`;
}

export function getTotalDuration(tracks) {
  return tracks.reduce((duration, track) => duration + track.duration, 0);
}

export function getTrackCover(track, {to}) {
  // Some albums don't have any track art at all, and in those, every track
  // just inherits the album's own cover art. Note that since cover art isn't
  // guaranteed on albums either, it's possible that this function returns
  // null!
  if (!track.hasCoverArt) {
    return getAlbumCover(track.album, {to});
  } else {
    return to('media.trackCover', track.album.directory, track.directory, track.coverArtFileExtension);
  }
}

export function getArtistAvatar(artist, {to}) {
  return to('media.artistAvatar', artist.directory, artist.avatarFileExtension);
}

// Big-ass homepage row functions

export function getNewAdditions(numAlbums, {wikiData}) {
  const {albumData} = wikiData;

  // Sort al8ums, in descending order of priority, 8y...
  //
  // * D8te of addition to the wiki (descending).
  // * Major releases first.
  // * D8te of release (descending).
  //
  // Major releases go first to 8etter ensure they show up in the list (and
  // are usually at the start of the final output for a given d8 of release
  // too).
  const sortedAlbums = albumData
    .filter((album) => album.isListedOnHomepage)
    .sort((a, b) => {
      if (a.dateAddedToWiki > b.dateAddedToWiki) return -1;
      if (a.dateAddedToWiki < b.dateAddedToWiki) return 1;
      if (a.isMajorRelease && !b.isMajorRelease) return -1;
      if (!a.isMajorRelease && b.isMajorRelease) return 1;
      if (a.date > b.date) return -1;
      if (a.date < b.date) return 1;
    });

  // When multiple al8ums are added to the wiki at a time, we want to show
  // all of them 8efore pulling al8ums from the next (earlier) date. We also
  // want to show a diverse selection of al8ums - with limited space, we'd
  // rather not show only the latest al8ums, if those happen to all 8e
  // closely rel8ted!
  //
  // Specifically, we're concerned with avoiding too much overlap amongst
  // the primary (first/top-most) group. We do this 8y collecting every
  // primary group present amongst the al8ums for a given d8 into one
  // (ordered) array, initially sorted (inherently) 8y latest al8um from
  // the group. Then we cycle over the array, adding one al8um from each
  // group until all the al8ums from that release d8 have 8een added (or
  // we've met the total target num8er of al8ums). Once we've added all the
  // al8ums for a given group, it's struck from the array (so the groups
  // with the most additions on one d8 will have their oldest releases
  // collected more towards the end of the list).

  const albums = [];

  let i = 0;
  outerLoop: while (i < sortedAlbums.length) {
    // 8uild up a list of groups and their al8ums 8y order of decending
    // release, iter8ting until we're on a different d8. (We use a map for
    // indexing so we don't have to iter8te through the entire array each
    // time we access one of its entries. This is 8asically unnecessary
    // since this will never 8e an expensive enough task for that to
    // matter.... 8ut it's nicer code. BBBB) )
    const currentDate = sortedAlbums[i].dateAddedToWiki;
    const groupMap = new Map();
    const groupArray = [];
    for (let album; (album = sortedAlbums[i]) && +album.dateAddedToWiki === +currentDate; i++) {
      const primaryGroup = album.groups[0];
      if (groupMap.has(primaryGroup)) {
        groupMap.get(primaryGroup).push(album);
      } else {
        const entry = [album];
        groupMap.set(primaryGroup, entry);
        groupArray.push(entry);
      }
    }

    // Then cycle over that sorted array, adding one al8um from each to
    // the main array until we've run out or have met the target num8er
    // of al8ums.
    while (!empty(groupArray)) {
      let j = 0;
      while (j < groupArray.length) {
        const entry = groupArray[j];
        const album = entry.shift();
        albums.push(album);

        // This is the only time we ever add anything to the main al8um
        // list, so it's also the only place we need to check if we've
        // met the target length.
        if (albums.length === numAlbums) {
          // If we've met it, 8r8k out of the outer loop - we're done
          // here!
          break outerLoop;
        }

        if (empty(entry)) {
          groupArray.splice(j, 1);
        } else {
          j++;
        }
      }
    }
  }

  // Finally, do some quick mapping shenanigans to 8etter display the result
  // in a grid. (This should pro8a8ly 8e a separ8te, shared function, 8ut
  // whatevs.)
  return albums.map((album) => ({large: album.isMajorRelease, item: album}));
}

export function getNewReleases(numReleases, {wikiData}) {
  const {albumData} = wikiData;

  const latestFirst = albumData
    .filter((album) => album.isListedOnHomepage)
    .reverse();

  const majorReleases = latestFirst.filter((album) => album.isMajorRelease);
  majorReleases.splice(1);

  const otherReleases = latestFirst
    .filter((album) => !majorReleases.includes(album))
    .slice(0, numReleases - majorReleases.length);

  return [
    ...majorReleases.map((album) => ({large: true, item: album})),
    ...otherReleases.map((album) => ({large: false, item: album})),
  ];
}
