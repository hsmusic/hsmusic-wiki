import {inspect} from 'node:util';

import {color} from '#cli';
import find from '#find';
import {empty} from '#sugar';

import {
  compositeFrom,
  exitWithoutDependency,
  exposeConstant,
  exposeDependency,
  exposeDependencyOrContinue,
  exposeUpdateValueOrContinue,
  withResultOfAvailabilityCheck,
} from '#composite';

import Thing, {
  withResolvedContribs,
  withResolvedReference,
  withReverseReferenceList,
} from './thing.js';

export class Track extends Thing {
  static [Thing.referenceType] = 'track';

  static [Thing.getPropertyDescriptors] = ({
    Album,
    ArtTag,
    Artist,
    Flash,

    validators: {
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

    color: compositeFrom(`Track.color`, [
      exposeUpdateValueOrContinue(),
      withContainingTrackSection(),

      {
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

      withAlbumProperty({property: 'color'}),

      exposeDependency({
        dependency: '#album.color',
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
    coverArtFileExtension: compositeFrom(`Track.coverArtFileExtension`, [
      // No cover art file extension if the track doesn't have unique artwork
      // in the first place.
      withHasUniqueCoverArt(),
      exitWithoutDependency({dependency: '#hasUniqueCoverArt', mode: 'falsy'}),

      // Expose custom coverArtFileExtension update value first.
      exposeUpdateValueOrContinue(),

      // Expose album's trackCoverArtFileExtension if no update value set.
      withAlbumProperty({property: 'trackCoverArtFileExtension'}),
      exposeDependencyOrContinue({dependency: '#album.trackCoverArtFileExtension'}),

      // Fallback to 'jpg'.
      exposeConstant({
        value: 'jpg',
        update: {validate: isFileExtension},
      }),
    ]),

    // Date of cover art release. Like coverArtFileExtension, this represents
    // only the track's own unique cover artwork, if any. This exposes only as
    // the track's own coverArtDate or its album's trackArtDate, so if neither
    // is specified, this value is null.
    coverArtDate: compositeFrom(`Track.coverArtDate`, [
      withHasUniqueCoverArt(),
      exitWithoutDependency({dependency: '#hasUniqueCoverArt', mode: 'falsy'}),

      exposeUpdateValueOrContinue(),

      withAlbumProperty({property: 'trackArtDate'}),
      exposeDependency({
        dependency: '#album.trackArtDate',
        update: {validate: isDate},
      }),
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

    album: compositeFrom(`Track.album`, [
      withAlbum(),
      exposeDependency({dependency: '#album'}),
    ]),

    // Note - this is an internal property used only to help identify a track.
    // It should not be assumed in general that the album and dataSourceAlbum match
    // (i.e. a track may dynamically be moved from one album to another, at
    // which point dataSourceAlbum refers to where it was originally from, and is
    // not generally relevant information). It's also not guaranteed that
    // dataSourceAlbum is available (depending on the Track creator to optionally
    // provide dataSourceAlbumByRef).
    dataSourceAlbum: Thing.common.resolvedReference({
      ref: 'dataSourceAlbumByRef',
      data: 'albumData',
      find: find.album,
    }),

    date: compositeFrom(`Track.date`, [
      exposeDependencyOrContinue({dependency: 'dateFirstReleased'}),
      withAlbumProperty({property: 'date'}),
      exposeDependency({dependency: '#album.date'}),
    ]),

    // Whether or not the track has "unique" cover artwork - a cover which is
    // specifically associated with this track in particular, rather than with
    // the track's album as a whole. This is typically used to select between
    // displaying the track artwork and a fallback, such as the album artwork
    // or a placeholder. (This property is named hasUniqueCoverArt instead of
    // the usual hasCoverArt to emphasize that it does not inherit from the
    // album.)
    hasUniqueCoverArt: compositeFrom(`Track.hasUniqueCoverArt`, [
      withHasUniqueCoverArt(),
      exposeDependency({dependency: '#hasUniqueCoverArt'}),
    ]),

    originalReleaseTrack: compositeFrom(`Track.originalReleaseTrack`, [
      withOriginalRelease(),
      exposeDependency({dependency: '#originalRelease'}),
    ]),

    otherReleases: compositeFrom(`Track.otherReleases`, [
      exitWithoutDependency({dependency: 'trackData', mode: 'empty'}),
      withOriginalRelease({selfIfOriginal: true}),

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

    artistContribs: compositeFrom(`Track.artistContribs`, [
      inheritFromOriginalRelease({property: 'artistContribs'}),

      withResolvedContribs({
        from: 'artistContribsByRef',
        into: '#artistContribs',
      }),

      {
        dependencies: ['#artistContribs'],
        compute: ({'#artistContribs': contribsFromTrack}, continuation) =>
          (empty(contribsFromTrack)
            ? continuation()
            : contribsFromTrack),
      },

      withAlbumProperty({property: 'artistContribs'}),
      exposeDependency({dependency: '#album.artistContribs'}),
    ]),

    contributorContribs: compositeFrom(`Track.contributorContribs`, [
      inheritFromOriginalRelease({property: 'contributorContribs'}),
      Thing.common.dynamicContribs('contributorContribsByRef'),
    ]),

    // Cover artists aren't inherited from the original release, since it
    // typically varies by release and isn't defined by the musical qualities
    // of the track.
    coverArtistContribs: compositeFrom(`Track.coverArtistContribs`, [
      {
        dependencies: ['disableUniqueCoverArt'],
        compute: ({disableUniqueCoverArt}, continuation) =>
          (disableUniqueCoverArt
            ? null
            : continuation()),
      },

      withResolvedContribs({
        from: 'coverArtistContribsByRef',
        into: '#coverArtistContribs',
      }),

      {
        dependencies: ['#coverArtistContribs'],
        compute: ({'#coverArtistContribs': contribsFromTrack}, continuation) =>
          (empty(contribsFromTrack)
            ? continuation()
            : contribsFromTrack),
      },

      withAlbumProperty({property: 'trackCoverArtistContribs'}),
      exposeDependency({dependency: '#album.trackCoverArtistContribs'}),
    ]),

    referencedTracks: compositeFrom(`Track.referencedTracks`, [
      inheritFromOriginalRelease({property: 'referencedTracks'}),
      Thing.common.resolvedReferenceList({
        list: 'referencedTracksByRef',
        data: 'trackData',
        find: find.track,
      }),
    ]),

    sampledTracks: compositeFrom(`Track.sampledTracks`, [
      inheritFromOriginalRelease({property: 'sampledTracks'}),
      Thing.common.resolvedReferenceList({
        list: 'sampledTracksByRef',
        data: 'trackData',
        find: find.track,
      }),
    ]),

    artTags: Thing.common.resolvedReferenceList({
      list: 'artTagsByRef',
      data: 'artTagData',
      find: find.artTag,
    }),

    // Specifically exclude re-releases from this list - while it's useful to
    // get from a re-release to the tracks it references, re-releases aren't
    // generally relevant from the perspective of the tracks being referenced.
    // Filtering them from data here hides them from the corresponding field
    // on the site (obviously), and has the bonus of not counting them when
    // counting the number of times a track has been referenced, for use in
    // the "Tracks - by Times Referenced" listing page (or other data
    // processing).
    referencedByTracks: trackReverseReferenceList({
      property: 'referencedTracks',
    }),

    // For the same reasoning, exclude re-releases from sampled tracks too.
    sampledByTracks: trackReverseReferenceList({
      property: 'sampledTracks',
    }),

    featuredInFlashes: Thing.common.reverseReferenceList({
      data: 'flashData',
      list: 'featuredTracks',
    }),
  });

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

// Early exits with a value inherited from the original release, if
// this track is a rerelease, and otherwise continues with no further
// dependencies provided. If allowOverride is true, then the continuation
// will also be called if the original release exposed the requested
// property as null.
function inheritFromOriginalRelease({
  property: originalProperty,
  allowOverride = false,
}) {
  return compositeFrom(`inheritFromOriginalRelease`, [
    withOriginalRelease(),

    {
      dependencies: ['#originalRelease'],
      compute({'#originalRelease': originalRelease}, continuation) {
        if (!originalRelease) return continuation.raise();

        const value = originalRelease[originalProperty];
        if (allowOverride && value === null) return continuation.raise();

        return continuation.exit(value);
      },
    },
  ]);
}

// Gets the track's album. This will early exit if albumData is missing.
// By default, if there's no album whose list of tracks includes this track,
// the output dependency will be null; set {notFoundMode: 'exit'} to early
// exit instead.
function withAlbum({
  into = '#album',
  notFoundMode = 'null',
} = {}) {
  return compositeFrom(`withAlbum`, [
    withResultOfAvailabilityCheck({
      fromDependency: 'albumData',
      mode: 'empty',
      into: '#albumDataAvailability',
    }),

    {
      dependencies: ['#albumDataAvailability'],
      options: {notFoundMode},
      mapContinuation: {into},

      compute: ({
        '#albumDataAvailability': albumDataAvailability,
        '#options': {notFoundMode},
      }, continuation) =>
        (albumDataAvailability
          ? continuation()
          : (notFoundMode === 'exit'
              ? continuation.exit(null)
              : continuation.raise({into: null}))),
    },

    {
      dependencies: ['this', 'albumData'],
      compute: ({this: track, albumData}, continuation) =>
        continuation({
          '#album': albumData.find(album => album.tracks.includes(track)),
        }),
    },

    {
      dependencies: ['#album'],
      options: {notFoundMode},
      mapContinuation: {into},

      compute: ({
        '#album': album,
        '#options': {notFoundMode},
      }, continuation) =>
        (album
          ? continuation.raise({into: album})
          : (notFoundMode === 'exit'
              ? continuation.exit(null)
              : continuation.raise({into: null}))),
    },
  ]);
}

// Gets a single property from this track's album, providing it as the same
// property name prefixed with '#album.' (by default). If the track's album
// isn't available, then by default, the property will be provided as null;
// set {notFoundMode: 'exit'} to early exit instead.
function withAlbumProperty({
  property,
  into = '#album.' + property,
  notFoundMode = 'null',
}) {
  return compositeFrom(`withAlbumProperty`, [
    withAlbum({notFoundMode}),

    {
      dependencies: ['#album'],
      options: {property},
      mapContinuation: {into},

      compute: ({
        '#album': album,
        '#options': {property},
      }, continuation) =>
        (album
          ? continuation.raise({into: album[property]})
          : continuation.raise({into: null})),
    },
  ]);
}

// Gets the listed properties from this track's album, providing them as
// dependencies (by default) with '#album.' prefixed before each property
// name. If the track's album isn't available, then by default, the same
// dependency names will be provided as null; set {notFoundMode: 'exit'}
// to early exit instead.
function withAlbumProperties({
  properties,
  prefix = '#album',
  notFoundMode = 'null',
}) {
  return compositeFrom(`withAlbumProperties`, [
    withAlbum({notFoundMode}),

    {
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
  ]);
}

// Gets the track section containing this track from its album's track list.
// If notFoundMode is set to 'exit', this will early exit if the album can't be
// found or if none of its trackSections includes the track for some reason.
function withContainingTrackSection({
  into = '#trackSection',
  notFoundMode = 'null',
} = {}) {
  if (!['exit', 'null'].includes(notFoundMode)) {
    throw new TypeError(`Expected notFoundMode to be exit or null`);
  }

  return compositeFrom(`withContainingTrackSection`, [
    withAlbumProperty({property: 'trackSections', notFoundMode}),

    {
      dependencies: ['this', '#album.trackSections'],
      options: {notFoundMode},
      mapContinuation: {into},

      compute({
        this: track,
        '#album.trackSections': trackSections,
        '#options': {notFoundMode},
      }, continuation) {
        if (!trackSections) {
          return continuation.raise({into: null});
        }

        const trackSection =
          trackSections.find(({tracks}) => tracks.includes(track));

        if (trackSection) {
          return continuation.raise({into: trackSection});
        } else if (notFoundMode === 'exit') {
          return continuation.exit(null);
        } else {
          return continuation.raise({into: null});
        }
      },
    },
  ]);
}

// Just includes the original release of this track as a dependency.
// If this track isn't a rerelease, then it'll provide null, unless the
// {selfIfOriginal} option is set, in which case it'll provide this track
// itself. Note that this will early exit if the original release is
// specified by reference and that reference doesn't resolve to anything.
// Outputs to '#originalRelease' by default.
function withOriginalRelease({
  into = '#originalRelease',
  selfIfOriginal = false,
} = {}) {
  return compositeFrom(`withOriginalRelease`, [
    withResolvedReference({
      ref: 'originalReleaseTrackByRef',
      data: 'trackData',
      into: '#originalRelease',
      find: find.track,
      notFoundMode: 'exit',
    }),

    {
      dependencies: ['this', '#originalRelease'],
      options: {selfIfOriginal},
      mapContinuation: {into},
      compute: ({
        this: track,
        '#originalRelease': originalRelease,
        '#options': {selfIfOriginal},
      }, continuation) =>
        continuation.raise({
          into:
            (originalRelease ??
              (selfIfOriginal
                ? track
                : null)),
        }),
    },
  ]);
}

// The algorithm for checking if a track has unique cover art is used in a
// couple places, so it's defined in full as a compositional step.
function withHasUniqueCoverArt({
  into = '#hasUniqueCoverArt',
} = {}) {
  return compositeFrom(`withHasUniqueCoverArt`, [
    {
      dependencies: ['disableUniqueCoverArt'],
      mapContinuation: {into},
      compute: ({disableUniqueCoverArt}, continuation) =>
        (disableUniqueCoverArt
          ? continuation.raise({into: false})
          : continuation()),
    },

    withResolvedContribs({
      from: 'coverArtistContribsByRef',
      into: '#coverArtistContribs',
    }),

    {
      dependencies: ['#coverArtistContribs'],
      mapContinuation: {into},
      compute: ({'#coverArtistContribs': contribsFromTrack}, continuation) =>
        (empty(contribsFromTrack)
          ? continuation()
          : continuation.raise({into: true})),
    },

    withAlbumProperty({property: 'trackCoverArtistContribs'}),

    {
      dependencies: ['#album.trackCoverArtistContribs'],
      mapContinuation: {into},
      compute: ({'#album.trackCoverArtistContribs': contribsFromAlbum}, continuation) =>
        (empty(contribsFromAlbum)
          ? continuation.raise({into: false})
          : continuation.raise({into: true})),
    },
  ]);
}

function trackReverseReferenceList({
  property: refListProperty,
}) {
  return compositeFrom(`trackReverseReferenceList`, [
    withReverseReferenceList({
      data: 'trackData',
      list: refListProperty,
    }),

    {
      flags: {expose: true},
      expose: {
        dependencies: ['#reverseReferenceList'],
        compute: ({'#reverseReferenceList': reverseReferenceList}) =>
          reverseReferenceList.filter(track => !track.originalReleaseTrack),
      },
    },
  ]);
}
