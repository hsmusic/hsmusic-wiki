import {inspect} from 'node:util';

import {colors} from '#cli';
import find from '#find';
import {empty} from '#sugar';

import {
  compositeFrom,
  exitWithoutDependency,
  exposeConstant,
  exposeDependency,
  exposeDependencyOrContinue,
  exposeUpdateValueOrContinue,
  withPropertyFromObject,
  withResultOfAvailabilityCheck,
  withUpdateValueAsDependency,
} from '#composite';

import {
  isColor,
  isContributionList,
  isDate,
  isFileExtension,
} from '#validators';

import CacheableObject from './cacheable-object.js';

import Thing, {
  additionalFiles,
  commentary,
  commentatorArtists,
  contributionList,
  directory,
  duration,
  flag,
  name,
  referenceList,
  reverseReferenceList,
  simpleDate,
  singleReference,
  simpleString,
  urls,
  wikiData,
  withResolvedContribs,
  withResolvedReference,
  withReverseReferenceList,
} from './thing.js';

export class Track extends Thing {
  static [Thing.referenceType] = 'track';

  static [Thing.getPropertyDescriptors] = ({Album, ArtTag, Artist, Flash}) => ({
    // Update & expose

    name: name('Unnamed Track'),
    directory: directory(),

    duration: duration(),
    urls: urls(),
    dateFirstReleased: simpleDate(),

    color: compositeFrom(`Track.color`, [
      exposeUpdateValueOrContinue(),

      withContainingTrackSection(),
      withPropertyFromObject({object: '#trackSection', property: 'color'}),
      exposeDependencyOrContinue({dependency: '#trackSection.color'}),

      withPropertyFromAlbum({property: 'color'}),
      exposeDependency({
        dependency: '#album.color',
        update: {validate: isColor},
      }),
    ]),

    // Disables presenting the track as though it has its own unique artwork.
    // This flag should only be used in select circumstances, i.e. to override
    // an album's trackCoverArtists. This flag supercedes that property, as well
    // as the track's own coverArtists.
    disableUniqueCoverArt: flag(),

    // File extension for track's corresponding media file. This represents the
    // track's unique cover artwork, if any, and does not inherit the extension
    // of the album's main artwork. It does inherit trackCoverArtFileExtension,
    // if present on the album.
    coverArtFileExtension: compositeFrom(`Track.coverArtFileExtension`, [
      exitWithoutUniqueCoverArt(),

      exposeUpdateValueOrContinue(),

      withPropertyFromAlbum({property: 'trackCoverArtFileExtension'}),
      exposeDependencyOrContinue({dependency: '#album.trackCoverArtFileExtension'}),

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

      withPropertyFromAlbum({property: 'trackArtDate'}),
      exposeDependency({
        dependency: '#album.trackArtDate',
        update: {validate: isDate},
      }),
    ]),

    commentary: commentary(),
    lyrics: simpleString(),

    additionalFiles: additionalFiles(),
    sheetMusicFiles: additionalFiles(),
    midiProjectFiles: additionalFiles(),

    originalReleaseTrack: singleReference({
      class: Track,
      find: find.track,
      data: 'trackData',
    }),

    // Internal use only - for directly identifying an album inside a track's
    // util.inspect display, if it isn't indirectly available (by way of being
    // included in an album's track list).
    dataSourceAlbum: singleReference({
      class: Album,
      find: find.album,
      data: 'albumData',
    }),

    artistContribs: compositeFrom(`Track.artistContribs`, [
      inheritFromOriginalRelease({property: 'artistContribs'}),

      withUpdateValueAsDependency(),
      withResolvedContribs({from: '#updateValue', into: '#artistContribs'}),
      exposeDependencyOrContinue({dependency: '#artistContribs'}),

      withPropertyFromAlbum({property: 'artistContribs'}),
      exposeDependency({
        dependency: '#album.artistContribs',
        update: {validate: isContributionList},
      }),
    ]),

    contributorContribs: compositeFrom(`Track.contributorContribs`, [
      inheritFromOriginalRelease({property: 'contributorContribs'}),
      contributionList(),
    ]),

    // Cover artists aren't inherited from the original release, since it
    // typically varies by release and isn't defined by the musical qualities
    // of the track.
    coverArtistContribs: compositeFrom(`Track.coverArtistContribs`, [
      exitWithoutUniqueCoverArt(),

      withUpdateValueAsDependency(),
      withResolvedContribs({from: '#updateValue', into: '#coverArtistContribs'}),
      exposeDependencyOrContinue({dependency: '#coverArtistContribs'}),

      withPropertyFromAlbum({property: 'trackCoverArtistContribs'}),
      exposeDependency({
        dependency: '#album.trackCoverArtistContribs',
        update: {validate: isContributionList},
      }),
    ]),

    referencedTracks: compositeFrom(`Track.referencedTracks`, [
      inheritFromOriginalRelease({property: 'referencedTracks'}),
      referenceList({
        class: Track,
        find: find.track,
        data: 'trackData',
      }),
    ]),

    sampledTracks: compositeFrom(`Track.sampledTracks`, [
      inheritFromOriginalRelease({property: 'sampledTracks'}),
      referenceList({
        class: Track,
        find: find.track,
        data: 'trackData',
      }),
    ]),

    artTags: referenceList({
      class: ArtTag,
      find: find.artTag,
      data: 'artTagData',
    }),

    // Update only

    albumData: wikiData(Album),
    artistData: wikiData(Artist),
    artTagData: wikiData(ArtTag),
    flashData: wikiData(Flash),
    trackData: wikiData(Track),

    // Expose only

    commentatorArtists: commentatorArtists(),

    album: compositeFrom(`Track.album`, [
      withAlbum(),
      exposeDependency({dependency: '#album'}),
    ]),

    date: compositeFrom(`Track.date`, [
      exposeDependencyOrContinue({dependency: 'dateFirstReleased'}),
      withPropertyFromAlbum({property: 'date'}),
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

    featuredInFlashes: reverseReferenceList({
      data: 'flashData',
      list: 'featuredTracks',
    }),
  });

  [inspect.custom](depth) {
    const parts = [];

    parts.push(Thing.prototype[inspect.custom].apply(this));

    if (CacheableObject.getUpdateValue(this, 'originalReleaseTrack')) {
      parts.unshift(`${colors.yellow('[rerelease]')} `);
    }

    let album;
    if (depth >= 0 && (album = this.album ?? this.dataSourceAlbum)) {
      const albumName = album.name;
      const albumIndex = album.tracks.indexOf(this);
      const trackNum =
        (albumIndex === -1
          ? '#?'
          : `#${albumIndex + 1}`);
      parts.push(` (${colors.yellow(trackNum)} in ${colors.green(albumName)})`);
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

    withResultOfAvailabilityCheck({
      fromDependency: '#album',
      mode: 'null',
      into: '#albumAvailability',
    }),

    {
      dependencies: ['#albumAvailability'],
      options: {notFoundMode},
      mapContinuation: {into},

      compute: ({
        '#albumAvailability': albumAvailability,
        '#options': {notFoundMode},
      }, continuation) =>
        (albumAvailability
          ? continuation()
          : (notFoundMode === 'exit'
              ? continuation.exit(null)
              : continuation.raise({into: null}))),
    },

    {
      dependencies: ['#album'],
      mapContinuation: {into},
      compute: ({'#album': album}, continuation) =>
        continuation({into: album}),
    },
  ]);
}

// Gets a single property from this track's album, providing it as the same
// property name prefixed with '#album.' (by default). If the track's album
// isn't available, then by default, the property will be provided as null;
// set {notFoundMode: 'exit'} to early exit instead.
function withPropertyFromAlbum({
  property,
  into = '#album.' + property,
  notFoundMode = 'null',
}) {
  return compositeFrom(`withPropertyFromAlbum`, [
    withAlbum({notFoundMode}),
    withPropertyFromObject({object: '#album', property, into}),
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
    withPropertyFromAlbum({property: 'trackSections', notFoundMode}),

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
      ref: 'originalReleaseTrack',
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
      from: 'coverArtistContribs',
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

    withPropertyFromAlbum({property: 'trackCoverArtistContribs'}),

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

// Shorthand for checking if the track has unique cover art and exposing a
// fallback value if it isn't.
function exitWithoutUniqueCoverArt({
  value = null,
} = {}) {
  return compositeFrom(`exitWithoutUniqueCoverArt`, [
    withHasUniqueCoverArt(),
    exitWithoutDependency({
      dependency: '#hasUniqueCoverArt',
      mode: 'falsy',
      value,
    }),
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
