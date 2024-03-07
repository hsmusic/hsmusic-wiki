// Sorting functions - all utils here are mutating, so make sure to initially
// slice/filter/somehow generate a new array from input data if retaining the
// initial sort matters! (Spoilers: If what you're doing involves any kind of
// parallelization, it definitely matters.)

import {empty, sortMultipleArrays, unique}
  from './sugar.js';

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
  s = s.replace(/[^\p{Letter}\p{Number} ]/gu, '').trim();

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
  getDirectory = object => object.directory,
} = {}) {
  const directories = data.map(getDirectory);

  sortMultipleArrays(data, directories,
    (a, b, directoryA, directoryB) =>
      compareCaseLessSensitive(directoryA, directoryB));

  return data;
}

export function sortByName(data, {
  getName = object => object.name,
} = {}) {
  const names = data.map(getName);
  const normalizedNames = names.map(normalizeName);

  sortMultipleArrays(data, normalizedNames, names,
    (
      a, b,
      normalizedA, normalizedB,
      nonNormalizedA, nonNormalizedB,
    ) =>
      compareNormalizedNames(
        normalizedA, normalizedB,
        nonNormalizedA, nonNormalizedB,
      ));

  return data;
}

export function compareNormalizedNames(
  normalizedA, normalizedB,
  nonNormalizedA, nonNormalizedB,
) {
  const comparison = compareCaseLessSensitive(normalizedA, normalizedB);
  return (
    (comparison === 0
      ? compareCaseLessSensitive(nonNormalizedA, nonNormalizedB)
      : comparison));
}

export function sortByDate(data, {
  getDate = object => object.date,
  latestFirst = false,
} = {}) {
  const dates = data.map(getDate);

  sortMultipleArrays(data, dates,
    (a, b, dateA, dateB) =>
      compareDates(dateA, dateB, {latestFirst}));

  return data;
}

export function compareDates(a, b, {
  latestFirst = false,
} = {}) {
  if (a && b) {
    return (latestFirst ? b - a : a - b);
  }

  // It's possible for objects with and without dates to be mixed
  // together in the same array. If that's the case, we put all items
  // without dates at the end.
  if (a) return -1;
  if (b) return 1;

  // If neither of the items being compared have a date, don't move
  // them relative to each other. This is basically the same as
  // filtering out all non-date items and then pushing them at the
  // end after sorting the rest.
  return 0;
}

export function getLatestDate(dates) {
  const filtered = dates.filter(Boolean);
  if (empty(filtered)) return null;

  return filtered
    .reduce(
      (accumulator, date) =>
        date > accumulator ? date : accumulator,
      -Infinity);
}

export function getEarliestDate(dates) {
  const filtered = dates.filter(Boolean);
  if (empty(filtered)) return null;

  return filtered
    .reduce(
      (accumulator, date) =>
        date < accumulator ? date : accumulator,
      Infinity);
}

// Funky sort which takes a data set and a corresponding list of "counts",
// which are really arbitrary numbers representing some property of each data
// object defined by the caller. It sorts and mutates *both* of these, so the
// sorted data will still correspond to the same indexed count.
export function sortByCount(data, counts, {
  greatestFirst = false,
} = {}) {
  sortMultipleArrays(data, counts, (data1, data2, count1, count2) =>
    (greatestFirst
      ? count2 - count1
      : count1 - count2));

  return data;
}

export function sortByPositionInParent(data, {
  getParent,
  getChildren,
}) {
  return data.sort((a, b) => {
    const parentA = getParent(a);
    const parentB = getParent(b);

    // Don't change the sort when the two items are from separate parents.
    // This function doesn't change the order of parents or try to "merge"
    // two separated chunks of items from the same parent together.
    if (parentA !== parentB) {
      return 0;
    }

    // Don't change the sort when either (or both) of the items doesn't
    // even have a parent (e.g. it's the passed data is a mixed array of
    // children and parents).
    if (!parentA || !parentB) {
      return 0;
    }

    const indexA = getChildren(parentA).indexOf(a);
    const indexB = getChildren(parentB).indexOf(b);

    // If the getParent/getChildren relationship doesn't go both ways for
    // some reason, don't change the sort.
    if (indexA === -1 || indexB === -1) {
      return 0;
    }

    return indexA - indexB;
  });
}

