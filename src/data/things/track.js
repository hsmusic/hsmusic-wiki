import {inspect} from 'node:util';

import CacheableObject from '#cacheable-object';
import {colors} from '#cli';
import {input} from '#composite';
import Thing from '#thing';
import {isBoolean, isColor, isContributionList, isDate, isFileExtension}
  from '#validators';

import {
  parseAdditionalFiles,
  parseAdditionalNames,
  parseAnnotatedReferences,
  parseArtwork,
  parseContributors,
  parseDate,
  parseDimensions,
  parseDuration,
} from '#yaml';

import {withPropertyFromObject} from '#composite/data';

import {
  exposeConstant,
  exposeDependency,
  exposeDependencyOrContinue,
  exposeUpdateValueOrContinue,
  exposeWhetherDependencyAvailable,
} from '#composite/control-flow';

import {
  withRecontextualizedContributionList,
  withRedatedContributionList,
  withResolvedContribs,
} from '#composite/wiki-data';

import {
  additionalFiles,
  additionalNameList,
  commentary,
  commentatorArtists,
  constitutibleArtworkList,
  contentString,
  contributionList,
  dimensions,
  directory,
  duration,
  flag,
  lyrics,
  name,
  referenceList,
  referencedArtworkList,
  reverseReferenceList,
  simpleDate,
  simpleString,
  singleReference,
  soupyFind,
  soupyReverse,
  thing,
  urls,
  wikiData,
} from '#composite/wiki-properties';

import {
  exitWithoutUniqueCoverArt,
  inheritContributionListFromMainRelease,
  inheritFromMainRelease,
  withAllReleases,
  withAlwaysReferenceByDirectory,
  withContainingTrackSection,
  withCoverArtistContribs,
  withDate,
  withDirectorySuffix,
  withHasUniqueCoverArt,
  withMainRelease,
  withOtherReleases,
  withPropertyFromAlbum,
  withSuffixDirectoryFromAlbum,
  withTrackArtDate,
  withTrackNumber,
} from '#composite/things/track';

export class Track extends Thing {
  static [Thing.referenceType] = 'track';

