import {inspect} from 'node:util';

import CacheableObject from '#cacheable-object';
import {colors} from '#cli';
import {input} from '#composite';
import find from '#find';
import Thing from '#thing';
import {isColor, isContributionList, isDate, isFileExtension}
  from '#validators';

import {
  parseAdditionalFiles,
  parseAdditionalNames,
  parseContributors,
  parseDate,
  parseDuration,
} from '#yaml';

import {withPropertyFromObject} from '#composite/data';
import {withResolvedContribs} from '#composite/wiki-data';

import {
  exitWithoutDependency,
  exposeConstant,
  exposeDependency,
  exposeDependencyOrContinue,
  exposeUpdateValueOrContinue,
} from '#composite/control-flow';

import {
  additionalFiles,
  additionalNameList,
  commentary,
  commentatorArtists,
  contentString,
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
} from '#composite/wiki-properties';

import {
  exitWithoutUniqueCoverArt,
  inferredAdditionalNameList,
  inheritFromOriginalRelease,
  sharedAdditionalNameList,
  trackReverseReferenceList,
  withAlbum,
  withAlwaysReferenceByDirectory,
  withContainingTrackSection,
  withHasUniqueCoverArt,
  withOtherReleases,
  withPropertyFromAlbum,
} from '#composite/things/track';

export class Track extends Thing {
  static [Thing.referenceType] = 'track';

  static [Thing.getPropertyDescriptors] = ({Album, ArtTag, Artist, Flash}) => ({
    // Update & expose

    name: name('Unnamed Track'),
    directory: directory(),

    additionalNames: additionalNameList(),
    sharedAdditionalNames: sharedAdditionalNameList(),
    inferredAdditionalNames: inferredAdditionalNameList(),

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

    lyrics: [
      inheritFromOriginalRelease({
        property: input.value('lyrics'),
      }),

      contentString(),
    ],

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
        notFoundValue: input.value([]),
      }),

      withResolvedContribs({
        from: input.updateValue({validate: isContributionList}),
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

      exposeDependency({dependency: '#album.artistContribs'}),
    ],

    contributorContribs: [
      inheritFromOriginalRelease({
        property: input.value('contributorContribs'),
        notFoundValue: input.value([]),
      }),

      contributionList(),
    ],

    // Cover artists aren't inherited from the original release, since it
    // typically varies by release and isn't defined by the musical qualities
    // of the track.
    coverArtistContribs: [
      exitWithoutUniqueCoverArt({
        value: input.value([]),
      }),

      withResolvedContribs({
        from: input.updateValue({validate: isContributionList}),
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

      exposeDependency({dependency: '#album.trackCoverArtistContribs'}),
    ],

    referencedTracks: [
      inheritFromOriginalRelease({
        property: input.value('referencedTracks'),
        notFoundValue: input.value([]),
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
        notFoundValue: input.value([]),
      }),

      referenceList({
        class: input.value(Track),
        find: input.value(find.track),
        data: 'trackData',
      }),
    ],

    artTags: [
      exitWithoutUniqueCoverArt({
        value: input.value([]),
      }),

      referenceList({
        class: input.value(ArtTag),
        find: input.value(find.artTag),
        data: 'artTagData',
      }),
    ],

    // Update only

    albumData: wikiData({
      class: input.value(Album),
    }),

    artistData: wikiData({
      class: input.value(Artist),
    }),

    artTagData: wikiData({
      class: input.value(ArtTag),
    }),

    flashData: wikiData({
      class: input.value(Flash),
    }),

    trackData: wikiData({
      class: input.value(Track),
    }),

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

    hasUniqueCoverArt: [
      withHasUniqueCoverArt(),
      exposeDependency({dependency: '#hasUniqueCoverArt'}),
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
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Track': {property: 'name'},
      'Directory': {property: 'directory'},

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
