import {inspect} from 'node:util';

import CacheableObject from '#cacheable-object';
import {colors} from '#cli';
import {input} from '#composite';
import find from '#find';
import Thing from '#thing';
import {isBoolean, isColor, isContributionList, isDate, isFileExtension}
  from '#validators';

import {
  parseAdditionalFiles,
  parseAdditionalNames,
  parseAnnotatedReferences,
  parseContributors,
  parseDate,
  parseDimensions,
  parseDuration,
} from '#yaml';

import {withPropertyFromObject} from '#composite/data';

import {
  exitWithoutDependency,
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
  contentString,
  contributionList,
  dimensions,
  directory,
  duration,
  flag,
  name,
  referenceList,
  referencedArtworkList,
  reverseReferenceList,
  reverseReferencedArtworkList,
  simpleDate,
  simpleString,
  singleReference,
  soupyFind,
  thing,
  urls,
  wikiData,
} from '#composite/wiki-properties';

import {
  exitWithoutUniqueCoverArt,
  inheritContributionListFromOriginalRelease,
  inheritFromOriginalRelease,
  trackReverseReferenceList,
  withAlbum,
  withAlwaysReferenceByDirectory,
  withContainingTrackSection,
  withDate,
  withDirectorySuffix,
  withHasUniqueCoverArt,
  withOriginalRelease,
  withOtherReleases,
  withPropertyFromAlbum,
  withSuffixDirectoryFromAlbum,
  withTrackArtDate,
} from '#composite/things/track';

export class Track extends Thing {
  static [Thing.referenceType] = 'track';

  static [Thing.getPropertyDescriptors] = ({
    Album,
    ArtTag,
    Artist,
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

      withPropertyFromAlbum({
        property: input.value('trackDimensions'),
      }),

      exposeDependencyOrContinue({dependency: '#album.trackDimensions'}),

      dimensions(),
    ],

    commentary: commentary(),
    creditSources: commentary(),

    lyrics: [
      inheritFromOriginalRelease(),
      contentString(),
    ],

    additionalFiles: additionalFiles(),
    sheetMusicFiles: additionalFiles(),
    midiProjectFiles: additionalFiles(),

    originalReleaseTrack: singleReference({
      class: input.value(Track),
      find: soupyFind.input('track'),
    }),

    // Internal use only - for directly identifying an album inside a track's
    // util.inspect display, if it isn't indirectly available (by way of being
    // included in an album's track list).
    dataSourceAlbum: singleReference({
      class: input.value(Album),
      find: soupyFind.input('album'),
    }),

    artistContribs: [
      inheritContributionListFromOriginalRelease(),

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
      inheritContributionListFromOriginalRelease(),

      withDate(),

      contributionList({
        date: '#date',
        artistProperty: input.value('trackContributorContributions'),
      }),
    ],

    // Cover artists aren't inherited from the original release, since it
    // typically varies by release and isn't defined by the musical qualities
    // of the track.
    coverArtistContribs: [
      exitWithoutUniqueCoverArt({
        value: input.value([]),
      }),

      withTrackArtDate({
        fallback: input.value(true),
      }),

      withResolvedContribs({
        from: input.updateValue({validate: isContributionList}),
        thingProperty: input.thisProperty(),
        artistProperty: input.value('trackCoverArtistContributions'),
        date: '#trackArtDate',
      }).outputs({
        '#resolvedContribs': '#coverArtistContribs',
      }),

      exposeDependencyOrContinue({
        dependency: '#coverArtistContribs',
        mode: input.value('empty'),
      }),

      withPropertyFromAlbum({
        property: input.value('trackCoverArtistContribs'),
      }),

      withRecontextualizedContributionList({
        list: '#album.trackCoverArtistContribs',
        artistProperty: input.value('trackCoverArtistContributions'),
      }),

      withRedatedContributionList({
        list: '#album.trackCoverArtistContribs',
        date: '#trackArtDate',
      }),

      exposeDependency({dependency: '#album.trackCoverArtistContribs'}),
    ],

    referencedTracks: [
      inheritFromOriginalRelease({
        notFoundValue: input.value([]),
      }),

      referenceList({
        class: input.value(Track),
        find: soupyFind.input('track'),
      }),
    ],

    sampledTracks: [
      inheritFromOriginalRelease({
        notFoundValue: input.value([]),
      }),

      referenceList({
        class: input.value(Track),
        find: soupyFind.input('track'),
      }),
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

      withTrackArtDate({
        fallback: input.value(true),
      }),

      referencedArtworkList({
        date: '#trackArtDate',
      }),
    ],

    // Update only

    find: soupyFind(),

    // used for referencedArtworkList (mixedFind)
    // used for withAlbum (reverse)
    albumData: wikiData({
      class: input.value(Album),
    }),

    // used for featuredInFlashes (reverse)
    flashData: wikiData({
      class: input.value(Flash),
    }),

    // used for referencedArtworkList (mixedFind)
    // used for trackReverseReferenceList (reverse)
    trackData: wikiData({
      class: input.value(Track),
    }),

    // used for withContainingTrackSection (reverse)
    trackSectionData: wikiData({
      class: input.value(TrackSection),
    }),

    // used for withMatchingContributionPresets (indirectly by Contribution)
    wikiInfo: thing({
      class: input.value(WikiInfo),
    }),

    // Expose only

    commentatorArtists: commentatorArtists(),

    album: [
      withAlbum(),
      exposeDependency({dependency: '#album'}),
    ],

    date: [
      withDate(),
      exposeDependency({dependency: '#date'}),
    ],

    hasUniqueCoverArt: [
      withHasUniqueCoverArt(),
      exposeDependency({dependency: '#hasUniqueCoverArt'}),
    ],

    isOriginalRelease: [
      withOriginalRelease(),

      exposeWhetherDependencyAvailable({
        dependency: '#originalRelease',
        negate: input.value(true),
      }),
    ],

    isRerelease: [
      withOriginalRelease(),

      exposeWhetherDependencyAvailable({
        dependency: '#originalRelease',
      }),
    ],

    otherReleases: [
      withOtherReleases(),
      exposeDependency({dependency: '#otherReleases'}),
    ],

    referencedByTracks: trackReverseReferenceList({
      list: input.value('referencedTracks'),
    }),

    sampledByTracks: trackReverseReferenceList({
      list: input.value('sampledTracks'),
    }),

    featuredInFlashes: reverseReferenceList({
      data: 'flashData',
      list: input.value('featuredTracks'),
    }),

    referencedByArtworks: [
      exitWithoutUniqueCoverArt({
        value: input.value([]),
      }),

      reverseReferencedArtworkList(),
    ],
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

      'Originally Released As': {property: 'originalReleaseTrack'},
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

      'Art Tags': {property: 'artTags'},

      'Review Points': {ignore: true},
    },

