import {inspect} from 'node:util';

import {colors} from '#cli';
import {input, V} from '#composite';
import Thing from '#thing';
import {parseDate, parseExcludingURLs} from '#yaml';

import {
  anyOf,
  is,
  isBoolean,
  isColor,
  isDirectory,
  isExcludingURLsReason,
  isNumber,
} from '#validators';

import {withLengthOfList, withNearbyItemFromList, withPropertyFromObject}
  from '#composite/data';

import {
  exitWithoutDependency,
  exposeConstant,
  exposeDependency,
  exposeUpdateValueOrContinue,
} from '#composite/control-flow';

import {
  contentString,
  directory,
  flag,
  name,
  simpleDate,
  soupyReverse,
  thing,
  thingList,
} from '#composite/wiki-properties';

export class TrackSection extends Thing {
  static [Thing.friendlyName] = `Track Section`;
  static [Thing.referenceType] = `track-section`;
  static [Thing.wikiData] = 'trackSectionData';

  static [Thing.getPropertyDescriptors] = ({Album, Track}) => ({
    // Update & expose

    album: thing(V(Album)),

    name: name(V('Unnamed Track Section')),

    unqualifiedDirectory: directory(),

    directorySuffix: [
      exposeUpdateValueOrContinue({
        validate: input.value(isDirectory),
      }),

      withPropertyFromObject('album', V('directorySuffix')),
      exposeDependency('#album.directorySuffix'),
    ],

    suffixTrackDirectories: [
      exposeUpdateValueOrContinue({
        validate: input.value(isBoolean),
      }),

      withPropertyFromObject('album', V('suffixTrackDirectories')),
      exposeDependency('#album.suffixTrackDirectories'),
    ],

    color: [
      exposeUpdateValueOrContinue({
        validate: input.value(isColor),
      }),

      withPropertyFromObject('album', V('color')),
      exposeDependency('#album.color'),
    ],

    hasTrackNumbers: [
      exposeUpdateValueOrContinue({
        validate: input.value(isBoolean),
      }),

      withPropertyFromObject('album', V('hasTrackNumbers')),
      exposeDependency('#album.hasTrackNumbers'),
    ],

    startCountingFrom: [
      exposeUpdateValueOrContinue({
        validate: input.value(isNumber),
      }),

      withPropertyFromObject('album', V('hasTrackNumbers')),
      exitWithoutDependency('#album.hasTrackNumbers', V(1), V('falsy')),

      withPropertyFromObject('album', V('trackSections')),

      withNearbyItemFromList({
        list: '#album.trackSections',
        item: input.myself(),
        offset: input.value(-1),
      }).outputs({
        '#nearbyItem': '#previousTrackSection',
      }),

      exitWithoutDependency('#previousTrackSection', V(1)),

      withPropertyFromObject('#previousTrackSection', V('continueCountingFrom')),
      exposeDependency('#previousTrackSection.continueCountingFrom'),
    ],

    dateOriginallyReleased: simpleDate(),

    countTracksInArtistTotals: [
      exposeUpdateValueOrContinue({
        validate: input.value(isBoolean),
      }),

      withPropertyFromObject('album', V('countTracksInArtistTotals')),
      exposeDependency('#album.countTracksInArtistTotals'),
    ],

    excludingTrackURLs: [
      exposeUpdateValueOrContinue({
        validate: input.value(
          anyOf(
            is(false),
            isExcludingURLsReason)),
      }),

      withPropertyFromObject('album', V('excludingTrackURLs')),
      exposeDependency('#album.excludingTrackURLs'),
    ],

    isDefaultTrackSection: flag(V(false)),

    description: contentString(),

    tracks: thingList(V(Track)),

    // Update only

    reverse: soupyReverse(),

    // Expose only

    isTrackSection: [
      exposeConstant({
        value: input.value(true),
      }),
    ],

    directory: [
      exitWithoutDependency('album'),
      withPropertyFromObject('album', V('directory')),

      {
        dependencies: ['#album.directory', 'unqualifiedDirectory'],
        compute: ({
          ['#album.directory']: albumDirectory,
          ['unqualifiedDirectory']: unqualifiedDirectory,
        }) =>
          albumDirectory + '/' + unqualifiedDirectory,
      },
    ],

    continueCountingFrom: [
      withPropertyFromObject('album', V('hasTrackNumbers')),
      exitWithoutDependency('#album.hasTrackNumbers', V(null), V('falsy')),

      {
        dependencies: ['hasTrackNumbers', 'startCountingFrom'],
        compute: (continuation, {hasTrackNumbers, startCountingFrom}) =>
          (hasTrackNumbers
            ? continuation()
            : continuation.exit(startCountingFrom)),
      },

      withLengthOfList('tracks'),

      {
        dependencies: ['startCountingFrom', '#tracks.length'],
        compute: ({startCountingFrom, '#tracks.length': tracks}) =>
          startCountingFrom + tracks,
      },
    ],
  });

  static [Thing.findSpecs] = {
    trackSection: {
      referenceTypes: ['track-section'],
      bindTo: 'trackSectionData',
    },

    unqualifiedTrackSection: {
      referenceTypes: ['unqualified-track-section'],

      getMatchableDirectories: trackSection =>
        [trackSection.unqualifiedDirectory],
    },
  };

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Section': {property: 'name'},
      'Directory Suffix': {property: 'directorySuffix'},
      'Suffix Track Directories': {property: 'suffixTrackDirectories'},

      'Color': {property: 'color'},
      'Has Track Numbers': {property: 'hasTrackNumbers'},
      'Start Counting From': {property: 'startCountingFrom'},

      'Date Originally Released': {
        property: 'dateOriginallyReleased',
        transform: parseDate,
      },

      'Count Tracks In Artist Totals': {property: 'countTracksInArtistTotals'},

      'Excluding Track URLs': {
        property: 'excludingTrackURLs',
        transform: parseExcludingURLs,
      },

      'Description': {property: 'description'},
    },
  };

  [inspect.custom](depth) {
    const parts = [];

    parts.push(Thing.prototype[inspect.custom].apply(this));

    if (depth >= 0) showAlbum: {
      let album = null;
      try {
        album = this.album;
      } catch {
        break showAlbum;
      }

      let first = null;
      try {
        first = this.tracks.at(0).trackNumber;
      } catch {}

      let last = null;
      try {
        last = this.tracks.at(-1).trackNumber;
      } catch {}

      const albumName = album.name;
      const albumIndex = album.trackSections.indexOf(this);

      const num =
        (albumIndex === -1
          ? 'indeterminate position'
          : `#${albumIndex + 1}`);

      const range =
        (albumIndex >= 0 && first !== null && last !== null
          ? `: ${first}-${last}`
          : '');

      parts.push(` (${colors.yellow(num + range)} in ${colors.green(`"${albumName}"`)})`);
    }

    return parts.join('');
  }
}
