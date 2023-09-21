import find from '#find';
import {empty, stitchArrays} from '#sugar';
import {isDate, isTrackSectionList} from '#validators';
import {filterMultipleArrays} from '#wiki-data';

import {
  exitWithoutDependency,
  exitWithoutUpdateValue,
  exposeDependency,
  exposeUpdateValueOrContinue,
  input,
  fillMissingListItems,
  withFlattenedList,
  withPropertiesFromList,
  withUnflattenedList,
} from '#composite';

import Thing, {
  additionalFiles,
  commentary,
  color,
  commentatorArtists,
  contribsPresent,
  contributionList,
  dimensions,
  directory,
  exitWithoutContribs,
  fileExtension,
  flag,
  name,
  referenceList,
  simpleDate,
  simpleString,
  urls,
  wikiData,
  withResolvedReferenceList,
} from './thing.js';

export class Album extends Thing {
  static [Thing.referenceType] = 'album';

  static [Thing.getPropertyDescriptors] = ({ArtTag, Artist, Group, Track}) => ({
    // Update & expose

    name: name('Unnamed Album'),
    color: color(),
    directory: directory(),
    urls: urls(),

    date: simpleDate(),
    trackArtDate: simpleDate(),
    dateAddedToWiki: simpleDate(),

    coverArtDate: [
      exitWithoutContribs({contribs: 'coverArtistContribs'}),

      exposeUpdateValueOrContinue({
        validate: input.value(isDate),
      }),

      exposeDependency({dependency: 'date'}),
    ],

    coverArtFileExtension: [
      exitWithoutContribs({contribs: 'coverArtistContribs'}),
      fileExtension('jpg'),
    ],

    trackCoverArtFileExtension: fileExtension('jpg'),

    wallpaperFileExtension: [
      exitWithoutContribs({contribs: 'wallpaperArtistContribs'}),
      fileExtension('jpg'),
    ],

    bannerFileExtension: [
      exitWithoutContribs({contribs: 'bannerArtistContribs'}),
      fileExtension('jpg'),
    ],

    wallpaperStyle: [
      exitWithoutContribs({contribs: 'wallpaperArtistContribs'}),
      simpleString(),
    ],

    bannerStyle: [
      exitWithoutContribs({contribs: 'bannerArtistContribs'}),
      simpleString(),
    ],

    bannerDimensions: [
      exitWithoutContribs({contribs: 'bannerArtistContribs'}),
      dimensions(),
    ],

    hasTrackNumbers: flag(true),
    isListedOnHomepage: flag(true),
    isListedInGalleries: flag(true),

    commentary: commentary(),
    additionalFiles: additionalFiles(),

    trackSections: [
      exitWithoutDependency({
        dependency: 'trackData',
        value: input.value([]),
      }),

      exitWithoutUpdateValue({
        mode: input.value('empty'),
        value: input.value([]),
      }),

      withPropertiesFromList({
        list: input.updateValue(),
        prefix: input.value('#sections'),
        properties: input.value([
          'tracks',
          'dateOriginallyReleased',
          'isDefaultTrackSection',
          'color',
        ]),
      }),

      fillMissingListItems({
        list: '#sections.tracks',
        fill: input.value([]),
      }),

      fillMissingListItems({
        list: '#sections.isDefaultTrackSection',
        fill: input.value(false),
      }),

      fillMissingListItems({
        list: '#sections.color',
        fill: input.dependency('color'),
      }),

      withFlattenedList({
        list: '#sections.tracks',
      }).outputs({
        ['#flattenedList']: '#trackRefs',
        ['#flattenedIndices']: '#sections.startIndex',
      }),

      withResolvedReferenceList({
        list: '#trackRefs',
        data: 'trackData',
        notFoundMode: input.value('null'),
        find: input.value(find.track),
      }).outputs({
        ['#resolvedReferenceList']: '#tracks',
      }),

      withUnflattenedList({
        list: '#tracks',
        indices: '#sections.startIndex',
      }).outputs({
        ['#unflattenedList']: '#sections.tracks',
      }),

      {
        flags: {update: true, expose: true},

        update: {validate: isTrackSectionList},

        expose: {
          dependencies: [
            '#sections.tracks',
            '#sections.color',
            '#sections.dateOriginallyReleased',
            '#sections.isDefaultTrackSection',
            '#sections.startIndex',
          ],

          transform(trackSections, {
            '#sections.tracks': tracks,
            '#sections.color': color,
            '#sections.dateOriginallyReleased': dateOriginallyReleased,
            '#sections.isDefaultTrackSection': isDefaultTrackSection,
            '#sections.startIndex': startIndex,
          }) {
            filterMultipleArrays(
              tracks, color, dateOriginallyReleased, isDefaultTrackSection, startIndex,
              tracks => !empty(tracks));

            return stitchArrays({
              tracks,
              color,
              dateOriginallyReleased,
              isDefaultTrackSection,
              startIndex,
            });
          }
        },
      },
    ],

    artistContribs: contributionList(),
    coverArtistContribs: contributionList(),
    trackCoverArtistContribs: contributionList(),
    wallpaperArtistContribs: contributionList(),
    bannerArtistContribs: contributionList(),

    groups: referenceList({
      class: input.value(Group),
      find: input.value(find.group),
      data: 'groupData',
    }),

    artTags: referenceList({
      class: input.value(ArtTag),
      find: input.value(find.artTag),
      data: 'artTagData',
    }),

    // Update only

    artistData: wikiData(Artist),
    artTagData: wikiData(ArtTag),
    groupData: wikiData(Group),
    trackData: wikiData(Track),

    // Expose only

    commentatorArtists: commentatorArtists(),

    hasCoverArt: contribsPresent({contribs: 'coverArtistContribs'}),
    hasWallpaperArt: contribsPresent({contribs: 'wallpaperArtistContribs'}),
    hasBannerArt: contribsPresent({contribs: 'bannerArtistContribs'}),

    tracks: [
      exitWithoutDependency({
        dependency: 'trackData',
        value: input.value([]),
      }),

      exitWithoutDependency({
        dependency: 'trackSections',
        mode: input.value('empty'),
        value: input.value([]),
      }),

      {
        dependencies: ['trackSections'],
        compute: (continuation, {trackSections}) =>
          continuation({
            '#trackRefs': trackSections
              .flatMap(section => section.tracks ?? []),
          }),
      },

      withResolvedReferenceList({
        list: '#trackRefs',
        data: 'trackData',
        find: input.value(find.track),
      }),

      exposeDependency({dependency: '#resolvedReferenceList'}),
    ],
  });