    invalidFieldCombinations: [
      {message: `Rereleases inherit references from the original`, fields: [
        'Originally Released As',
        'Referenced Tracks',
      ]},

      {message: `Rereleases inherit samples from the original`, fields: [
        'Originally Released As',
        'Sampled Tracks',
      ]},

      {message: `Rereleases inherit artists from the original`, fields: [
        'Originally Released As',
        'Artists',
      ]},

      {message: `Rereleases inherit contributors from the original`, fields: [
        'Originally Released As',
        'Contributors',
      ]},

      {message: `Rereleases inherit lyrics from the original`, fields: [
        'Originally Released As',
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

    trackOriginalReleasesOnly: {
      referenceTypes: ['track'],
      bindTo: 'trackData',

      include: track =>
        !CacheableObject.getUpdateValue(track, 'originalReleaseTrack'),

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
      referenceTypes: ['track'],
      bindTo: 'trackData',

      include: track =>
        track.hasUniqueCoverArt,

      getMatchableNames: track =>
        (track.alwaysReferenceByDirectory
          ? []
          : [track.name]),
    },
  };

  static [Thing.reverseSpecs] = {
    tracksWhichReference: {
      bindTo: 'trackData',

      referencing: track => [track],
      referenced: track => track.sampledTracks,
    },

    tracksWhichSample: {
      bindTo: 'trackData',

      referencing: track => [track],
      referenced: track => track.sampledTracks,
    },
  };

  // Track YAML loading is handled in album.js.
  static [Thing.getYamlLoadingSpec] = null;

  [inspect.custom](depth) {
    const parts = [];

    parts.push(Thing.prototype[inspect.custom].apply(this));

    if (CacheableObject.getUpdateValue(this, 'originalReleaseTrack')) {
      parts.unshift(`${colors.yellow('[rerelease]')} `);
    }

    let album;

    if (depth >= 0) {
      try {
        album = this.album;
      } catch (_error) {
        // Computing album might crash for any reason, which we don't want to
        // distract from another error we might be trying to work out at the
        // moment (for which debugging might involve inspecting this track!).
      }

      album ??= this.dataSourceAlbum;
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
