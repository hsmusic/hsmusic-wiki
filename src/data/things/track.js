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
      Thing.composite.exposeUpdateValueOrContinue(),
      Track.composite.withContainingTrackSection({earlyExitIfNotFound: false}),

      {
        flags: {expose: true, compose: true},
        expose: {
          dependencies: ['#trackSection'],
          compute: ({'#trackSection': trackSection}, continuation) =>
            // Album.trackSections guarantees the track section will have a
            // color property (inheriting from the album's own color), but only
            // if it's actually present! Color will be inherited directly from
            // album otherwise.
            (trackSection
              ? trackSection.color
              : continuation()),
        },
      },

      Track.composite.withAlbumProperty('color'),
      Thing.composite.exposeDependency('#album.color', {
        update: {validate: isColor},
      }),
    ]),

    // Disables presenting the track as though it has its own unique artwork.
    // This flag should only be used in select circumstances, i.e. to override
    // an album's trackCoverArtists. This flag supercedes that property, as well
    // as the track's own coverArtists.
    disableUniqueCoverArt: Thing.common.flag(),

    // File extension for track's corresponding media file. This represents the
    // track's unique cover artwork, if any, and does not inherit the extension
    // of the album's main artwork. It does inherit trackCoverArtFileExtension,
    // if present on the album.
    coverArtFileExtension: Thing.composite.from(`Track.coverArtFileExtension`, [
      // No cover art file extension if the track doesn't have unique artwork
      // in the first place.
      Track.composite.withHasUniqueCoverArt(),
      Thing.composite.earlyExitWithoutDependency('#hasUniqueCoverArt', {mode: 'falsy'}),

      // Expose custom coverArtFileExtension update value first.
      Thing.composite.exposeUpdateValueOrContinue(),

      // Expose album's trackCoverArtFileExtension if no update value set.
      Track.composite.withAlbumProperty('trackCoverArtFileExtension'),
      Thing.composite.exposeDependencyOrContinue('#album.trackCoverArtFileExtension'),

      // Fallback to 'jpg'.
      Thing.composite.exposeConstant('jpg'),
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

    album:
      Thing.composite.from(`Track.album`, [
        Track.composite.withAlbum(),
        Thing.composite.exposeDependency('#album'),
      ]),

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
      Thing.composite.exposeDependencyOrContinue('dateFirstReleased'),
      Track.composite.withAlbumProperty('date'),
      Thing.composite.exposeDependency('#album.date'),
    ]),

    // Whether or not the track has "unique" cover artwork - a cover which is
    // specifically associated with this track in particular, rather than with
    // the track's album as a whole. This is typically used to select between
    // displaying the track artwork and a fallback, such as the album artwork
    // or a placeholder. (This property is named hasUniqueCoverArt instead of
    // the usual hasCoverArt to emphasize that it does not inherit from the
    // album.)
    hasUniqueCoverArt: Thing.composite.from(`Track.hasUniqueCoverArt`, [
      Track.composite.withHasUniqueCoverArt(),
      Thing.composite.exposeDependency('#hasUniqueCoverArt'),
    ]),

    originalReleaseTrack: Thing.composite.from(`Track.originalReleaseTrack`, [
      Track.composite.withOriginalRelease(),
      Thing.composite.exposeDependency('#originalRelease'),
    ]),

    otherReleases:
      Thing.composite.from(`Track.otherReleases`, [
        Thing.composite.earlyExitWithoutDependency('trackData', {mode: 'empty'}),
        Track.composite.withOriginalRelease({selfIfOriginal: true}),

        {
          flags: {expose: true},
          expose: {
            dependencies: ['this', 'trackData', '#originalRelease'],
            compute: ({
              this: thisTrack,
              trackData,
              '#originalRelease': originalRelease,
            }) =>
              (originalRelease === thisTrack
                ? []
                : [originalRelease])
                .concat(trackData.filter(track =>
                  track !== originalRelease &&
                  track !== thisTrack &&
                  track.originalReleaseTrack === originalRelease)),
          },
        },
      ]),

    artistContribs: Thing.composite.from(`Track.artistContribs`, [
      Track.composite.inheritFromOriginalRelease({property: 'artistContribs'}),

      Thing.composite.withResolvedContribs({
        from: 'artistContribsByRef',
        to: '#artistContribs',
      }),

      {
        flags: {expose: true, compose: true},
        expose: {
          mapDependencies: {contribsFromTrack: '#artistContribs'},
          compute: ({contribsFromTrack}, continuation) =>
            (empty(contribsFromTrack)
              ? continuation()
              : contribsFromTrack),
        },
      },

      Track.composite.withAlbumProperty('artistContribs'),

      {
        flags: {expose: true},
        expose: {
          mapDependencies: {contribsFromAlbum: '#album.artistContribs'},
          compute: ({contribsFromAlbum}) =>
            (empty(contribsFromAlbum)
              ? null
              : contribsFromAlbum),
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

      Thing.composite.withResolvedContribs({
        from: 'coverArtistContribsByRef',
        to: '#coverArtistContribs',
      }),

      {
        flags: {expose: true, compose: true},
        expose: {
          mapDependencies: {contribsFromTrack: '#coverArtistContribs'},
          compute: ({contribsFromTrack}, continuation) =>
            (empty(contribsFromTrack)
              ? continuation()
              : contribsFromTrack),
        },
      },

      Track.composite.withAlbumProperty('trackCoverArtistContribs'),
      Thing.composite.exposeDependency('#album.trackCoverArtistContribs'),
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
    inheritFromOriginalRelease({
      property: originalProperty,
      allowOverride = false,
    }) {
      return Thing.composite.from(`Track.composite.inheritFromOriginalRelease`, [
        Track.composite.withOriginalRelease(),

        {
          flags: {expose: true, compose: true},

          expose: {
            dependencies: ['#originalRelease'],

            compute({'#originalRelease': originalRelease}, continuation) {
              if (!originalRelease) return continuation.raise();

              const value = originalRelease[originalProperty];
              if (allowOverride && value === null) return continuation.raise();

              return continuation.exit(value);
            },
          },
        }
      ]);
    },

    // Gets the track's album. Unless earlyExitIfNotFound is overridden false,
    // this will early exit with null in two cases - albumData being missing,
    // or not including an album whose .tracks array includes this track.
    withAlbum({to = '#album', earlyExitIfNotFound = true} = {}) {
      return Thing.composite.from(`Track.composite.withAlbum`, [
        Thing.composite.withResultOfAvailabilityCheck({
          fromDependency: 'albumData',
          mode: 'empty',
          to: '#albumDataAvailability',
        }),

        {
          flags: {expose: true, compose: true},
          expose: {
            dependencies: ['#albumDataAvailability'],
            options: {earlyExitIfNotFound},
            mapContinuation: {to},
            compute: ({
              '#albumDataAvailability': albumDataAvailability,
              '#options': {earlyExitIfNotFound},
            }, continuation) =>
              (albumDataAvailability
                ? continuation()
                : (earlyExitIfNotFound
                    ? continuation.exit(null)
                    : continuation.raise({to: null}))),
          },
        },

        {
          flags: {expose: true, compose: true},
          expose: {
            dependencies: ['this', 'albumData'],
            compute: ({this: track, albumData}, continuation) =>
              continuation({
                '#album':
                  albumData.find(album => album.tracks.includes(track)),
              }),
          },
        },

        {
          flags: {expose: true, compose: true},
          expose: {
            dependencies: ['#album'],
            options: {earlyExitIfNotFound},
            mapContinuation: {to},
            compute: ({
              '#album': album,
              '#options': {earlyExitIfNotFound},
            }, continuation) =>
              (album
                ? continuation.raise({to: album})
                : (earlyExitIfNotFound
                    ? continuation.exit(null)
                    : continuation.raise({to: album}))),
          },
        },
      ]);
    },

    // Gets a single property from this track's album, providing it as the same
    // property name prefixed with '#album.' (by default). If the track's album
    // isn't available, and earlyExitIfNotFound hasn't been set, the property
    // will be provided as null.
    withAlbumProperty(property, {
      to = '#album.' + property,
      earlyExitIfNotFound = false,
    } = {}) {
      return Thing.composite.from(`Track.composite.withAlbumProperty`, [
        Track.composite.withAlbum({earlyExitIfNotFound}),

        {
          flags: {expose: true, compose: true},
          expose: {
            dependencies: ['#album'],
            options: {property},
            mapContinuation: {to},

            compute: ({
              '#album': album,
              '#options': {property},
            }, continuation) =>
              (album
                ? continuation.raise({to: album[property]})
                : continuation.raise({to: null})),
          },
        },
      ]);
    },

    // Gets the listed properties from this track's album, providing them as
    // dependencies (by default) with '#album.' prefixed before each property
    // name. If the track's album isn't available, and earlyExitIfNotFound
    // hasn't been set, the same dependency names will be provided as null.
    withAlbumProperties({
      properties,
      prefix = '#album',
      earlyExitIfNotFound = false,
    }) {
      return Thing.composite.from(`Track.composite.withAlbumProperties`, [
        Track.composite.withAlbum({earlyExitIfNotFound}),

        {
          flags: {expose: true, compose: true},
          expose: {
            dependencies: ['#album'],
            options: {properties, prefix},

            compute({
              '#album': album,
              '#options': {properties, prefix},
            }, continuation) {
              const raise = {};

              if (album) {
                for (const property of properties) {
                  raise[prefix + '.' + property] = album[property];
                }
              } else {
                for (const property of properties) {
                  raise[prefix + '.' + property] = null;
                }
              }

              return continuation.raise(raise);
            },
          },
        },
      ]);
    },

    // Gets the track section containing this track from its album's track list.
    // Unless earlyExitIfNotFound is overridden false, this will early exit if
    // the album can't be found or if none of its trackSections includes the
    // track for some reason.
    withContainingTrackSection({
      to = '#trackSection',
      earlyExitIfNotFound = true,
    } = {}) {
      return Thing.composite.from(`Track.composite.withContainingTrackSection`, [
        Track.composite.withAlbumProperty('trackSections', {earlyExitIfNotFound}),

        {
          flags: {expose: true, compose: true},
          expose: {
            dependencies: ['this', '#album.trackSections'],
            mapContinuation: {to},

            compute({
              this: track,
              '#album.trackSections': trackSections,
            }, continuation) {
              if (!trackSections) {
                return continuation.raise({to: null});
              }

              const trackSection =
                trackSections.find(({tracks}) => tracks.includes(track));

              if (trackSection) {
                return continuation.raise({to: trackSection});
              } else if (earlyExitIfNotFound) {
                return continuation.exit(null);
              } else {
                return continuation.raise({to: null});
              }
            },
          },
        },
      ]);
    },

    // Just includes the original release of this track as a dependency.
    // If this track isn't a rerelease, then it'll provide null, unless the
    // {selfIfOriginal} option is set, in which case it'll provide this track
    // itself. Note that this will early exit if the original release is
    // specified by reference and that reference doesn't resolve to anything.
    // Outputs to '#originalRelease' by default.
    withOriginalRelease({
      to = '#originalRelease',
      selfIfOriginal = false,
    } = {}) {
      return Thing.composite.from(`Track.composite.withOriginalRelease`, [
        Thing.composite.withResolvedReference({
          ref: 'originalReleaseTrackByRef',
          data: 'trackData',
          to: '#originalRelease',
          find: find.track,
          earlyExitIfNotFound: true,
        }),

        {
          flags: {expose: true, compose: true},
          expose: {
            dependencies: ['this', '#originalRelease'],
            options: {selfIfOriginal},
            mapContinuation: {to},
            compute: ({
              this: track,
              '#originalRelease': originalRelease,
              '#options': {selfIfOriginal},
            }, continuation) =>
              continuation.raise({
                to:
                  (originalRelease ??
                    (selfIfOriginal
                      ? track
                      : null)),
              }),
          },
        },
      ]);
    },

    // The algorithm for checking if a track has unique cover art is used in a
    // couple places, so it's defined in full as a compositional step.
    withHasUniqueCoverArt({
      to = '#hasUniqueCoverArt',
    } = {}) {
      return Thing.composite.from(`Track.composite.withHasUniqueCoverArt`, [
        {
          flags: {expose: true, compose: true},
          expose: {
            dependencies: ['disableUniqueCoverArt'],
            mapContinuation: {to},
            compute: ({disableUniqueCoverArt}, continuation) =>
              (disableUniqueCoverArt
                ? continuation.raise({to: false})
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
            mapContinuation: {to},
            compute: ({'#coverArtistContribs': contribsFromTrack}, continuation) =>
              (empty(contribsFromTrack)
                ? continuation()
                : continuation.raise({to: true})),
          },
        },

        Track.composite.withAlbumProperty('trackCoverArtistContribs'),

        {
          flags: {expose: true, compose: true},
          expose: {
            dependencies: ['#album.trackCoverArtistContribs'],
            mapContinuation: {to},
            compute: ({'#album.trackCoverArtistContribs': contribsFromAlbum}, continuation) =>
              (empty(contribsFromAlbum)
                ? continuation.raise({to: false})
                : continuation.raise({to: true})),
          },
        },
      ]);
    },
  };

  [inspect.custom](depth) {
    const parts = [];

    parts.push(Thing.prototype[inspect.custom].apply(this));

    if (this.originalReleaseTrackByRef) {
      parts.unshift(`${color.yellow('[rerelease]')} `);
    }

    let album;
    if (depth >= 0 && (album = this.album ?? this.dataSourceAlbum)) {
      const albumName = album.name;
      const albumIndex = album.tracks.indexOf(this);
      const trackNum =
        (albumIndex === -1
          ? '#?'
          : `#${albumIndex + 1}`);
      parts.push(` (${color.yellow(trackNum)} in ${color.green(albumName)})`);
    }

    return parts.join('');
  }
}
