// Utility functions for interacting with wiki data.

import {accumulateSum, chunkByConditions, empty, re, unique} from './sugar.js';
import {sortByDate} from './sort.js';

// This is a duplicate binding of filterMultipleArrays that's included purely
// to leave wiki-data.js compatible with the release build of HSMusic.
// Sorry! This is really ridiculous!! If the next update after 10/25/2023 has
// released, this binding is no longer needed!
export {filterMultipleArrays} from './sugar.js';

// Generic value operations

export function getCaseSensitiveKebabCase(name) {
  return name

    // Spaces to dashes
    .split(' ')
    .join('-')

    // Punctuation as words
    .replace(/&/g, '-and-')
    .replace(/\+/g, '-plus-')
    .replace(/%/g, '-percent-')

    // Punctuation which only divides words, not single characters
    .replace(/(\b[^\s-.]{2,})\./g, '$1-')
    .replace(/\.([^\s-.]{2,})\b/g, '-$1')

    // Punctuation which doesn't divide a number following a non-number
    .replace(/(?<=[0-9])\^/g, '-')
    .replace(/\^(?![0-9])/g, '-')

    // General punctuation which always separates surrounding words
    .replace(/[/@#$%*()_=,[\]{}|\\;:<>?`~]/g, '-')

    // More punctuation which always separates surrounding words
    .replace(/[\u{2013}-\u{2014}]/gu, '-') // En Dash, Em Dash

    // Accented characters
    .replace(/[áâäàå]/gi, 'a')
    .replace(/[çč]/gi, 'c')
    .replace(/[éêëè]/gi, 'e')
    .replace(/[íîïì]/gi, 'i')
    .replace(/[óôöò]/gi, 'o')
    .replace(/[úûüù]/gi, 'u')

    // Strip other characters
    .replace(/[^a-z0-9-]/gi, '')

    // Combine consecutive dashes
    .replace(/-{2,}/g, '-')

    // Trim dashes on boundaries
    .replace(/^-+|-+$/g, '')
}

export function getKebabCase(name) {
  return getCaseSensitiveKebabCase(name).toLowerCase();
}

export function compareKebabCase(name1, name2) {
  if (!name1 || !name2) return false;
  return getKebabCase(name1) === getKebabCase(name2);
}

// Specific data utilities

// Ostensibly supports these strings. Maybe.
//
// * "25 December 2019" - one or two number digits, followed by any text,
//   followed by four number digits
// * "December 25, 2019" - one all-letters word, a space, one or two number
//   digits, a comma, and four number digits
// * "12/25/2019" etc - three sets of one to four number digits, separated
//   by slashes or dashes (only valid orders are MM/DD/YYYY and YYYY/MM/DD)
//
const dateRegex = groupName =>
  re([
    `(?<${groupName}>`,
      /[a-zA-Z]+ [0-9]{1,2}, [0-9]{4,4}/, '|',
      /[0-9]{1,2} [^,]*[0-9]{4,4}/, '|',
      /[0-9]{1,4}[-/][0-9]{1,4}[-/][0-9]{1,4}/,
    `)`,
  ]);

const contentEntryHeadingRegex =
  re('gm', [
    '^(?:',
      '(?:',
        /<i>(?<artists>.+?):<\/i>/,
        /(?: \((?<annotation1>.*)\))?/,
      ')',
      '|',
      '(?:',
        /@@ (?<annotation2>.*)/,
      ')',
    ')$',
  ]);

const contentEntryAnnotationTailRegex =
  re([
    /(?:, |^)/,

    /(?:(?<dateKind>sometime|throughout|around) )?/,
    dateRegex('date'),

    '(?:',
      ' ?',
      '-',
      ' ?',
      dateRegex('secondDate'),
    ')?',

    '(?: ?(?<= )',
      /(?<accessKind>captured|accessed)/,
      ' ',
      dateRegex('accessDate'),
    ')?',
  ]);

export function* matchContentEntries(sourceText) {
  let workingEntry = null;
  let workingBodyIndex = null;

  const trimBody = body =>
    body
      .replace(/^\n*/, '')
      .replace(/\n*$/, '');

  for (const headingMatch of sourceText.matchAll(contentEntryHeadingRegex)) {
    if (workingEntry) {
      workingEntry.body =
        trimBody(sourceText.slice(workingBodyIndex, headingMatch.index));

      yield workingEntry;
    }

    workingEntry = {
      artists:
        headingMatch.groups.artists ?? null,

      annotation:
        headingMatch.groups.annotation1 ??
        headingMatch.groups.annotation2 ??
        null,
    };

    if (workingEntry.annotation) {
      const annotationTailMatch =
        workingEntry.annotation.match(contentEntryAnnotationTailRegex);

      if (annotationTailMatch) {
        workingEntry.annotation =
          workingEntry.annotation.slice(0, annotationTailMatch.index);

        Object.assign(workingEntry, annotationTailMatch.groups);
      }
    }

    workingBodyIndex = headingMatch.index + headingMatch[0].length;
  }

  if (workingEntry) {
    workingEntry.body =
      trimBody(sourceText.slice(workingBodyIndex));

    yield workingEntry;
  }
}

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
  return accumulateSum(
    [
      unique(
        ([
          artist.trackArtistContributions,
          artist.trackContributorContributions,
          artist.trackCoverArtistContributions,
        ]).flat()
          .map(({thing}) => thing)),

      artist.albumCoverArtistContributions,
      artist.flashContributorContributions,
    ],
    ({length}) => length);
}

export function getFlashCover(flash, {to}) {
  return to('media.flashArt', flash.directory, flash.coverArtFileExtension);
}

export function getFlashLink(flash) {
  return `https://homestuck.com/story/${flash.page}`;
}

export function getTotalDuration(tracks, {
  mainReleasesOnly = false,
} = {}) {
  if (mainReleasesOnly) {
    tracks = tracks.filter(t => !t.mainReleaseTrack);
  }

  return accumulateSum(tracks, track => track.duration);
}

export function getTrackCover(track, {to}) {
  // Some albums don't have any track art at all, and in those, every track
  // just inherits the album's own cover art. Note that since cover art isn't
  // guaranteed on albums either, it's possible that this function returns
  // null!
  if (!track.hasUniqueCoverArt) {
    return getAlbumCover(track.album, {to});
  } else {
    return to('media.trackCover', track.album.directory, track.directory, track.coverArtFileExtension);
  }
}

export function getArtistAvatar(artist, {to}) {
  return to('media.artistAvatar', artist.directory, artist.avatarFileExtension);
}

// Used in multiple content functions for the artist info page,
// because shared logic is torture oooooooooooooooo.
export function chunkArtistTrackContributions(contributions) {
  const date = contrib => contrib.date;

  const album = contrib =>
    (contrib.thing.isTrack
      ? contrib.thing.album
      : contrib.thing);

  return (
    // First chunk by (contribution) date and album.
    chunkByConditions(contributions, [
      (a, b) => +date(a) !== +date(b),
      (a, b) => album(a) !== album(b),
    ]).map(contribs =>
        // Then, *within* the boundaries of the existing chunks,
        // chunk contributions to the same thing together.
        chunkByConditions(contribs, [
          ({thing: thing1}, {thing: thing2}) =>
            thing1 !== thing2,
        ])));
}

// Big-ass homepage row functions

export function getNewAdditions(numAlbums, {albumData}) {
  const sortedAlbums = albumData
    .filter((album) => album.isListedOnHomepage)
    .sort((a, b) => {
      if (a.dateAddedToWiki > b.dateAddedToWiki) return -1;
      if (a.dateAddedToWiki < b.dateAddedToWiki) return 1;
      if (a.date > b.date) return -1;
      if (a.date < b.date) return 1;
      return 0;
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

  return albums;
}

export function getNewReleases(numReleases, {albumData}) {
  return albumData
    .filter((album) => album.isListedOnHomepage)
    .reverse()
    .slice(0, numReleases);
}

// Carousel layout and utilities

// Layout constants:
//
// Carousels support fitting 4-18 items, with a few "dead" zones to watch out
// for, namely when a multiple of 6, 5, or 4 columns would drop the last tiles.
//
// Carousels are limited to 1-3 rows and 4-6 columns.
// Lower edge case: 1-3 items are treated as 4 items (with blank space).
// Upper edge case: all items past 18 are dropped (treated as 18 items).
//
// This is all done through JS instead of CSS because it's just... ANNOYING...
// to write a mapping like this in CSS lol.
const carouselLayoutMap = [
  // 0-3
  null, null, null, null,

  // 4-6
  {rows: 1, columns: 4}, //  4: 1x4, drop 0
  {rows: 1, columns: 5}, //  5: 1x5, drop 0
  {rows: 1, columns: 6}, //  6: 1x6, drop 0

  // 7-12
  {rows: 1, columns: 6}, //  7: 1x6, drop 1
  {rows: 2, columns: 4}, //  8: 2x4, drop 0
  {rows: 2, columns: 4}, //  9: 2x4, drop 1
  {rows: 2, columns: 5}, // 10: 2x5, drop 0
  {rows: 2, columns: 5}, // 11: 2x5, drop 1
  {rows: 2, columns: 6}, // 12: 2x6, drop 0

  // 13-18
  {rows: 2, columns: 6}, // 13: 2x6, drop 1
  {rows: 2, columns: 6}, // 14: 2x6, drop 2
  {rows: 3, columns: 5}, // 15: 3x5, drop 0
  {rows: 3, columns: 5}, // 16: 3x5, drop 1
  {rows: 3, columns: 5}, // 17: 3x5, drop 2
  {rows: 3, columns: 6}, // 18: 3x6, drop 0
];

const minCarouselLayoutItems = carouselLayoutMap.findIndex(x => x !== null);
const maxCarouselLayoutItems = carouselLayoutMap.length - 1;
const shortestCarouselLayout = carouselLayoutMap[minCarouselLayoutItems];
const longestCarouselLayout = carouselLayoutMap[maxCarouselLayoutItems];

export function getCarouselLayoutForNumberOfItems(numItems) {
  return (
    numItems < minCarouselLayoutItems ? shortestCarouselLayout :
    numItems > maxCarouselLayoutItems ? longestCarouselLayout :
    carouselLayoutMap[numItems]);
}

export function filterItemsForCarousel(items) {
  if (empty(items)) {
    return [];
  }

  return items
    .filter(item => item.hasCoverArt)
    .filter(item => item.artTags.every(artTag => !artTag.isContentWarning))
    .slice(0, maxCarouselLayoutItems + 1);
}

// Ridiculous caching support nonsense

export class TupleMap {
  static maxNestedTupleLength = 25;

  #store = [undefined, null, null, null];

  #lifetime(value) {
    if (Array.isArray(value) && value.length <= TupleMap.maxNestedTupleLength) {
      return 'tuple';
    } else if (
      typeof value === 'object' && value !== null ||
      typeof value === 'function'
    ) {
      return 'weak';
    } else {
      return 'strong';
    }
  }

  #getSubstoreShallow(value, store) {
    const lifetime = this.#lifetime(value);
    const mapIndex = {weak: 1, strong: 2, tuple: 3}[lifetime];

    let map = store[mapIndex];
    if (map === null) {
      map = store[mapIndex] =
        (lifetime === 'weak' ? new WeakMap()
       : lifetime === 'strong' ? new Map()
       : lifetime === 'tuple' ? new TupleMap()
       : null);
    }

    if (map.has(value)) {
      return map.get(value);
    } else {
      const substore = [undefined, null, null, null];
      map.set(value, substore);
      return substore;
    }
  }

  #getSubstoreDeep(tuple, store = this.#store) {
    if (tuple.length === 0) {
      return store;
    } else {
      const [first, ...rest] = tuple;
      return this.#getSubstoreDeep(rest, this.#getSubstoreShallow(first, store));
    }
  }

  get(tuple) {
    const store = this.#getSubstoreDeep(tuple);
    return store[0];
  }

  has(tuple) {
    const store = this.#getSubstoreDeep(tuple);
    return store[0] !== undefined;
  }

  set(tuple, value) {
    const store = this.#getSubstoreDeep(tuple);
    store[0] = value;
    return value;
  }
}

