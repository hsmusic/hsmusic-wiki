import {inspect} from 'node:util';

import {colors} from '#cli';
import find from '#find';
import {empty} from '#sugar';

import {
  exitWithoutDependency,
  excludeFromList,
  exposeConstant,
  exposeDependency,
  exposeDependencyOrContinue,
  exposeUpdateValueOrContinue,
  input,
  raiseOutputWithoutDependency,
  templateCompositeFrom,
  withPropertyFromObject,
} from '#composite';

import {
  is,
  isBoolean,
  isColor,
  isContributionList,
  isDate,
  isFileExtension,
  validateWikiData,
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

    color: [
      exposeUpdateValueOrContinue({
        validate: input.value(isColor),
      }),

      withContainingTrackSection(),

      withPropertyFromObject({
        object: '#trackSection',
        property: input.value('color'),
      }),

      exposeDependencyOrContinue({dependency: '#trackSection.color'}),

      withPropertyFromAlbum({
        property: input.value('color'),
      }),

      exposeDependency({dependency: '#album.color'}),
    ],

    // Controls how find.track works - it'll never be matched by a reference
    // just to the track's name, which means you don't have to always reference
    // some *other* (much more commonly referenced) track by directory instead
    // of more naturally by name.
    alwaysReferenceByDirectory: [
      exposeUpdateValueOrContinue({
        validate: input.value(isBoolean),
      }),

      excludeFromList({
        list: 'trackData',
        item: input.myself(),
      }),

      withOriginalRelease({
        data: '#trackData',
      }),

      exitWithoutDependency({
        dependency: '#originalRelease',
        value: input.value(false),
      }),

      withPropertyFromObject({
        object: '#originalRelease',
        property: input.value('name'),
      }),

      {
        dependencies: ['name', '#originalRelease.name'],
        compute: ({name, '#originalRelease.name': originalName}) =>
          name === originalName,
      },
    ],

    // Disables presenting the track as though it has its own unique artwork.
    // This flag should only be used in select circumstances, i.e. to override
    // an album's trackCoverArtists. This flag supercedes that property, as well
    // as the track's own coverArtists.
    disableUniqueCoverArt: flag(),

    // File extension for track's corresponding media file. This represents the
    // track's unique cover artwork, if any, and does not inherit the extension
    // of the album's main artwork. It does inherit trackCoverArtFileExtension,
    // if present on the album.
    coverArtFileExtension: [
      exitWithoutUniqueCoverArt(),

      exposeUpdateValueOrContinue({
        validate: input.value(isFileExtension),
      }),

      withPropertyFromAlbum({
        property: input.value('trackCoverArtFileExtension'),
      }),

      exposeDependencyOrContinue({dependency: '#album.trackCoverArtFileExtension'}),

      exposeConstant({
        value: input.value('jpg'),
      }),
    ],

    // Date of cover art release. Like coverArtFileExtension, this represents
    // only the track's own unique cover artwork, if any. This exposes only as
    // the track's own coverArtDate or its album's trackArtDate, so if neither
    // is specified, this value is null.
    coverArtDate: [
      withHasUniqueCoverArt(),

      exitWithoutDependency({
        dependency: '#hasUniqueCoverArt',
        mode: input.value('falsy'),
      }),

      exposeUpdateValueOrContinue({
        validate: input.value(isDate),
      }),

      withPropertyFromAlbum({
        property: input.value('trackArtDate'),
      }),

      exposeDependency({dependency: '#album.trackArtDate'}),
    ],

    commentary: commentary(),
    lyrics: simpleString(),

    additionalFiles: additionalFiles(),
    sheetMusicFiles: additionalFiles(),
    midiProjectFiles: additionalFiles(),

    originalReleaseTrack: singleReference({
      class: input.value(Track),
      find: input.value(find.track),
      data: 'trackData',
    }),

    // Internal use only - for directly identifying an album inside a track's
    // util.inspect display, if it isn't indirectly available (by way of being
    // included in an album's track list).
    dataSourceAlbum: singleReference({
      class: input.value(Album),
      find: input.value(find.album),
      data: 'albumData',
    }),

    artistContribs: [
      inheritFromOriginalRelease({
        property: input.value('artistContribs'),
      }),

      withResolvedContribs({
        from: input.updateValue({validate: isContributionList}),
      }).outputs({
        '#resolvedContribs': '#artistContribs',
      }),

      exposeDependencyOrContinue({dependency: '#artistContribs'}),

      withPropertyFromAlbum({
        property: input.value('artistContribs'),
      }),

      exposeDependency({dependency: '#album.artistContribs'}),
    ],

    contributorContribs: [
      inheritFromOriginalRelease({
        property: input.value('contributorContribs'),
      }),

      contributionList(),
    ],

    // Cover artists aren't inherited from the original release, since it
    // typically varies by release and isn't defined by the musical qualities
    // of the track.
    coverArtistContribs: [
      exitWithoutUniqueCoverArt(),

      withResolvedContribs({
        from: input.updateValue({validate: isContributionList}),
      }).outputs({
        '#resolvedContribs': '#coverArtistContribs',
      }),

      exposeDependencyOrContinue({dependency: '#coverArtistContribs'}),

      withPropertyFromAlbum({
        property: input.value('trackCoverArtistContribs'),
      }),

      exposeDependency({dependency: '#album.trackCoverArtistContribs'}),
    ],

    referencedTracks: [
      inheritFromOriginalRelease({
        property: input.value('referencedTracks'),
      }),

      referenceList({
        class: input.value(Track),
        find: input.value(find.track),
        data: 'trackData',
      }),
    ],

    sampledTracks: [
      inheritFromOriginalRelease({
        property: input.value('sampledTracks'),
      }),

      referenceList({
        class: input.value(Track),
        find: input.value(find.track),
        data: 'trackData',
      }),
    ],

    artTags: referenceList({
      class: input.value(ArtTag),
      find: input.value(find.artTag),
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

    album: [
      withAlbum(),
      exposeDependency({dependency: '#album'}),
    ],

    date: [
      exposeDependencyOrContinue({dependency: 'dateFirstReleased'}),

      withPropertyFromAlbum({
        property: input.value('date'),
      }),

      exposeDependency({dependency: '#album.date'}),
    ],

    // Whether or not the track has "unique" cover artwork - a cover which is
    // specifically associated with this track in particular, rather than with
    // the track's album as a whole. This is typically used to select between
    // displaying the track artwork and a fallback, such as the album artwork
    // or a placeholder. (This property is named hasUniqueCoverArt instead of
    // the usual hasCoverArt to emphasize that it does not inherit from the
    // album.)
    hasUniqueCoverArt: [
      withHasUniqueCoverArt(),
      exposeDependency({dependency: '#hasUniqueCoverArt'}),
    ],

    otherReleases: [
      exitWithoutDependency({
        dependency: 'trackData',
        mode: input.value('empty'),
      }),

      withOriginalRelease({
        selfIfOriginal: input.value(true),
      }),

      {
        flags: {expose: true},
        expose: {
          dependencies: [input.myself(), '#originalRelease', 'trackData'],
          compute: ({
            [input.myself()]: thisTrack,
            ['#originalRelease']: originalRelease,
            trackData,
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
    ],

    // Specifically exclude re-releases from this list - while it's useful to
    // get from a re-release to the tracks it references, re-releases aren't
    // generally relevant from the perspective of the tracks being referenced.
    // Filtering them from data here hides them from the corresponding field
    // on the site (obviously), and has the bonus of not counting them when
    // counting the number of times a track has been referenced, for use in
    // the "Tracks - by Times Referenced" listing page (or other data
    // processing).
    referencedByTracks: trackReverseReferenceList({
      list: input.value('referencedTracks'),
    }),

    // For the same reasoning, exclude re-releases from sampled tracks too.
    sampledByTracks: trackReverseReferenceList({
      list: input.value('sampledTracks'),
    }),

    featuredInFlashes: reverseReferenceList({
      data: 'flashData',
      list: input.value('featuredTracks'),
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
export const inheritFromOriginalRelease = templateCompositeFrom({
  annotation: `Track.inheritFromOriginalRelease`,

  inputs: {
    property: input({type: 'string'}),
    allowOverride: input({type: 'boolean', defaultValue: false}),
  },

  steps: () => [
    withOriginalRelease(),

    {
      dependencies: [
        '#originalRelease',
        input('property'),
        input('allowOverride'),
      ],

      compute: (continuation, {
        ['#originalRelease']: originalRelease,
        [input('property')]: originalProperty,
        [input('allowOverride')]: allowOverride,
      }) => {
        if (!originalRelease) return continuation();

        const value = originalRelease[originalProperty];
        if (allowOverride && value === null) return continuation();

        return continuation.exit(value);
      },
    },
  ],
});

// Gets the track's album. This will early exit if albumData is missing.
// By default, if there's no album whose list of tracks includes this track,
// the output dependency will be null; set {notFoundMode: 'exit'} to early
// exit instead.
export const withAlbum = templateCompositeFrom({
  annotation: `Track.withAlbum`,

  inputs: {
    notFoundMode: input({
      validate: is('exit', 'null'),
      defaultValue: 'null',
    }),
  },

  outputs: ['#album'],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: 'albumData',
      mode: input.value('empty'),
      output: input.value({
        ['#album']: null,
      }),
    }),

    {
      dependencies: [input.myself(), 'albumData'],
      compute: (continuation, {
        [input.myself()]: track,
        ['albumData']: albumData,
      }) =>
        continuation({
          ['#album']:
            albumData.find(album => album.tracks.includes(track)),
        }),
    },

    raiseOutputWithoutDependency({
      dependency: '#album',
      output: input.value({
        ['#album']: null,
      }),
    }),

    {
      dependencies: ['#album'],
      compute: (continuation, {'#album': album}) =>
        continuation.raiseOutput({'#album': album}),
    },
  ],
});

// Gets a single property from this track's album, providing it as the same
// property name prefixed with '#album.' (by default). If the track's album
// isn't available, then by default, the property will be provided as null;
// set {notFoundMode: 'exit'} to early exit instead.
export const withPropertyFromAlbum = templateCompositeFrom({
  annotation: `withPropertyFromAlbum`,

  inputs: {
    property: input.staticValue({type: 'string'}),

    notFoundMode: input({
      validate: is('exit', 'null'),
      defaultValue: 'null',
    }),
  },

  outputs: ({
    [input.staticValue('property')]: property,
  }) => ['#album.' + property],

  steps: () => [
    withAlbum({
      notFoundMode: input('notFoundMode'),
    }),

    withPropertyFromObject({
      object: '#album',
      property: input('property'),
    }),

    {
      dependencies: ['#value', input.staticValue('property')],
      compute: (continuation, {
        ['#value']: value,
        [input.staticValue('property')]: property,
      }) => continuation({
        ['#album.' + property]: value,
      }),
    },
  ],
});

// Gets the track section containing this track from its album's track list.
// If notFoundMode is set to 'exit', this will early exit if the album can't be
// found or if none of its trackSections includes the track for some reason.
export const withContainingTrackSection = templateCompositeFrom({
  annotation: `withContainingTrackSection`,

  inputs: {
    notFoundMode: input({
      validate: is('exit', 'null'),
      defaultValue: 'null',
    }),
  },

  outputs: ['#trackSection'],

  steps: () => [
    withPropertyFromAlbum({
      property: input.value('trackSections'),
      notFoundMode: input('notFoundMode'),
    }),

    {
      dependencies: [
        input.myself(),
        input('notFoundMode'),
        '#album.trackSections',
      ],

      compute(continuation, {
        [input.myself()]: track,
        [input('notFoundMode')]: notFoundMode,
        ['#album.trackSections']: trackSections,
      }) {
        if (!trackSections) {
          return continuation.raiseOutput({
            ['#trackSection']: null,
          });
        }

        const trackSection =
          trackSections.find(({tracks}) => tracks.includes(track));

        if (trackSection) {
          return continuation.raiseOutput({
            ['#trackSection']: trackSection,
          });
        } else if (notFoundMode === 'exit') {
          return continuation.exit(null);
        } else {
          return continuation.raiseOutput({
            ['#trackSection']: null,
          });
        }
      },
    },
  ],
});

// Just includes the original release of this track as a dependency.
// If this track isn't a rerelease, then it'll provide null, unless the
// {selfIfOriginal} option is set, in which case it'll provide this track
// itself. Note that this will early exit if the original release is
// specified by reference and that reference doesn't resolve to anything.
// Outputs to '#originalRelease' by default.
export const withOriginalRelease = templateCompositeFrom({
  annotation: `withOriginalRelease`,

  inputs: {
    selfIfOriginal: input({type: 'boolean', defaultValue: false}),

    data: input({
      validate: validateWikiData({referenceType: 'track'}),
      defaultDependency: 'trackData',
    }),
  },

  outputs: ['#originalRelease'],

  steps: () => [
    withResolvedReference({
      ref: 'originalReleaseTrack',
      data: input('data'),
      find: input.value(find.track),
      notFoundMode: input.value('exit'),
    }).outputs({
      ['#resolvedReference']: '#originalRelease',
    }),

    {
      dependencies: [
        input.myself(),
        input('selfIfOriginal'),
        '#originalRelease',
      ],

      compute: (continuation, {
        [input.myself()]: track,
        [input('selfIfOriginal')]: selfIfOriginal,
        ['#originalRelease']: originalRelease,
      }) =>
        continuation({
          ['#originalRelease']:
            (originalRelease ??
              (selfIfOriginal
                ? track
                : null)),
        }),
    },
  ],
});

// The algorithm for checking if a track has unique cover art is used in a
// couple places, so it's defined in full as a compositional step.
export const withHasUniqueCoverArt = templateCompositeFrom({
  annotation: 'withHasUniqueCoverArt',

  outputs: ['#hasUniqueCoverArt'],

  steps: () => [
    {
      dependencies: ['disableUniqueCoverArt'],
      compute: (continuation, {disableUniqueCoverArt}) =>
        (disableUniqueCoverArt
          ? continuation.raiseOutput({
              ['#hasUniqueCoverArt']: false,
            })
          : continuation()),
    },

    withResolvedContribs({from: 'coverArtistContribs'}),

    {
      dependencies: ['#resolvedContribs'],
      compute: (continuation, {
        ['#resolvedContribs']: contribsFromTrack,
      }) =>
        (empty(contribsFromTrack)
          ? continuation()
          : continuation.raiseOutput({
              ['#hasUniqueCoverArt']: true,
            })),
    },

    withPropertyFromAlbum({
      property: input.value('trackCoverArtistContribs'),
    }),

    {
      dependencies: ['#album.trackCoverArtistContribs'],
      compute: (continuation, {
        ['#album.trackCoverArtistContribs']: contribsFromAlbum,
      }) =>
        continuation.raiseOutput({
          ['#hasUniqueCoverArt']:
            !empty(contribsFromAlbum),
        }),
    },
  ],
});

// Shorthand for checking if the track has unique cover art and exposing a
// fallback value if it isn't.
export const exitWithoutUniqueCoverArt = templateCompositeFrom({
  annotation: `exitWithoutUniqueCoverArt`,

  inputs: {
    value: input({defaultValue: null}),
  },

  steps: () => [
    withHasUniqueCoverArt(),

    exitWithoutDependency({
      dependency: '#hasUniqueCoverArt',
      mode: input.value('falsy'),
      value: input('value'),
    }),
  ],
});

export const trackReverseReferenceList = templateCompositeFrom({
  annotation: `trackReverseReferenceList`,

  compose: false,

  inputs: {
    list: input({type: 'string'}),
  },

  steps: () => [
    withReverseReferenceList({
      data: 'trackData',
      list: input('list'),
    }),

    {
      flags: {expose: true},
      expose: {
        dependencies: ['#reverseReferenceList'],
        compute: ({
          ['#reverseReferenceList']: reverseReferenceList,
        }) =>
          reverseReferenceList.filter(track => !track.originalReleaseTrack),
      },
    },
  ],
});
