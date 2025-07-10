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
  parseCommentary,
  parseContributors,
  parseCreditingSources,
  parseReferencingSources,
  parseDate,
  parseDimensions,
  parseDuration,
  parseLyrics,
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
  commentatorArtists,
  constitutibleArtworkList,
  contributionList,
  dimensions,
  directory,
  duration,
  flag,
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
  thingList,
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
    AdditionalFile,
    AdditionalName,
    Album,
    ArtTag,
    Artwork,
    CommentaryEntry,
    CreditingSourcesEntry,
    LyricsEntry,
    ReferencingSourcesEntry,
    WikiInfo,
  }) => ({
    // > Update & expose - Internal relationships

    album: thing({
      class: input.value(Album),
    }),

    // > Update & expose - Identifying metadata

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

    alwaysReferenceByDirectory: [
      withAlwaysReferenceByDirectory(),
      exposeDependency({dependency: '#alwaysReferenceByDirectory'}),
    ],

    mainReleaseTrack: singleReference({
      class: input.value(Track),
      find: soupyFind.input('track'),
    }),

    bandcampTrackIdentifier: simpleString(),
    bandcampArtworkIdentifier: simpleString(),

    additionalNames: thingList({
      class: input.value(AdditionalName),
    }),

    dateFirstReleased: simpleDate(),

    // > Update & expose - Credits and contributors

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

    // > Update & expose - General configuration

    countInArtistTotals: [
      exposeUpdateValueOrContinue({
        validate: input.value(isBoolean),
      }),

      withPropertyFromAlbum({
        property: input.value('countTracksInArtistTotals'),
      }),

      exposeDependency({dependency: '#album.countTracksInArtistTotals'}),
    ],

    disableUniqueCoverArt: flag(),

    // > Update & expose - General metadata

    duration: duration(),

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

    urls: urls(),

    // > Update & expose - Artworks

    trackArtworks: [
      exitWithoutUniqueCoverArt({
        value: input.value([]),
      }),

      constitutibleArtworkList.fromYAMLFieldSpec
        .call(this, 'Track Artwork'),
    ],

    coverArtistContribs: [
      withCoverArtistContribs({
        from: input.updateValue({
          validate: isContributionList,
        }),
      }),

      exposeDependency({dependency: '#coverArtistContribs'}),
    ],

    coverArtDate: [
      withTrackArtDate({
        from: input.updateValue({
          validate: isDate,
        }),
      }),

      exposeDependency({dependency: '#trackArtDate'}),
    ],

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

    coverArtDimensions: [
      exitWithoutUniqueCoverArt(),

      exposeUpdateValueOrContinue(),

      withPropertyFromAlbum({
        property: input.value('trackDimensions'),
      }),

      exposeDependencyOrContinue({dependency: '#album.trackDimensions'}),

      dimensions(),
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

    // > Update & expose - Referenced tracks

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

    // > Update & expose - Additional files

    additionalFiles: thingList({
      class: input.value(AdditionalFile),
    }),

    sheetMusicFiles: thingList({
      class: input.value(AdditionalFile),
    }),

    midiProjectFiles: thingList({
      class: input.value(AdditionalFile),
    }),

    // > Update & expose - Content entries

    lyrics: [
      // TODO: Inherited lyrics are literally the same objects, so of course
      // their .thing properties aren't going to point back to this one, and
      // certainly couldn't be recontextualized...
      inheritFromMainRelease(),

      thingList({
        class: input.value(LyricsEntry),
      }),
    ],

    commentary: thingList({
      class: input.value(CommentaryEntry),
    }),

    creditingSources: thingList({
      class: input.value(CreditingSourcesEntry),
    }),

    referencingSources: thingList({
      class: input.value(ReferencingSourcesEntry),
    }),

    // > Update only

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

    // > Expose only

    isTrack: [
      exposeConstant({
        value: input.value(true),
      }),
    ],

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

    groups: [
      withPropertyFromAlbum({
        property: input.value('groups'),
      }),

      exposeDependency({
        dependency: '#album.groups',
      }),
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
      // Identifying metadata

      'Track': {property: 'name'},
      'Directory': {property: 'directory'},
      'Suffix Directory': {property: 'suffixDirectoryFromAlbum'},
      'Always Reference By Directory': {property: 'alwaysReferenceByDirectory'},
      'Main Release': {property: 'mainReleaseTrack'},

      'Bandcamp Track ID': {
        property: 'bandcampTrackIdentifier',
        transform: String,
      },

      'Bandcamp Artwork ID': {
        property: 'bandcampArtworkIdentifier',
        transform: String,
      },

      'Additional Names': {
        property: 'additionalNames',
        transform: parseAdditionalNames,
      },

      'Date First Released': {
        property: 'dateFirstReleased',
        transform: parseDate,
      },

      // Credits and contributors

      'Artists': {
        property: 'artistContribs',
        transform: parseContributors,
      },

      'Contributors': {
        property: 'contributorContribs',
        transform: parseContributors,
      },

      // General configuration

      'Count In Artist Totals': {property: 'countInArtistTotals'},

      'Has Cover Art': {
        property: 'disableUniqueCoverArt',
        transform: value =>
          (typeof value === 'boolean'
            ? !value
            : value),
      },

      // General metadata

      'Duration': {
        property: 'duration',
        transform: parseDuration,
      },

      'Color': {property: 'color'},

      'URLs': {property: 'urls'},

      // Artworks

      'Track Artwork': {
        property: 'trackArtworks',
        transform:
          parseArtwork({
            thingProperty: 'trackArtworks',
            dimensionsFromThingProperty: 'coverArtDimensions',
            fileExtensionFromThingProperty: 'coverArtFileExtension',
            dateFromThingProperty: 'coverArtDate',
            artTagsFromThingProperty: 'artTags',
            referencedArtworksFromThingProperty: 'referencedArtworks',
            artistContribsFromThingProperty: 'coverArtistContribs',
            artistContribsArtistProperty: 'trackCoverArtistContributions',
          }),
      },

      'Cover Artists': {
        property: 'coverArtistContribs',
        transform: parseContributors,
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

      'Art Tags': {property: 'artTags'},

      'Referenced Artworks': {
        property: 'referencedArtworks',
        transform: parseAnnotatedReferences,
      },

      // Referenced tracks

      'Referenced Tracks': {property: 'referencedTracks'},
      'Sampled Tracks': {property: 'sampledTracks'},

      // Additional files

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

      // Content entries

      'Lyrics': {
        property: 'lyrics',
        transform: parseLyrics,
      },

      'Commentary': {
        property: 'commentary',
        transform: parseCommentary,
      },

      'Crediting Sources': {
        property: 'creditingSources',
        transform: parseCreditingSources,
      },

      'Referencing Sources': {
        property: 'referencingSources',
        transform: parseReferencingSources,
      },

      // Shenanigans

      'Franchises': {ignore: true},
      'Inherit Franchises': {ignore: true},
      'Review Points': {ignore: true},
    },

    invalidFieldCombinations: [
      {message: `Secondary releases never count in artist totals`, fields: [
        'Main Release',
        'Count In Artist Totals',
      ]},

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

  getOwnAdditionalFilePath(_file, filename) {
    if (!this.album) return null;

    return [
      'media.albumAdditionalFile',
      this.album.directory,
      filename,
    ];
  }

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

  countOwnContributionInContributionTotals(_contrib) {
    if (!this.countInArtistTotals) {
      return false;
    }

    if (this.isSecondaryRelease) {
      return false;
    }

    return true;
  }

  countOwnContributionInDurationTotals(_contrib) {
    if (!this.countInArtistTotals) {
      return false;
    }

    if (this.isSecondaryRelease) {
      return false;
    }

    return true;
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