export function sortByPositionInAlbum(data) {
  return sortByPositionInParent(data, {
    getParent: track => track.album,
    getChildren: album => album.tracks,
  });
}

export function sortByPositionInFlashAct(data) {
  return sortByPositionInParent(data, {
    getParent: flash => flash.act,
    getChildren: act => act.flashes,
  });
}

// Sorts data so that items are grouped together according to whichever of a
// set of arbitrary given conditions is true first. If no conditions are met
// for a given item, it's moved over to the end!
export function sortByConditions(data, conditions) {
  return data.sort((a, b) => {
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
  latestFirst = false,
  getDirectory,
  getName,
  getDate,
} = {}) {
  sortAlphabetically(data, {getDirectory, getName});
  sortByDate(data, {latestFirst, getDate});
  return data;
}

// This one's a little odd! Sorts an array of {entry, thing} pairs using
// the provided sortFunction, which will operate on each item's `thing`, not
// its entry (or the item as a whole). If multiple entries are associated
// with the same thing, they'll end up bunched together in the output,
// retaining their original relative positioning.
export function sortEntryThingPairs(data, sortFunction) {
  const things = unique(data.map(item => item.thing));
  sortFunction(things);

  const outputArrays = [];
  const thingToOutputArray = new Map();

  for (const thing of things) {
    const array = [];
    thingToOutputArray.set(thing, array);
    outputArrays.push(array);
  }

  for (const item of data) {
    thingToOutputArray.get(item.thing).push(item);
  }

  data.splice(0, data.length, ...outputArrays.flat());

  return data;
}

/*
// Alternate draft version of sortEntryThingPairs.
// See: https://github.com/hsmusic/hsmusic-wiki/issues/90#issuecomment-1607412168

// Maps the provided "preparation" function across a list of arbitrary values,
// building up a list of sortable values; sorts these with the provided sorting
// function; and reorders the sources to match their corresponding prepared
// values. As usual, if multiple source items correspond to the same sorting
// data, this retains the source relative positioning.
export function prepareAndSort(sources, prepareForSort, sortFunction) {
  const prepared = [];
  const preparedToSource = new Map();

  for (const original of originals) {
    const prep = prepareForSort(source);
    prepared.push(prep);
    preparedToSource.set(prep, source);
  }

  sortFunction(prepared);

  sources.splice(0, ...sources.length, prepared.map(prep => preparedToSource.get(prep)));

  return sources;
}
*/

// Highly contextual sort functions - these are only for very specific types
// of Things, and have appropriately hard-coded behavior.

// Sorts so that tracks from the same album are generally grouped together in
// their original (album track list) order, while prioritizing date (by default
// release date but can be overridden) above all else.
//
// This function also works for data lists which contain only tracks.
export function sortAlbumsTracksChronologically(data, {
  latestFirst = false,
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
  sortByDate(data, {latestFirst, getDate});

  return data;
}

export function sortFlashesChronologically(data, {
  latestFirst = false,
  getDate,
} = {}) {
  // Group flashes by act...
  sortAlphabetically(data, {
    getName: flash => flash.act.name,
    getDirectory: flash => flash.act.directory,
  });

  // Sort flashes by position in act...
  sortByPositionInFlashAct(data);

  // ...and finally sort by date. If flashes from more than one act were
  // released on the same date, they'll still be grouped together by act,
  // and flashes within an act will retain their relative positioning (i.e.
  // stay in the same order as the act's flash listing).
  sortByDate(data, {latestFirst, getDate});

  return data;
}

export function sortContributionsChronologically(data, sortThings, {
  latestFirst = false,
} = {}) {
  // Contributions only have one date property (which is provided when
  // the contribution is created). They're sorted by this most primarily,
  // but otherwise use the same sort as is provided.

  const entries =
    data.map(contrib => ({
      entry: contrib,
      thing: contrib.thing,
    }));

  sortEntryThingPairs(
    entries,
    things =>
      sortThings(things, {latestFirst}));

  const contribs =
    entries
      .map(({entry: contrib}) => contrib);

  sortByDate(contribs, {latestFirst});

  return contribs;
}
