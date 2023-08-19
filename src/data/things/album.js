import {empty} from '#sugar';
import find from '#find';

import Thing from './thing.js';

export class Album extends Thing {
  static [Thing.referenceType] = 'album';

  static [Thing.getPropertyDescriptors] = ({
    ArtTag,
    Artist,
    Group,
    Track,

    validators: {
      isDate,
      isDimensions,
      isTrackSectionList,
    },
  }) => ({
    // Update & expose

    name: Thing.common.name('Unnamed Album'),
    color: Thing.common.color(),
    directory: Thing.common.directory(),
    urls: Thing.common.urls(),

    date: Thing.common.simpleDate(),
    trackArtDate: Thing.common.simpleDate(),
    dateAddedToWiki: Thing.common.simpleDate(),

    coverArtDate: {
      flags: {update: true, expose: true},

      update: {validate: isDate},

      expose: {
        dependencies: ['date', 'coverArtistContribsByRef'],
        transform: (coverArtDate, {
          coverArtistContribsByRef,
          date,
        }) =>
          (!empty(coverArtistContribsByRef)
            ? coverArtDate ?? date ?? null
            : null),
      },
    },

    artistContribsByRef: Thing.common.contribsByRef(),
    coverArtistContribsByRef: Thing.common.contribsByRef(),
    trackCoverArtistContribsByRef: Thing.common.contribsByRef(),
    wallpaperArtistContribsByRef: Thing.common.contribsByRef(),
    bannerArtistContribsByRef: Thing.common.contribsByRef(),

    groupsByRef: Thing.common.referenceList(Group),
    artTagsByRef: Thing.common.referenceList(ArtTag),

    trackSections: {
      flags: {update: true, expose: true},

      update: {
        validate: isTrackSectionList,
      },

      expose: {
        dependencies: ['color', 'trackData'],
        transform(trackSections, {
          color: albumColor,
          trackData,
        }) {
          let startIndex = 0;
          return trackSections?.map(section => ({
            name: section.name ?? null,
            color: section.color ?? albumColor ?? null,
            dateOriginallyReleased: section.dateOriginallyReleased ?? null,
            isDefaultTrackSection: section.isDefaultTrackSection ?? false,

            startIndex: (
              startIndex += section.tracksByRef.length,
              startIndex - section.tracksByRef.length
            ),

            tracksByRef: section.tracksByRef ?? [],
            tracks:
              (trackData && section.tracksByRef
                ?.map(ref => find.track(ref, trackData, {mode: 'quiet'}))
                .filter(Boolean)) ??
              [],
          }));
        },
      },
    },

    coverArtFileExtension: Thing.common.fileExtension('jpg'),
    trackCoverArtFileExtension: Thing.common.fileExtension('jpg'),

    wallpaperStyle: Thing.common.simpleString(),
    wallpaperFileExtension: Thing.common.fileExtension('jpg'),

    bannerStyle: Thing.common.simpleString(),
    bannerFileExtension: Thing.common.fileExtension('jpg'),
    bannerDimensions: {
      flags: {update: true, expose: true},
      update: {validate: isDimensions},
    },

    hasTrackNumbers: Thing.common.flag(true),
    isListedOnHomepage: Thing.common.flag(true),
    isListedInGalleries: Thing.common.flag(true),

    commentary: Thing.common.commentary(),
    additionalFiles: Thing.common.additionalFiles(),

    // Update only

    artistData: Thing.common.wikiData(Artist),
    artTagData: Thing.common.wikiData(ArtTag),
    groupData: Thing.common.wikiData(Group),
    trackData: Thing.common.wikiData(Track),

    // Expose only

    artistContribs: Thing.common.dynamicContribs('artistContribsByRef'),
    coverArtistContribs: Thing.common.dynamicContribs('coverArtistContribsByRef'),
    trackCoverArtistContribs: Thing.common.dynamicContribs('trackCoverArtistContribsByRef'),
    wallpaperArtistContribs: Thing.common.dynamicContribs('wallpaperArtistContribsByRef'),
    bannerArtistContribs: Thing.common.dynamicContribs('bannerArtistContribsByRef'),

    commentatorArtists: Thing.common.commentatorArtists(),

    hasCoverArt: Thing.common.contribsPresent('coverArtistContribsByRef'),
    hasWallpaperArt: Thing.common.contribsPresent('wallpaperArtistContribsByRef'),
    hasBannerArt: Thing.common.contribsPresent('bannerArtistContribsByRef'),

    tracks: {
      flags: {expose: true},

      expose: {
        dependencies: ['trackSections', 'trackData'],
        compute: ({trackSections, trackData}) =>
          trackSections && trackData
            ? trackSections
                .flatMap((section) => section.tracksByRef ?? [])
                .map((ref) => find.track(ref, trackData, {mode: 'quiet'}))
                .filter(Boolean)
            : [],
      },
    },

    groups: Thing.common.dynamicThingsFromReferenceList(
      'groupsByRef',
      'groupData',
      find.group
    ),

    artTags: Thing.common.dynamicThingsFromReferenceList(
      'artTagsByRef',
      'artTagData',
      find.artTag
    ),
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
    name: Thing.common.name('Unnamed Track Group'),
    color: Thing.common.color(),
    dateOriginallyReleased: Thing.common.simpleDate(),
    isDefaultTrackGroup: Thing.common.flag(false),
  })
}
