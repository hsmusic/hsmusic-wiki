import Thing from './thing.js';

import {inspect} from 'util';
import {color} from '../../util/cli.js';

import find from '../../util/find.js';

export class Track extends Thing {
  static [Thing.referenceType] = 'track';

  static [Thing.getPropertyDescriptors] = ({
    Album,
    ArtTag,
    Artist,
    Flash,

    validators: {
      isBoolean,
      isDate,
      isDuration,
      isFileExtension,
    },
  }) => ({
    // Update & expose

    name: Thing.common.name('Unnamed Track'),
    directory: Thing.common.directory(),

    duration: {
      flags: {update: true, expose: true},
      update: {validate: isDuration},
    },

    urls: Thing.common.urls(),
    dateFirstReleased: Thing.common.simpleDate(),

    artistContribsByRef: Thing.common.contribsByRef(),
    contributorContribsByRef: Thing.common.contribsByRef(),
    coverArtistContribsByRef: Thing.common.contribsByRef(),

    referencedTracksByRef: Thing.common.referenceList(Track),
    sampledTracksByRef: Thing.common.referenceList(Track),
    artTagsByRef: Thing.common.referenceList(ArtTag),

    hasCoverArt: {
      flags: {update: true, expose: true},

      update: {validate: isBoolean},

      expose: {
        dependencies: ['albumData', 'coverArtistContribsByRef'],
        transform: (hasCoverArt, {
          albumData,
          coverArtistContribsByRef,
          [Track.instance]: track,
        }) =>
          Track.hasCoverArt(
            track,
            albumData,
            coverArtistContribsByRef,
            hasCoverArt
          ),
      },
    },

    coverArtFileExtension: {
      flags: {update: true, expose: true},

      update: {validate: isFileExtension},

      expose: {
        dependencies: ['albumData', 'coverArtistContribsByRef'],
        transform: (coverArtFileExtension, {
          albumData,
          coverArtistContribsByRef,
          hasCoverArt,
          [Track.instance]: track,
        }) =>
          coverArtFileExtension ??
          (Track.hasCoverArt(
            track,
            albumData,
            coverArtistContribsByRef,
            hasCoverArt
          )
            ? Track.findAlbum(track, albumData)?.trackCoverArtFileExtension
            : Track.findAlbum(track, albumData)?.coverArtFileExtension) ??
          'jpg',
      },
    },

    originalReleaseTrackByRef: Thing.common.singleReference(Track),

    dataSourceAlbumByRef: Thing.common.singleReference(Album),

    commentary: Thing.common.commentary(),
    lyrics: Thing.common.simpleString(),
    additionalFiles: Thing.common.additionalFiles(),
    sheetMusicFiles: Thing.common.additionalFiles(),
    midiProjectFiles: Thing.common.additionalFiles(),

    // Update only

    albumData: Thing.common.wikiData(Album),
    artistData: Thing.common.wikiData(Artist),
    artTagData: Thing.common.wikiData(ArtTag),
    flashData: Thing.common.wikiData(Flash),
    trackData: Thing.common.wikiData(Track),

    // Expose only

    commentatorArtists: Thing.common.commentatorArtists(),

    album: {
      flags: {expose: true},

      expose: {
        dependencies: ['albumData'],
        compute: ({[Track.instance]: track, albumData}) =>
          albumData?.find((album) => album.tracks.includes(track)) ?? null,
      },
    },

    // Note - this is an internal property used only to help identify a track.
    // It should not be assumed in general that the album and dataSourceAlbum match
    // (i.e. a track may dynamically be moved from one album to another, at
    // which point dataSourceAlbum refers to where it was originally from, and is
    // not generally relevant information). It's also not guaranteed that
    // dataSourceAlbum is available (depending on the Track creator to optionally
    // provide dataSourceAlbumByRef).
    dataSourceAlbum: Thing.common.dynamicThingFromSingleReference(
      'dataSourceAlbumByRef',
      'albumData',
      find.album
    ),

    date: {
      flags: {expose: true},

      expose: {
        dependencies: ['albumData', 'dateFirstReleased'],
        compute: ({albumData, dateFirstReleased, [Track.instance]: track}) =>
          dateFirstReleased ?? Track.findAlbum(track, albumData)?.date ?? null,
      },
    },

    color: {
      flags: {expose: true},

      expose: {
        dependencies: ['albumData'],

        compute: ({albumData, [Track.instance]: track}) =>
          Track.findAlbum(track, albumData)
            ?.trackSections.find(({tracks}) => tracks.includes(track))
              ?.color ?? null,
      },
    },

    coverArtDate: {
      flags: {update: true, expose: true},

      update: {validate: isDate},

      expose: {
        dependencies: [
          'albumData',
          'coverArtistContribsByRef',
          'dateFirstReleased',
          'hasCoverArt',
        ],
        transform: (coverArtDate, {
          albumData,
          coverArtistContribsByRef,
          dateFirstReleased,
          hasCoverArt,
          [Track.instance]: track,
        }) =>
          (Track.hasCoverArt(track, albumData, coverArtistContribsByRef, hasCoverArt)
            ? coverArtDate ??
              dateFirstReleased ??
              Track.findAlbum(track, albumData)?.trackArtDate ??
              Track.findAlbum(track, albumData)?.date ??
              null
            : null),
      },
    },

    hasUniqueCoverArt: {
      flags: {expose: true},

      expose: {
        dependencies: ['albumData', 'coverArtistContribsByRef', 'hasCoverArt'],
        compute: ({
          albumData,
          coverArtistContribsByRef,
          hasCoverArt,
          [Track.instance]: track,
        }) =>
          Track.hasUniqueCoverArt(
            track,
            albumData,
            coverArtistContribsByRef,
            hasCoverArt
          ),
      },
    },

    originalReleaseTrack: Thing.common.dynamicThingFromSingleReference(
      'originalReleaseTrackByRef',
      'trackData',
      find.track
    ),

    otherReleases: {
      flags: {expose: true},

      expose: {
        dependencies: ['originalReleaseTrackByRef', 'trackData'],

        compute: ({
          originalReleaseTrackByRef: t1origRef,
          trackData,
          [Track.instance]: t1,
        }) => {
          if (!trackData) {
            return [];
          }

          const t1orig = find.track(t1origRef, trackData);

          return [
            t1orig,
            ...trackData.filter((t2) => {
              const {originalReleaseTrack: t2orig} = t2;
              return t2 !== t1 && t2orig && (t2orig === t1orig || t2orig === t1);
            }),
          ].filter(Boolean);
        },
      },
    },

    artistContribs: Thing.common.dynamicInheritContribs(
      'artistContribsByRef',
      'artistContribsByRef',
      'albumData',
      Track.findAlbum
    ),

    contributorContribs: Thing.common.dynamicContribs('contributorContribsByRef'),

    coverArtistContribs: Thing.common.dynamicInheritContribs(
      'coverArtistContribsByRef',
      'trackCoverArtistContribsByRef',
      'albumData',
      Track.findAlbum
    ),

    referencedTracks: Thing.common.dynamicThingsFromReferenceList(
      'referencedTracksByRef',
      'trackData',
      find.track
    ),

    sampledTracks: Thing.common.dynamicThingsFromReferenceList(
      'sampledTracksByRef',
      'trackData',
      find.track
    ),

    // Specifically exclude re-releases from this list - while it's useful to
    // get from a re-release to the tracks it references, re-releases aren't
    // generally relevant from the perspective of the tracks being referenced.
    // Filtering them from data here hides them from the corresponding field
    // on the site (obviously), and has the bonus of not counting them when
    // counting the number of times a track has been referenced, for use in
    // the "Tracks - by Times Referenced" listing page (or other data
    // processing).
    referencedByTracks: {
      flags: {expose: true},

      expose: {
        dependencies: ['trackData'],

        compute: ({trackData, [Track.instance]: track}) =>
          trackData
            ? trackData
                .filter((t) => !t.originalReleaseTrack)
                .filter((t) => t.referencedTracks?.includes(track))
            : [],
      },
    },

    // For the same reasoning, exclude re-releases from sampled tracks too.
    sampledByTracks: {
      flags: {expose: true},

      expose: {
        dependencies: ['trackData'],

        compute: ({trackData, [Track.instance]: track}) =>
          trackData
            ? trackData
                .filter((t) => !t.originalReleaseTrack)
                .filter((t) => t.sampledTracks?.includes(track))
            : [],
      },
    },

    featuredInFlashes: Thing.common.reverseReferenceList(
      'flashData',
      'featuredTracks'
    ),

    artTags: Thing.common.dynamicThingsFromReferenceList(
      'artTagsByRef',
      'artTagData',
      find.artTag
    ),
  });

