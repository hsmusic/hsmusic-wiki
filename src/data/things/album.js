import Thing from './thing.js';

import find from '../../util/find.js';

export class Album extends Thing {
  static [Thing.referenceType] = 'album';

  static [Thing.getPropertyDescriptors] = ({
    ArtTag,
    Artist,
    Group,
    Track,
    TrackGroup,

    validators: {
      isDate,
      isDimensions,
      validateArrayItems,
      validateInstanceOf,
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
        dependencies: ['date', 'hasCoverArt'],
        transform: (coverArtDate, {
          date,
          hasCoverArt,
        }) =>
          (hasCoverArt
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

    trackGroups: {
      flags: {update: true, expose: true},

      update: {
        validate: validateArrayItems(validateInstanceOf(TrackGroup)),
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

    hasCoverArt: Thing.common.flag(true),
    hasTrackArt: Thing.common.flag(true),
    hasTrackNumbers: Thing.common.flag(true),
    isMajorRelease: Thing.common.flag(false),
    isListedOnHomepage: Thing.common.flag(true),

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
    trackCoverArtistContribs: Thing.common.dynamicContribs(
      'trackCoverArtistContribsByRef'
    ),
    wallpaperArtistContribs: Thing.common.dynamicContribs(
      'wallpaperArtistContribsByRef'
    ),
    bannerArtistContribs: Thing.common.dynamicContribs(
      'bannerArtistContribsByRef'
    ),

    commentatorArtists: Thing.common.commentatorArtists(),

    tracks: {
      flags: {expose: true},

      expose: {
        dependencies: ['trackGroups', 'trackData'],
        compute: ({trackGroups, trackData}) =>
          trackGroups && trackData
            ? trackGroups
                .flatMap((group) => group.tracksByRef ?? [])
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
    isMajorRelease: S.id,
    isListedOnHomepage: S.id,

    commentary: S.id,
    additionalFiles: S.id,

    tracks: S.toRefs,
    groups: S.toRefs,
    artTags: S.toRefs,
    commentatorArtists: S.toRefs,
  });
}

export class TrackGroup extends Thing {
  static [Thing.getPropertyDescriptors] = ({
    isColor,
    Track,

    validators: {
      validateInstanceOf,
    },
  }) => ({
    // Update & expose

    name: Thing.common.name('Unnamed Track Group'),

    color: {
      flags: {update: true, expose: true},

      update: {validate: isColor},

      expose: {
        dependencies: ['album'],

        transform(color, {album}) {
          return color ?? album?.color ?? null;
        },
      },
    },

    dateOriginallyReleased: Thing.common.simpleDate(),

    tracksByRef: Thing.common.referenceList(Track),

    isDefaultTrackGroup: Thing.common.flag(false),

    // Update only

    album: {
      flags: {update: true},
      update: {validate: validateInstanceOf(Album)},
    },

    trackData: Thing.common.wikiData(Track),

    // Expose only

    tracks: {
      flags: {expose: true},

      expose: {
        dependencies: ['tracksByRef', 'trackData'],
        compute: ({tracksByRef, trackData}) =>
          tracksByRef && trackData
            ? tracksByRef.map((ref) => find.track(ref, trackData)).filter(Boolean)
            : [],
      },
    },

    startIndex: {
      flags: {expose: true},

      expose: {
        dependencies: ['album'],
        compute: ({album, [TrackGroup.instance]: trackGroup}) =>
          album.trackGroups
            .slice(0, album.trackGroups.indexOf(trackGroup))
            .reduce((acc, tg) => acc + tg.tracks.length, 0),
      },
    },
  })
}