export class TupleMapForBabies {
  #here;
  #next;
  #mode;

  constructor(mode = 'weak') {
    if (mode === 'weak') {
      this.#mode = 'weak';
      this.#here = new WeakMap();
      this.#next = new WeakMap();
    } else if (mode === 'strong') {
      this.#mode = 'strong';
      this.#here = new Map();
      this.#next = new Map();
    } else {
      throw new Error(`Expected mode to be weak or strong`);
    }
  }

  set(...args) {
    const first = args.at(0);
    const last = args.at(-1);
    const rest = args.slice(1, -1);

    if (empty(rest)) {
      this.#here.set(first, last);
    } else if (this.#next.has(first)) {
      this.#next.get(first).set(...rest, last);
    } else {
      const tupleMap = new TupleMapForBabies(this.#mode);
      this.#next.set(first, tupleMap);
      tupleMap.set(...rest, last);
    }
  }

  get(...args) {
    const first = args.at(0);
    const rest = args.slice(1);

    if (empty(rest)) {
      return this.#here.get(first);
    } else if (this.#next.has(first)) {
      return this.#next.get(first).get(...rest);
    } else {
      return undefined;
    }
  }

  has(...args) {
    const first = args.at(0);
    const rest = args.slice(1);

    if (empty(rest)) {
      return this.#here.has(first);
    } else if (this.#next.has(first)) {
      return this.#next.get(first).has(...rest);
    } else {
      return false;
    }
  }

  *keys() {
    if (this.#mode === 'weak') {
      throw new Error(`Can't get keys of a weak tuple map`);
    }

    for (const key of this.#here.keys()) {
      yield [key];

      if (this.#next.has(key)) {
        for (const next of this.#next.get(key).keys()) {
          yield [key, ...next];
        }
      }
    }
  }

  *values() {
    if (this.#mode === 'weak') {
      throw new Error(`Can't get values of a weak tuple map`);
    }

    for (const key of this.#here.keys()) {
      yield this.#here.get(key);

      if (this.#next.has(key)) {
        yield* this.#next.get(key).values();
      }
    }
  }
}

const combinedWikiDataTupleMap = new TupleMapForBabies();

export function combineWikiDataArrays(arrays) {
  const map = combinedWikiDataTupleMap;
  if (map.has(...arrays)) {
    return map.get(...arrays);
  } else {
    const combined = arrays.flat();
    map.set(...arrays, combined);
    return combined;
  }
}

// Markdown stuff

export function* matchMarkdownLinks(markdownSource, {marked}) {
  const plausibleLinkRegexp = /\[(?=.*?\))/g;

  const lexer = new marked.Lexer();

  // This is just an optimization. Don't let Marked try to process tokens
  // recursively, i.e. within the text/label of the link. We only care about
  // the text itself, as a string.
  lexer.inlineTokens = _x => [];

  // This is cheating, because the lexer's tokenizer is a private property,
  // but we can apparently access it anyway.
  const {tokenizer} = lexer;

  let plausibleMatch = null;
  while (plausibleMatch = plausibleLinkRegexp.exec(markdownSource)) {
    const {index} = plausibleMatch;

    const definiteMatch =
      tokenizer.link(markdownSource.slice(index));

    if (!definiteMatch) {
      continue;
    }

    const {raw: {length}, text: label, href} = definiteMatch;

    yield {label, href, index, length};
  }
}

export function* matchInlineLinks(source) {
  const plausibleLinkRegexp =
    re('gmi', [
      /\b[a-z]*:\/\//,
      /.*?/,

      '(?=',
        // Ordinary in-sentence punctuation doesn't terminate the
        // un-greedy URL match above, but it shouldn't be counted
        // as part of the link either, if it's at the end.
        /(?:[,.!?]*)/,

        // Actual terminators.
        /(?:\s|$|<br>)/,
      ')',
    ]);

  let plausibleMatch = null;
  while (plausibleMatch = plausibleLinkRegexp.exec(source)) {
    const [href] = plausibleMatch;
    const {index} = plausibleMatch;
    const [{length}] = plausibleMatch;

    try {
      new URL(href);
    } catch {
      continue;
    }

    yield {href, length, index};
  }
}

export const albumHasSubstantialCommentaryPage = album =>
  !empty(
    album.tracks
      .flatMap(track => track.commentary)
      .filter(entry => !entry.isWikiEditorCommentary));

export function sameDayAs(givenDate, thing) {
  if (!givenDate) return null;

  const compare = (a, b) =>
    a && b &&
    a.toDateString() === b.toDateString();

  if (thing.isAlbum || thing.isTrack) {
    const album = thing.isTrack ? thing.album : thing;
    const track = thing.isTrack ? thing : null;

    if (compare(givenDate, album.date)) {
      if (album.style === 'single') {
        return 'single';
      } else {
        return 'album';
      }
    }

    if (compare(givenDate, track?.date)) {
      return 'track';
    }
  }

  if (thing.isFlash) {
    if (compare(givenDate, thing.date)) {
      return 'flash';
    }
  }

  return null;
}
