import find from '#find';
import {empty, stitchArrays} from '#sugar';
import {isDate, isTrackSectionList} from '#validators';
import {filterMultipleArrays} from '#wiki-data';

import {
  exitWithoutDependency,
  exitWithoutUpdateValue,
  exposeDependency,
  exposeUpdateValueOrContinue,
  fillMissingListItems,
  withFlattenedArray,
  withPropertiesFromList,
  withUnflattenedArray,
  withUpdateValueAsDependency,
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
      exposeUpdateValueOrContinue(),
      exposeDependency({
        dependency: 'date',
        update: {validate: isDate},
      }),
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
      exitWithoutDependency({dependency: 'trackData', value: []}),
      exitWithoutUpdateValue({value: [], mode: 'empty'}),

      withUpdateValueAsDependency({into: '#sections'}),

      withPropertiesFromList({
        list: '#sections',
        properties: [
          'tracks',
          'dateOriginallyReleased',
          'isDefaultTrackSection',
          'color',
        ],
      }),

      fillMissingListItems({list: '#sections.tracks', value: []}),
      fillMissingListItems({list: '#sections.isDefaultTrackSection', value: false}),
      fillMissingListItems({list: '#sections.color', dependency: 'color'}),

      withFlattenedArray({
        from: '#sections.tracks',
        into: '#trackRefs',
        intoIndices: '#sections.startIndex',
      }),

      withResolvedReferenceList({
        list: '#trackRefs',
        data: 'trackData',
        notFoundMode: 'null',
        find: find.track,
        into: '#tracks',
      }),

      withUnflattenedArray({
        from: '#tracks',
        fromIndices: '#sections.startIndex',
        into: '#sections.tracks',
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
      class: Group,
      find: find.group,
      data: 'groupData',
    }),

    artTags: referenceList({
      class: ArtTag,
      find: find.artTag,
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
      exitWithoutDependency({dependency: 'trackData', value: []}),
      exitWithoutDependency({dependency: 'trackSections', mode: 'empty', value: []}),

      {
        dependencies: ['trackSections'],
        compute: ({trackSections}, continuation) =>
          continuation({
            '#trackRefs': trackSections
              .flatMap(section => section.tracks ?? []),
          }),
      },

      withResolvedReferenceList({
        list: '#trackRefs',
        data: 'trackData',
        find: find.track,
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
