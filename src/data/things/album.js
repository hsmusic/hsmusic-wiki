import find from '#find';
import {stitchArrays} from '#sugar';
import {isDate, isDimensions, isTrackSectionList} from '#validators';

import {
  compositeFrom,
  exitWithoutDependency,
  exitWithoutUpdateValue,
  exposeDependency,
  exposeUpdateValueOrContinue,
  withFlattenedArray,
  withUnflattenedArray,
} from '#composite';

import Thing, {
  additionalFiles,
  commentary,
  color,
  commentatorArtists,
  contribsPresent,
  contributionList,
  directory,
  fileExtension,
  flag,
  name,
  referenceList,
  simpleDate,
  simpleString,
  urls,
  wikiData,
  withResolvedContribs,
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

    coverArtDate: compositeFrom(`Album.coverArtDate`, [
      withResolvedContribs({from: 'coverArtistContribs'}),
      exitWithoutDependency({dependency: '#resolvedContribs', mode: 'empty'}),

      exposeUpdateValueOrContinue(),
      exposeDependency({
        dependency: 'date',
        update: {validate: isDate},
      }),
    ]),

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

    trackSections: compositeFrom(`Album.trackSections`, [
      exitWithoutDependency({dependency: 'trackData', value: []}),
      exitWithoutUpdateValue({value: [], mode: 'empty'}),

      {
        transform: (trackSections, continuation) =>
          continuation(trackSections, {
            '#sectionTrackRefs':
              trackSections.map(section => section.tracks),

            '#sectionDateOriginallyReleased':
              trackSections
                .map(({dateOriginallyReleased}) => dateOriginallyReleased ?? null),

            '#sectionIsDefaultTrackSection':
              trackSections
                .map(({isDefaultTrackSection}) => isDefaultTrackSection ?? false),
          }),
      },

      {
        dependencies: ['color'],
        transform: (trackSections, {color: albumColor}, continuation) =>
          continuation(trackSections, {
            '#sectionColor':
              trackSections
                .map(({color: sectionColor}) => sectionColor ?? albumColor),
          }),
      },

      withFlattenedArray({
        from: '#sectionTrackRefs',
        into: '#trackRefs',
        intoIndices: '#sectionStartIndex',
      }),

      withResolvedReferenceList({
        list: '#trackRefs',
        data: 'trackData',
        mode: 'null',
        find: find.track,
        into: '#tracks',
      }),

      withUnflattenedArray({
        from: '#tracks',
        fromIndices: '#sectionStartIndex',
        into: '#sectionTracks',
      }),

      {
        flags: {update: true, expose: true},

        update: {validate: isTrackSectionList},

        expose: {
          dependencies: [
            '#sectionTracks',
            '#sectionColor',
            '#sectionDateOriginallyReleased',
            '#sectionIsDefaultTrackSection',
            '#sectionStartIndex',
          ],

          transform: (trackSections, {
            '#sectionTracks': tracks,
            '#sectionColor': color,
            '#sectionDateOriginallyReleased': dateOriginallyReleased,
            '#sectionIsDefaultTrackSection': isDefaultTrackSection,
            '#sectionStartIndex': startIndex,
          }) =>
            stitchArrays({
              tracks,
              color,
              dateOriginallyReleased,
              isDefaultTrackSection,
              startIndex,
            }),
        },
      },
    ]),

    coverArtFileExtension: compositeFrom(`Album.coverArtFileExtension`, [
      withResolvedContribs({from: 'coverArtistContribs'}),
      exitWithoutDependency({dependency: '#resolvedContribs', mode: 'empty'}),
      fileExtension('jpg'),
    ]),

    trackCoverArtFileExtension: fileExtension('jpg'),

    wallpaperStyle: simpleString(),
    wallpaperFileExtension: fileExtension('jpg'),

    bannerStyle: simpleString(),
    bannerFileExtension: fileExtension('jpg'),
    bannerDimensions: {
      flags: {update: true, expose: true},
      update: {validate: isDimensions},
    },

    hasTrackNumbers: flag(true),
    isListedOnHomepage: flag(true),
    isListedInGalleries: flag(true),

    commentary: commentary(),
    additionalFiles: additionalFiles(),

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

    tracks: compositeFrom(`Album.tracks`, [
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
    ]),
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
