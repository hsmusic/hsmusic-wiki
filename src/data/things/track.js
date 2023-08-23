import {inspect} from 'node:util';

import {color} from '#cli';
import find from '#find';
import {empty} from '#sugar';

import Thing from './thing.js';

export class Track extends Thing {
  static [Thing.referenceType] = 'track';

  static [Thing.getPropertyDescriptors] = ({
    Album,
    ArtTag,
    Artist,
    Flash,

    validators: {
      isBoolean,
      isColor,
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

    color: Thing.composite.from(`Track.color`, [
      {
        flags: {expose: true, compose: true},
        expose: {
          transform: (color, {}, continuation) =>
            color ?? continuation(),
        },
      },

      Track.composite.withAlbumProperties({
        properties: ['color'],
      }),

      {
        flags: {update: true, expose: true},
        update: {validate: isColor},
        expose: {
          dependencies: ['#album.color'],
          compute: ({'#album.color': color}) => color,
        },
      },
    ]),

    // Disables presenting the track as though it has its own unique artwork.
    // This flag should only be used in select circumstances, i.e. to override
    // an album's trackCoverArtists. This flag supercedes that property, as well
    // as the track's own coverArtists.
    disableUniqueCoverArt: Thing.common.flag(),

    // File extension for track's corresponding media file. This represents the
    // track's unique cover artwork, if any, and does not inherit the cover's
    // main artwork. (It does inherit `trackCoverArtFileExtension` if present
    // on the album.)
    coverArtFileExtension: Thing.composite.from(`Track.coverArtFileExtension`, [
      Track.composite.withAlbumProperties({
        properties: [
          'trackCoverArtistContribsByRef',
          'trackCoverArtFileExtension',
        ],
      }),

      {
        flags: {update: true, expose: true},
        update: {validate: isFileExtension},
        expose: {
          dependencies: [
            'coverArtistContribsByRef',
            'disableUniqueCoverArt',
            '#album.trackCoverArtistContribsByRef',
            '#album.trackCoverArtFileExtension',
          ],

          transform(coverArtFileExtension, {
            coverArtistContribsByRef,
            disableUniqueCoverArt,
            '#album.trackCoverArtistContribsByRef': trackCoverArtistContribsByRef,
            '#album.trackCoverArtFileExtension': trackCoverArtFileExtension,
          }) {
            if (disableUniqueCoverArt) return null;
            if (empty(coverArtistContribsByRef) && empty(trackCoverArtistContribsByRef)) return null;
            return coverArtFileExtension ?? trackCoverArtFileExtension ?? 'jpg';
          },
        },
      },
    ]),

    // Date of cover art release. Like coverArtFileExtension, this represents
    // only the track's own unique cover artwork, if any. This exposes only as
    // the track's own coverArtDate or its album's trackArtDate, so if neither
    // is specified, this value is null.
    coverArtDate: Thing.composite.from(`Track.coverArtDate`, [
      Track.composite.withAlbumProperties({
        properties: [
          'trackArtDate',
          'trackCoverArtistContribsByRef',
        ],
      }),

      {
        flags: {update: true, expose: true},
        update: {validate: isDate},
        expose: {
          dependencies: [
            'coverArtistContribsByRef',
            'disableUniqueCoverArt',
            '#album.trackArtDate',
            '#album.trackCoverArtistContribsByRef',
          ],

          transform(coverArtDate, {
            coverArtistContribsByRef,
            disableUniqueCoverArt,
            '#album.trackArtDate': trackArtDate,
            '#album.trackCoverArtistContribsByRef': trackCoverArtistContribsByRef,
          }) {
            if (disableUniqueCoverArt) return null;
            if (empty(coverArtistContribsByRef) && empty(trackCoverArtistContribsByRef)) return null;
            return coverArtDate ?? trackArtDate;
          },
        },
      }
    ]),

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
        dependencies: ['this', 'albumData'],
        compute: ({this: track, albumData}) =>
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

    date: Thing.composite.from(`Track.date`, [
      {
        flags: {expose: true, compose: true},
        expose: {
          dependencies: ['dateFirstReleased'],
          compute: ({dateFirstReleased}, continuation) =>
            dateFirstReleased ?? continuation(),
        },
      },

      Track.composite.withAlbumProperties({
        properties: ['date'],
      }),

      {
        flags: {expose: true},
        expose: {
          dependencies: ['#album.date'],
          compute: ({'#album.date': date}) => date,
        },
      },
    ]),

    // Whether or not the track has "unique" cover artwork - a cover which is
    // specifically associated with this track in particular, rather than with
    // the track's album as a whole. This is typically used to select between
    // displaying the track artwork and a fallback, such as the album artwork
    // or a placeholder. (This property is named hasUniqueCoverArt instead of
    // the usual hasCoverArt to emphasize that it does not inherit from the
    // album.)
    hasUniqueCoverArt: Thing.composite.from(`Track.hasUniqueCoverArt`, [
      {
        flags: {expose: true, compose: true},
        expose: {
          dependencies: ['disableUniqueCoverArt'],
          compute: ({disableUniqueCoverArt}, continuation) =>
            (disableUniqueCoverArt
              ? false
              : continuation()),
        },
      },

      Thing.composite.withResolvedContribs({
        from: 'coverArtistContribsByRef',
        to: '#coverArtistContribs',
      }),

      {
        flags: {expose: true, compose: true},
        expose: {
          dependencies: ['#coverArtistContribs'],
          compute: ({'#coverArtistContribs': coverArtistContribs}, continuation) =>
            (empty(coverArtistContribs)
              ? continuation()
              : true),
        },
      },

      Track.composite.withAlbumProperties({
        properties: ['trackCoverArtistContribs'],
      }),

      {
        flags: {expose: true},
        expose: {
          dependencies: ['#album.trackCoverArtistContribs'],
          compute: ({'#album.trackCoverArtistContribs': trackCoverArtistContribs}) =>
            (empty(trackCoverArtistContribs)
              ? false
              : true),
        },
      },
    ]),

    originalReleaseTrack: Thing.common.dynamicThingFromSingleReference(
      'originalReleaseTrackByRef',
      'trackData',
      find.track
    ),

    otherReleases: {
      flags: {expose: true},

      expose: {
        dependencies: ['this', 'originalReleaseTrackByRef', 'trackData'],

        compute: ({
          this: t1,
          originalReleaseTrackByRef: t1origRef,
          trackData,
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

    artistContribs: Thing.composite.from(`Track.artistContribs`, [
      Track.composite.inheritFromOriginalRelease({property: 'artistContribs'}),

      Track.composite.withAlbumProperties({properties: ['artistContribs']}),
      Thing.composite.withResolvedContribs({
        from: 'artistContribsByRef',
        to: '#artistContribs',
      }),

      {
        flags: {expose: true},
        expose: {
          dependencies: ['#artistContribs', '#album.artistContribs'],
          compute: ({
            '#artistContribs': contribsFromTrack,
            '#album.artistContribs': contribsFromAlbum,
          }) =>
            (empty(contribsFromTrack)
              ? contribsFromAlbum
              : contribsFromTrack),
        },
      },
    ]),

    contributorContribs: Thing.composite.from(`Track.contributorContribs`, [
      Track.composite.inheritFromOriginalRelease({property: 'contributorContribs'}),
      Thing.common.dynamicContribs('contributorContribsByRef'),
    ]),

    // Cover artists aren't inherited from the original release, since it
    // typically varies by release and isn't defined by the musical qualities
    // of the track.
    coverArtistContribs: Thing.composite.from(`Track.coverArtistContribs`, [
      {
        flags: {expose: true, compose: true},
        expose: {
          dependencies: ['disableUniqueCoverArt'],
          compute: ({disableUniqueCoverArt}, continuation) =>
            (disableUniqueCoverArt
              ? null
              : continuation()),
        },
      },

      Track.composite.withAlbumProperties({
        properties: ['trackCoverArtistContribs'],
      }),

      Thing.composite.withResolvedContribs({
        from: 'coverArtistContribsByRef',
        to: '#coverArtistContribs',
      }),

      {
        flags: {expose: true},
        expose: {
          dependencies: ['#coverArtistContribs', '#album.trackCoverArtistContribs'],
          compute: ({
            '#coverArtistContribs': contribsFromTrack,
            '#album.trackCoverArtistContribs': contribsFromAlbum,
          }) =>
            (empty(contribsFromTrack)
              ? contribsFromAlbum
              : contribsFromTrack),
        },
      },
    ]),

    referencedTracks: Thing.composite.from(`Track.referencedTracks`, [
      Track.composite.inheritFromOriginalRelease({property: 'referencedTracks'}),
      Thing.common.dynamicThingsFromReferenceList('referencedTracksByRef', 'trackData', find.track),
    ]),

    sampledTracks: Thing.composite.from(`Track.sampledTracks`, [
      Track.composite.inheritFromOriginalRelease({property: 'sampledTracks'}),
      Thing.common.dynamicThingsFromReferenceList('sampledTracksByRef', 'trackData', find.track),
    ]),

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
        dependencies: ['this', 'trackData'],

        compute: ({this: track, trackData}) =>
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
        dependencies: ['this', 'trackData'],

        compute: ({this: track, trackData}) =>
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

  static composite = {
    // Early exits with a value inherited from the original release, if
    // this track is a rerelease, and otherwise continues with no further
    // dependencies provided. If allowOverride is true, then the continuation
    // will also be called if the original release exposed the requested
    // property as null.
    inheritFromOriginalRelease: ({property: originalProperty, allowOverride = false}) =>
      Thing.composite.from(`Track.composite.inheritFromOriginalRelease`, [
        Track.composite.withOriginalRelease(),

        {
          flags: {expose: true, compose: true},

          expose: {
            dependencies: ['#originalRelease'],

            compute({'#originalRelease': originalRelease}, continuation) {
              if (!originalRelease) return continuation();

              const value = originalRelease[originalProperty];
              if (allowOverride && value === null) return continuation();

              return value;
            },
          },
        }
      ]),

    // Gets the listed properties from this track's album, providing them as
    // dependencies (by default) with '#album.' prefixed before each property
    // name. If the track's album isn't available, the same dependency names
    // will each be provided as null.
    withAlbumProperties: ({properties, prefix = '#album'}) => ({
      annotation: `Track.composite.withAlbumProperties`,
      flags: {expose: true, compose: true},

      expose: {
        dependencies: ['this', 'albumData'],

        compute({this: track, albumData}, continuation) {
          const album = albumData?.find((album) => album.tracks.includes(track));
          const newDependencies = {};

          for (const property of properties) {
            newDependencies[prefix + '.' + property] =
              (album
                ? album[property]
                : null);
          }

          return continuation(newDependencies);
        },
      },
    }),

    // Just includes the original release of this track as a dependency, or
    // null, if it's not a rerelease. Note that this will early exit if the
    // original release is specified by reference and that reference doesn't
    // resolve to anything. Outputs to '#originalRelease' by default.
    withOriginalRelease: ({to: outputDependency = '#originalRelease'} = {}) =>
      Thing.composite.from(`Track.composite.withOriginalRelease`, [
        Thing.composite.withResolvedReference({
          ref: 'originalReleaseTrackByRef',
          data: 'trackData',
          to: '#originalRelease',
          find: find.track,
          earlyExitIfNotFound: true,
        }),

        Thing.composite.export({
          [outputDependency]: '#originalRelease',
        }),
      ]),
  };

  [inspect.custom]() {
    const base = Thing.prototype[inspect.custom].apply(this);

    const rereleasePart =
      (this.originalReleaseTrackByRef
        ? `${color.yellow('[rerelease]')} `
        : ``);

    const {album, dataSourceAlbum} = this;

    const albumName =
      (album
        ? album.name
        : dataSourceAlbum?.name);

    const albumIndex =
      albumName &&
        (album
          ? album.tracks.indexOf(this)
          : dataSourceAlbum.tracks.indexOf(this));

    const trackNum =
      albumName &&
        (albumIndex === -1
          ? '#?'
          : `#${albumIndex + 1}`);

    const albumPart =
      albumName
        ? ` (${color.yellow(trackNum)} in ${color.green(albumName)})`
        : ``;

    return rereleasePart + base + albumPart;
  }
}