  static [Thing.getPropertyDescriptors] = ({
    Album,
    ArtTag,
    Artwork,
    Flash,
    TrackSection,
    WikiInfo,
  }) => ({
    // Update & expose

    name: name('Unnamed Track'),

    directory: [
      withDirectorySuffix(),

      directory({
        suffix: '#directorySuffix',
      }),
    ],

    suffixDirectoryFromAlbum: [
      {
        dependencies: [
          input.updateValue({validate: isBoolean}),
        ],

        compute: (continuation, {
          [input.updateValue()]: value,
        }) => continuation({
          ['#flagValue']: value ?? false,
        }),
      },

      withSuffixDirectoryFromAlbum({
        flagValue: '#flagValue',
      }),

      exposeDependency({
        dependency: '#suffixDirectoryFromAlbum',
      })
    ],

    album: thing({
      class: input.value(Album),
    }),

    additionalNames: additionalNameList(),

    bandcampTrackIdentifier: simpleString(),
    bandcampArtworkIdentifier: simpleString(),

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

    alwaysReferenceByDirectory: [
      withAlwaysReferenceByDirectory(),
      exposeDependency({dependency: '#alwaysReferenceByDirectory'}),
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

    coverArtDate: [
      withTrackArtDate({
        from: input.updateValue({
          validate: isDate,
        }),
      }),

      exposeDependency({dependency: '#trackArtDate'}),
    ],

    coverArtDimensions: [
      exitWithoutUniqueCoverArt(),

      exposeUpdateValueOrContinue(),

      withPropertyFromAlbum({
        property: input.value('trackDimensions'),
      }),

      exposeDependencyOrContinue({dependency: '#album.trackDimensions'}),

      dimensions(),
    ],

    commentary: commentary(),
    creditSources: commentary(),

    lyrics: [
      inheritFromMainRelease(),
      lyrics(),
    ],

    additionalFiles: additionalFiles(),
    sheetMusicFiles: additionalFiles(),
    midiProjectFiles: additionalFiles(),

    mainReleaseTrack: singleReference({
      class: input.value(Track),
      find: soupyFind.input('track'),
    }),

    artistContribs: [
      inheritContributionListFromMainRelease(),

      withDate(),

      withResolvedContribs({
        from: input.updateValue({validate: isContributionList}),
        thingProperty: input.thisProperty(),
        artistProperty: input.value('trackArtistContributions'),
        date: '#date',
      }).outputs({
        '#resolvedContribs': '#artistContribs',
      }),

      exposeDependencyOrContinue({
        dependency: '#artistContribs',
        mode: input.value('empty'),
      }),

      withPropertyFromAlbum({
        property: input.value('artistContribs'),
      }),

      withRecontextualizedContributionList({
        list: '#album.artistContribs',
        artistProperty: input.value('trackArtistContributions'),
      }),

      withRedatedContributionList({
        list: '#album.artistContribs',
        date: '#date',
      }),

      exposeDependency({dependency: '#album.artistContribs'}),
    ],

    contributorContribs: [
      inheritContributionListFromMainRelease(),

      withDate(),

      contributionList({
        date: '#date',
        artistProperty: input.value('trackContributorContributions'),
      }),
    ],

    coverArtistContribs: [
      withCoverArtistContribs({
        from: input.updateValue({
          validate: isContributionList,
        }),
      }),

      exposeDependency({dependency: '#coverArtistContribs'}),
    ],

    referencedTracks: [
      inheritFromMainRelease({
        notFoundValue: input.value([]),
      }),

      referenceList({
        class: input.value(Track),
        find: soupyFind.input('track'),
      }),
    ],

    sampledTracks: [
      inheritFromMainRelease({
        notFoundValue: input.value([]),
      }),

      referenceList({
        class: input.value(Track),
        find: soupyFind.input('track'),
      }),
    ],

    trackArtworks: [
      exitWithoutUniqueCoverArt({
        value: input.value([]),
      }),

      constitutibleArtworkList.fromYAMLFieldSpec
        .call(this, 'Track Artwork'),
    ],

    artTags: [
      exitWithoutUniqueCoverArt({
        value: input.value([]),
      }),

      referenceList({
        class: input.value(ArtTag),
        find: soupyFind.input('artTag'),
      }),
    ],

    referencedArtworks: [
      exitWithoutUniqueCoverArt({
        value: input.value([]),
      }),

      referencedArtworkList(),
    ],

    // Update only

    find: soupyFind(),
    reverse: soupyReverse(),

    // used for referencedArtworkList (mixedFind)
    artworkData: wikiData({
      class: input.value(Artwork),
    }),

    // used for withAlwaysReferenceByDirectory (for some reason)
    trackData: wikiData({
      class: input.value(Track),
    }),

    // used for withMatchingContributionPresets (indirectly by Contribution)
    wikiInfo: thing({
      class: input.value(WikiInfo),
    }),

    // Expose only

    commentatorArtists: commentatorArtists(),

    date: [
      withDate(),
      exposeDependency({dependency: '#date'}),
    ],

    trackNumber: [
      withTrackNumber(),
      exposeDependency({dependency: '#trackNumber'}),
    ],

    hasUniqueCoverArt: [
      withHasUniqueCoverArt(),
      exposeDependency({dependency: '#hasUniqueCoverArt'}),
    ],

    isMainRelease: [
      withMainRelease(),

      exposeWhetherDependencyAvailable({
        dependency: '#mainRelease',
        negate: input.value(true),
      }),
    ],

    isSecondaryRelease: [
      withMainRelease(),

      exposeWhetherDependencyAvailable({
        dependency: '#mainRelease',
      }),
    ],

    // Only has any value for main releases, because secondary releases
    // are never secondary to *another* secondary release.
    secondaryReleases: reverseReferenceList({
      reverse: soupyReverse.input('tracksWhichAreSecondaryReleasesOf'),
    }),

    allReleases: [
      withAllReleases(),
      exposeDependency({dependency: '#allReleases'}),
    ],

    otherReleases: [
      withOtherReleases(),
      exposeDependency({dependency: '#otherReleases'}),
    ],

    referencedByTracks: reverseReferenceList({
      reverse: soupyReverse.input('tracksWhichReference'),
    }),

    sampledByTracks: reverseReferenceList({
      reverse: soupyReverse.input('tracksWhichSample'),
    }),

    featuredInFlashes: reverseReferenceList({
      reverse: soupyReverse.input('flashesWhichFeature'),
    }),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Track': {property: 'name'},
      'Directory': {property: 'directory'},
      'Suffix Directory': {property: 'suffixDirectoryFromAlbum'},

      'Additional Names': {
        property: 'additionalNames',
        transform: parseAdditionalNames,
      },

      'Bandcamp Track ID': {
        property: 'bandcampTrackIdentifier',
        transform: String,
      },

      'Bandcamp Artwork ID': {
        property: 'bandcampArtworkIdentifier',
        transform: String,
      },

      'Duration': {
        property: 'duration',
        transform: parseDuration,
      },

      'Color': {property: 'color'},
      'URLs': {property: 'urls'},

      'Date First Released': {
        property: 'dateFirstReleased',
        transform: parseDate,
      },

      'Cover Art Date': {
        property: 'coverArtDate',
        transform: parseDate,
      },

      'Cover Art File Extension': {property: 'coverArtFileExtension'},

      'Cover Art Dimensions': {
        property: 'coverArtDimensions',
        transform: parseDimensions,
      },

      'Has Cover Art': {
        property: 'disableUniqueCoverArt',
        transform: value =>
          (typeof value === 'boolean'
            ? !value
            : value),
      },

      'Always Reference By Directory': {property: 'alwaysReferenceByDirectory'},

      'Lyrics': {property: 'lyrics'},
      'Commentary': {property: 'commentary'},
      'Credit Sources': {property: 'creditSources'},

      'Additional Files': {
        property: 'additionalFiles',
        transform: parseAdditionalFiles,
      },

      'Sheet Music Files': {
        property: 'sheetMusicFiles',
        transform: parseAdditionalFiles,
      },

      'MIDI Project Files': {
        property: 'midiProjectFiles',
        transform: parseAdditionalFiles,
      },

      'Main Release': {property: 'mainReleaseTrack'},
      'Referenced Tracks': {property: 'referencedTracks'},
      'Sampled Tracks': {property: 'sampledTracks'},

      'Referenced Artworks': {
        property: 'referencedArtworks',
        transform: parseAnnotatedReferences,
      },

      'Franchises': {ignore: true},
      'Inherit Franchises': {ignore: true},

      'Artists': {
        property: 'artistContribs',
        transform: parseContributors,
      },

      'Contributors': {
        property: 'contributorContribs',
        transform: parseContributors,
      },

      'Cover Artists': {
        property: 'coverArtistContribs',
        transform: parseContributors,
      },

      'Track Artwork': {
        property: 'trackArtworks',
        transform:
          parseArtwork({
            dimensionsFromThingProperty: 'coverArtDimensions',
            fileExtensionFromThingProperty: 'coverArtFileExtension',
            dateFromThingProperty: 'coverArtDate',
            artTagsFromThingProperty: 'artTags',
            referencedArtworksFromThingProperty: 'referencedArtworks',
            artistContribsFromThingProperty: 'coverArtistContribs',
            artistContribsArtistProperty: 'trackCoverArtistContributions',
          }),
      },

      'Art Tags': {property: 'artTags'},

      'Review Points': {ignore: true},
    },

    invalidFieldCombinations: [
      {message: `Secondary releases inherit references from the main one`, fields: [
        'Main Release',
        'Referenced Tracks',
      ]},

      {message: `Secondary releases inherit samples from the main one`, fields: [
        'Main Release',
        'Sampled Tracks',
      ]},

      {message: `Secondary releases inherit artists from the main one`, fields: [
        'Main Release',
        'Artists',
      ]},

      {message: `Secondary releases inherit contributors from the main one`, fields: [
        'Main Release',
        'Contributors',
      ]},

      {message: `Secondary releases inherit lyrics from the main one`, fields: [
        'Main Release',
        'Lyrics',
      ]},

      {
        message: ({'Has Cover Art': hasCoverArt}) =>
          (hasCoverArt
            ? `"Has Cover Art: true" is inferred from cover artist credits`
            : `Tracks without cover art must not have cover artist credits`),

        fields: [
          'Has Cover Art',
          'Cover Artists',
        ],
      },
    ],
  };

  static [Thing.findSpecs] = {
    track: {
      referenceTypes: ['track'],

      bindTo: 'trackData',

      getMatchableNames: track =>
        (track.alwaysReferenceByDirectory
          ? []
          : [track.name]),
    },

    trackMainReleasesOnly: {
      referenceTypes: ['track'],
      bindTo: 'trackData',

      include: track =>
        !CacheableObject.getUpdateValue(track, 'mainReleaseTrack'),

      // It's still necessary to check alwaysReferenceByDirectory here, since
      // it may be set manually (with `Always Reference By Directory: true`),
      // and these shouldn't be matched by name (as per usual).
      // See the definition for that property for more information.
      getMatchableNames: track =>
        (track.alwaysReferenceByDirectory
          ? []
          : [track.name]),
    },

    trackWithArtwork: {
      referenceTypes: [
        'track',
        'track-referencing-artworks',
        'track-referenced-artworks',
      ],

      bindTo: 'trackData',

      include: track =>
        track.hasUniqueCoverArt,

      getMatchableNames: track =>
        (track.alwaysReferenceByDirectory
          ? []
          : [track.name]),
    },

    trackPrimaryArtwork: {
      [Thing.findThisThingOnly]: false,

      referenceTypes: [
        'track',
        'track-referencing-artworks',
        'track-referenced-artworks',
      ],

      bindTo: 'artworkData',

      include: (artwork, {Artwork, Track}) =>
        artwork instanceof Artwork &&
        artwork.thing instanceof Track &&
        artwork === artwork.thing.trackArtworks[0],

      getMatchableNames: ({thing: track}) =>
        (track.alwaysReferenceByDirectory
          ? []
          : [track.name]),

      getMatchableDirectories: ({thing: track}) =>
        [track.directory],
    },
  };

  static [Thing.reverseSpecs] = {
    tracksWhichReference: {
      bindTo: 'trackData',

      referencing: track => track.isMainRelease ? [track] : [],
      referenced: track => track.referencedTracks,
    },

    tracksWhichSample: {
      bindTo: 'trackData',

      referencing: track => track.isMainRelease ? [track] : [],
      referenced: track => track.sampledTracks,
    },

    tracksWhoseArtworksFeature: {
      bindTo: 'trackData',

      referencing: track => [track],
      referenced: track => track.artTags,
    },

    trackArtistContributionsBy:
      soupyReverse.contributionsBy('trackData', 'artistContribs'),

    trackContributorContributionsBy:
      soupyReverse.contributionsBy('trackData', 'contributorContribs'),

    trackCoverArtistContributionsBy:
      soupyReverse.artworkContributionsBy('trackData', 'trackArtworks'),

    tracksWithCommentaryBy: {
      bindTo: 'trackData',

      referencing: track => [track],
      referenced: track => track.commentatorArtists,
    },

    tracksWhichAreSecondaryReleasesOf: {
      bindTo: 'trackData',

      referencing: track => track.isSecondaryRelease ? [track] : [],
      referenced: track => [track.mainReleaseTrack],
    },
  };

  // Track YAML loading is handled in album.js.
  static [Thing.getYamlLoadingSpec] = null;

  getOwnArtworkPath(artwork) {
    if (!this.album) return null;

    return [
      'media.trackCover',
      this.album.directory,

      (artwork.unqualifiedDirectory
        ? this.directory + '-' + artwork.unqualifiedDirectory
        : this.directory),

      artwork.fileExtension,
    ];
  }

  [inspect.custom](depth) {
    const parts = [];

    parts.push(Thing.prototype[inspect.custom].apply(this));

    if (CacheableObject.getUpdateValue(this, 'mainReleaseTrack')) {
      parts.unshift(`${colors.yellow('[secrelease]')} `);
    }

    let album;

    if (depth >= 0) {
      album = this.album;
    }

    if (album) {
      const albumName = album.name;
      const albumIndex = album.tracks.indexOf(this);
      const trackNum =
        (albumIndex === -1
          ? 'indeterminate position'
          : `#${albumIndex + 1}`);
      parts.push(` (${colors.yellow(trackNum)} in ${colors.green(albumName)})`);
    }

    return parts.join('');
  }
}