  // This is a quick utility function for now, since the same code is reused in
  // several places. Ideally it wouldn't be - we'd just reuse the `album`
  // property - but support for that hasn't been coded yet :P
  static findAlbum = (track, albumData) =>
    albumData?.find((album) => album.tracks.includes(track));

  // Another reused utility function. This one's logic is a bit more complicated.
  static hasCoverArt = (
    track,
    albumData,
    coverArtistContribsByRef,
    hasCoverArt
  ) => (
    hasCoverArt ??
    (coverArtistContribsByRef?.length > 0 || null) ??
    Track.findAlbum(track, albumData)?.hasTrackArt ??
    true
  );

  // Now this is a doozy!
  static hasUniqueCoverArt(
    track,
    albumData,
    coverArtistContribsByRef,
    hasCoverArt
  ) {
    if (coverArtistContribsByRef?.length > 0) {
      return true;
    } else if (coverArtistContribsByRef) {
      return false;
    } else if (hasCoverArt === false) {
      return false;
    } else if (Track.findAlbum(track, albumData)?.hasTrackArt) {
      return true;
    } else {
      return false;
    }
  }

  [inspect.custom]() {
    const base = Thing.prototype[inspect.custom].apply(this);

    const {album, dataSourceAlbum} = this;
    const albumName = album ? album.name : dataSourceAlbum?.name;
    const albumIndex =
      albumName &&
      (album ? album.tracks.indexOf(this) : dataSourceAlbum.tracks.indexOf(this));
    const trackNum = albumIndex === -1 ? '#?' : `#${albumIndex + 1}`;

    return albumName
      ? base + ` (${color.yellow(trackNum)} in ${color.green(albumName)})`
      : base;
  }
}