  static [Thing.getSerializeDescriptors] = ({
    serialize: S,
  }) => ({
    name: S.id,
    color: S.id,
    directory: S.id,
    urls: S.id,

    date: S.id,
    coverArtDate: S.id,
    trackArtDate: S.id,
    dateAddedToWiki: S.id,

    artistContribs: S.toContribRefs,
    coverArtistContribs: S.toContribRefs,
    trackCoverArtistContribs: S.toContribRefs,
    wallpaperArtistContribs: S.toContribRefs,
    bannerArtistContribs: S.toContribRefs,

    coverArtFileExtension: S.id,
    trackCoverArtFileExtension: S.id,
    wallpaperStyle: S.id,
    wallpaperFileExtension: S.id,
    bannerStyle: S.id,
    bannerFileExtension: S.id,
    bannerDimensions: S.id,

    hasTrackArt: S.id,
    isListedOnHomepage: S.id,

    commentary: S.id,
    additionalFiles: S.id,

    tracks: S.toRefs,
    groups: S.toRefs,
    artTags: S.toRefs,
    commentatorArtists: S.toRefs,
  });
}

export class TrackSectionHelper extends Thing {
  static [Thing.getPropertyDescriptors] = () => ({
    name: name('Unnamed Track Group'),
    color: color(),
    dateOriginallyReleased: simpleDate(),
    isDefaultTrackGroup: flag(false),
  })
}
