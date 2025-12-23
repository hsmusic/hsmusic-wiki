export const DATA_ALBUM_DIRECTORY = 'album';

import * as path from 'node:path';
import {inspect} from 'node:util';

import {colors} from '#cli';
import {input, V} from '#composite';
import {traverse} from '#node-utils';
import {sortAlbumsTracksChronologically, sortChronologically} from '#sort';
import {empty} from '#sugar';
import Thing from '#thing';

import {
  is,
  isBoolean,
  isColor,
  isContributionList,
  isDate,
  isDirectory,
  isNumber,
} from '#validators';

import {
  parseAdditionalFiles,
  parseAdditionalNames,
  parseAnnotatedReferences,
  parseArtwork,
  parseCommentary,
  parseContributors,
  parseCreditingSources,
  parseDate,
  parseDimensions,
  parseWallpaperParts,
} from '#yaml';

import {withRecontextualizedContributionList, withResolvedContribs}
  from '#composite/wiki-data';

import {
  exitWithoutDependency,
  exposeConstant,
  exposeDependency,
  exposeDependencyOrContinue,
  exposeUpdateValueOrContinue,
} from '#composite/control-flow';

import {
  withFlattenedList,
  withLengthOfList,
  withNearbyItemFromList,
  withPropertyFromList,
  withPropertyFromObject,
} from '#composite/data';

import {
  color,
  commentatorArtists,
  constitutibleArtwork,
  constitutibleArtworkList,
  contentString,
  contributionList,
  dimensions,
  directory,
  fileExtension,
  flag,
  hasArtwork,
  name,
  referencedArtworkList,
  referenceList,
  simpleDate,
  simpleString,
  soupyFind,
  soupyReverse,
  thing,
  thingList,
  urls,
  wallpaperParts,
  wikiData,
} from '#composite/wiki-properties';

export class Album extends Thing {
  static [Thing.referenceType] = 'album';
  static [Thing.wikiData] = 'albumData';

  static [Thing.constitutibleProperties] = [
    'coverArtworks',
    'wallpaperArtwork',
    'bannerArtwork',
  ];

  static [Thing.getPropertyDescriptors] = ({
    AdditionalFile,
    AdditionalName,
    ArtTag,
    Artwork,
    CommentaryEntry,
    CreditingSourcesEntry,
    Group,
    TrackSection,
    WikiInfo,
  }) => ({
    // > Update & expose - Internal relationships

    trackSections: thingList(V(TrackSection)),

    // > Update & expose - Identifying metadata

    name: name(V('Unnamed Album')),
    directory: directory(),

    directorySuffix: [
      exposeUpdateValueOrContinue({
        validate: input.value(isDirectory),
      }),

      exposeDependency('directory'),
    ],

    alwaysReferenceByDirectory: flag(V(false)),
    alwaysReferenceTracksByDirectory: flag(V(false)),
    suffixTrackDirectories: flag(V(false)),

    style: [
      exposeUpdateValueOrContinue({
        validate: input.value(is(...[
          'album',
          'single',
        ])),
      }),

      exposeConstant(V('album')),
    ],

    bandcampAlbumIdentifier: simpleString(),
    bandcampArtworkIdentifier: simpleString(),

    additionalNames: thingList(V(AdditionalName)),

    date: simpleDate(),
    dateAddedToWiki: simpleDate(),

    // > Update & expose - Credits and contributors

    artistContribs: contributionList({
      artistProperty: input.value('albumArtistContributions'),
    }),

    trackArtistText: contentString(),

    trackArtistContribs: [
      withResolvedContribs({
        from: input.updateValue({validate: isContributionList}),
        thingProperty: input.thisProperty(),
        artistProperty: input.value('albumTrackArtistContributions'),
      }).outputs({
        '#resolvedContribs': '#trackArtistContribs',
      }),

      exposeDependencyOrContinue('#trackArtistContribs', V('empty')),

      withRecontextualizedContributionList('artistContribs', {
        artistProperty: input.value('albumTrackArtistContributions'),
      }),

      exposeDependency('#artistContribs'),
    ],

    // > Update & expose - General configuration

    countTracksInArtistTotals: flag(V(true)),

    showAlbumInTracksWithoutArtists: flag(V(false)),

    hasTrackNumbers: flag(V(true)),
    isListedOnHomepage: flag(V(true)),
    isListedInGalleries: flag(V(true)),

    hideDuration: flag(V(false)),

    // > Update & expose - General metadata

    color: color(),

    urls: urls(),

    // > Update & expose - Artworks

    coverArtworks: [
      exitWithoutDependency('hasCoverArt', {
        value: input.value([]),
        mode: input.value('falsy'),
      }),

      constitutibleArtworkList.fromYAMLFieldSpec
        .call(this, 'Cover Artwork'),
    ],

    coverArtistContribs: contributionList({
      date: 'coverArtDate',
      artistProperty: input.value('albumCoverArtistContributions'),
    }),

    coverArtDate: [
      exitWithoutDependency('hasCoverArt', {
        value: input.value(null),
        mode: input.value('falsy'),
      }),

      exposeUpdateValueOrContinue({
        validate: input.value(isDate),
      }),

      exposeDependency('date'),
    ],

    coverArtFileExtension: [
      exitWithoutDependency('hasCoverArt', {
        value: input.value(null),
        mode: input.value('falsy'),
      }),

      fileExtension(V('jpg')),
    ],

    coverArtDimensions: [
      exitWithoutDependency('hasCoverArt', {
        value: input.value(null),
        mode: input.value('falsy'),
      }),

      dimensions(),
    ],

    artTags: [
      exitWithoutDependency('hasCoverArt', {
        value: input.value([]),
        mode: input.value('falsy'),
      }),

      referenceList({
        class: input.value(ArtTag),
        find: soupyFind.input('artTag'),
      }),
    ],

    referencedArtworks: [
      exitWithoutDependency('hasCoverArt', {
        value: input.value([]),
        mode: input.value('falsy'),
      }),

      referencedArtworkList(),
    ],

    trackCoverArtistContribs: contributionList({
      // May be null, indicating cover art was added for tracks on the date
      // each track specifies, or else the track's own release date.
      date: 'trackArtDate',

      // This is the "correct" value, but it gets overwritten - with the same
      // value - regardless.
      artistProperty: input.value('trackCoverArtistContributions'),
    }),

    trackArtDate: simpleDate(),

    trackCoverArtFileExtension: fileExtension(V('jpg')),

    trackDimensions: dimensions(),

    wallpaperBrightness: {
      flags: {update: true, expose: true},
      update: {validate: isNumber},
    },

    wallpaperArtwork: [
      exitWithoutDependency('hasWallpaperArt', {
        value: input.value(null),
        mode: input.value('falsy'),
      }),

      constitutibleArtwork.fromYAMLFieldSpec
        .call(this, 'Wallpaper Artwork'),
    ],

    wallpaperArtistContribs: contributionList({
      date: 'coverArtDate',
      artistProperty: input.value('albumWallpaperArtistContributions'),
    }),

    wallpaperFileExtension: [
      exitWithoutDependency('hasWallpaperArt', {
        value: input.value(null),
        mode: input.value('falsy'),
      }),

      fileExtension(V('jpg')),
    ],

    wallpaperStyle: [
      exitWithoutDependency('hasWallpaperArt', {
        value: input.value(null),
        mode: input.value('falsy'),
      }),

      simpleString(),
    ],

    wallpaperParts: [
      exitWithoutDependency('hasWallpaperArt', {
        value: input.value([]),
        mode: input.value('falsy'),
      }),

      wallpaperParts(),
    ],

    bannerArtwork: [
      exitWithoutDependency('hasBannerArt', {
        value: input.value(null),
        mode: input.value('falsy'),
      }),

      constitutibleArtwork.fromYAMLFieldSpec
        .call(this, 'Banner Artwork'),
    ],

    bannerArtistContribs: contributionList({
      date: 'coverArtDate',
      artistProperty: input.value('albumBannerArtistContributions'),
    }),

    bannerFileExtension: [
      exitWithoutDependency('hasBannerArt', {
        value: input.value(null),
        mode: input.value('falsy'),
      }),

      fileExtension(V('jpg')),
    ],

    bannerDimensions: [
      exitWithoutDependency('hasBannerArt', {
        value: input.value(null),
        mode: input.value('falsy'),
      }),

      dimensions(),
    ],

    bannerStyle: [
      exitWithoutDependency('hasBannerArt', {
        value: input.value(null),
        mode: input.value('falsy'),
      }),

      simpleString(),
    ],

    // > Update & expose - Groups

    groups: referenceList({
      class: input.value(Group),
      find: soupyFind.input('group'),
    }),

    // > Update & expose - Content entries

    commentary: thingList(V(CommentaryEntry)),
    creditingSources: thingList(V(CreditingSourcesEntry)),

    // > Update & expose - Additional files

    additionalFiles: thingList(V(AdditionalFile)),

    // > Update only

    find: soupyFind(),
    reverse: soupyReverse(),

    // used for referencedArtworkList (mixedFind)
    artworkData: wikiData(V(Artwork)),

    // used for withMatchingContributionPresets (indirectly by Contribution)
    wikiInfo: thing(V(WikiInfo)),

    // > Expose only

    isAlbum: exposeConstant(V(true)),

    commentatorArtists: commentatorArtists(),

    hasCoverArt: hasArtwork({
      contribs: '_coverArtistContribs',
      artworks: '_coverArtworks',
    }),

    hasWallpaperArt: hasArtwork({
      contribs: '_wallpaperArtistContribs',
      artwork: '_wallpaperArtwork',
    }),

    hasBannerArt: hasArtwork({
      contribs: '_bannerArtistContribs',
      artwork: '_bannerArtwork',
    }),

    tracks: [
      exitWithoutDependency('trackSections', V([])),

      withPropertyFromList('trackSections', V('tracks')),
      withFlattenedList('#trackSections.tracks'),
      exposeDependency('#flattenedList'),
    ],
  });

  static [Thing.getSerializeDescriptors] = ({
    serialize: S,
  }) => ({
    name: S.id,
    color: S.id,
    directory: S.id,
    urls: S.id,

    date: S.id,
    coverArtDate: S.id,
    trackArtDate: S.id,
    dateAddedToWiki: S.id,

    artistContribs: S.toContribRefs,
    coverArtistContribs: S.toContribRefs,
    trackCoverArtistContribs: S.toContribRefs,
    wallpaperArtistContribs: S.toContribRefs,
    bannerArtistContribs: S.toContribRefs,

    coverArtFileExtension: S.id,
    trackCoverArtFileExtension: S.id,
    wallpaperStyle: S.id,
    wallpaperFileExtension: S.id,
    bannerStyle: S.id,
    bannerFileExtension: S.id,
    bannerDimensions: S.id,

    hasTrackArt: S.id,
    isListedOnHomepage: S.id,

    commentary: S.toCommentaryRefs,

    additionalFiles: S.id,

    tracks: S.toRefs,
    groups: S.toRefs,
    artTags: S.toRefs,
    commentatorArtists: S.toRefs,
  });

  static [Thing.findSpecs] = {
    album: {
      referenceTypes: [
        'album',
        'album-commentary',
        'album-gallery',
      ],

      bindTo: 'albumData',

      getMatchableNames: album =>
        (album.alwaysReferenceByDirectory
          ? []
          : [album.name]),
    },

    albumSinglesOnly: {
      referencing: ['album'],

      bindTo: 'albumData',

      incldue: album =>
        album.style === 'single',

      getMatchableNames: album =>
        (album.alwaysReferenceByDirectory
          ? []
          : [album.name]),
    },

    albumWithArtwork: {
      referenceTypes: [
        'album',
        'album-referencing-artworks',
        'album-referenced-artworks',
      ],

      bindTo: 'albumData',

      include: album =>
        album.hasCoverArt,

      getMatchableNames: album =>
        (album.alwaysReferenceByDirectory
          ? []
          : [album.name]),
    },

    albumPrimaryArtwork: {
      [Thing.findThisThingOnly]: false,

      referenceTypes: [
        'album',
        'album-referencing-artworks',
        'album-referenced-artworks',
      ],

      bindTo: 'artworkData',

      include: (artwork, {Artwork, Album}) =>
        artwork instanceof Artwork &&
        artwork.thing instanceof Album &&
        artwork === artwork.thing.coverArtworks[0],

      getMatchableNames: ({thing: album}) =>
        (album.alwaysReferenceByDirectory
          ? []
          : [album.name]),

      getMatchableDirectories: ({thing: album}) =>
        [album.directory],
    },
  };

  static [Thing.reverseSpecs] = {
    albumsWhoseArtworksFeature: {
      bindTo: 'albumData',

      referencing: album => [album],
      referenced: album => album.artTags,
    },

    albumsWhoseGroupsInclude: {
      bindTo: 'albumData',

      referencing: album => [album],
      referenced: album => album.groups,
    },

    albumArtistContributionsBy:
      soupyReverse.contributionsBy('albumData', 'artistContribs'),

    albumTrackArtistContributionsBy:
      soupyReverse.contributionsBy('albumData', 'trackArtistContribs'),

    albumCoverArtistContributionsBy:
      soupyReverse.artworkContributionsBy('albumData', 'coverArtworks'),

    albumWallpaperArtistContributionsBy:
      soupyReverse.artworkContributionsBy('albumData', 'wallpaperArtwork', {single: true}),

    albumBannerArtistContributionsBy:
      soupyReverse.artworkContributionsBy('albumData', 'bannerArtwork', {single: true}),

    albumsWithCommentaryBy: {
      bindTo: 'albumData',

      referencing: album => [album],
      referenced: album => album.commentatorArtists,
    },
  };

  static [Thing.yamlDocumentSpec] = {
    fields: {
      // Identifying metadata

      'Album': {property: 'name'},
      'Directory': {property: 'directory'},
      'Directory Suffix': {property: 'directorySuffix'},
      'Suffix Track Directories': {property: 'suffixTrackDirectories'},
      'Always Reference By Directory': {property: 'alwaysReferenceByDirectory'},
      'Always Reference Tracks By Directory': {property: 'alwaysReferenceTracksByDirectory'},
      'Style': {property: 'style'},

      'Bandcamp Album ID': {
        property: 'bandcampAlbumIdentifier',
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

      'Date': {
        property: 'date',
        transform: parseDate,
      },

      'Date Added': {
        property: 'dateAddedToWiki',
        transform: parseDate,
      },

      // Credits and contributors

      'Artists': {
        property: 'artistContribs',
        transform: parseContributors,
      },

      'Track Artist Text': {
        property: 'trackArtistText',
      },

      'Track Artists': {
        property: 'trackArtistContribs',
        transform: parseContributors,
      },

      // General configuration

      'Count Tracks In Artist Totals': {property: 'countTracksInArtistTotals'},

      'Show Album In Tracks Without Artists': {
        property: 'showAlbumInTracksWithoutArtists',
      },

      'Has Track Numbers': {property: 'hasTrackNumbers'},
      'Listed on Homepage': {property: 'isListedOnHomepage'},
      'Listed in Galleries': {property: 'isListedInGalleries'},

      'Hide Duration': {property: 'hideDuration'},

      // General metadata

      'Color': {property: 'color'},

      'URLs': {property: 'urls'},

      // Artworks
      //  (Note - this YAML section is deliberately ordered differently
      //   than the corresponding property descriptors.)

      'Cover Artwork': {
        property: 'coverArtworks',
        transform:
          parseArtwork({
            thingProperty: 'coverArtworks',
            dimensionsFromThingProperty: 'coverArtDimensions',
            fileExtensionFromThingProperty: 'coverArtFileExtension',
            dateFromThingProperty: 'coverArtDate',
            artistContribsFromThingProperty: 'coverArtistContribs',
            artistContribsArtistProperty: 'albumCoverArtistContributions',
            artTagsFromThingProperty: 'artTags',
            referencedArtworksFromThingProperty: 'referencedArtworks',
          }),
      },

      'Banner Artwork': {
        property: 'bannerArtwork',
        transform:
          parseArtwork({
            single: true,
            thingProperty: 'bannerArtwork',
            dimensionsFromThingProperty: 'bannerDimensions',
            fileExtensionFromThingProperty: 'bannerFileExtension',
            dateFromThingProperty: 'date',
            artistContribsFromThingProperty: 'bannerArtistContribs',
            artistContribsArtistProperty: 'albumBannerArtistContributions',
          }),
      },

      'Wallpaper Brightness': {property: 'wallpaperBrightness'},

      'Wallpaper Artwork': {
        property: 'wallpaperArtwork',
        transform:
          parseArtwork({
            single: true,
            thingProperty: 'wallpaperArtwork',
            dimensionsFromThingProperty: null,
            fileExtensionFromThingProperty: 'wallpaperFileExtension',
            dateFromThingProperty: 'date',
            artistContribsFromThingProperty: 'wallpaperArtistContribs',
            artistContribsArtistProperty: 'albumWallpaperArtistContributions',
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

      'Cover Art Dimensions': {
        property: 'coverArtDimensions',
        transform: parseDimensions,
      },

      'Default Track Cover Artists': {
        property: 'trackCoverArtistContribs',
        transform: parseContributors,
      },

      'Default Track Cover Art Date': {
        property: 'trackArtDate',
        transform: parseDate,
      },

      'Default Track Dimensions': {
        property: 'trackDimensions',
        transform: parseDimensions,
      },

      'Wallpaper Artists': {
        property: 'wallpaperArtistContribs',
        transform: parseContributors,
      },

      'Wallpaper Style': {property: 'wallpaperStyle'},

      'Wallpaper Parts': {
        property: 'wallpaperParts',
        transform: parseWallpaperParts,
      },

      'Banner Artists': {
        property: 'bannerArtistContribs',
        transform: parseContributors,
      },

      'Banner Dimensions': {
        property: 'bannerDimensions',
        transform: parseDimensions,
      },

      'Banner Style': {property: 'bannerStyle'},

      'Cover Art File Extension': {property: 'coverArtFileExtension'},
      'Track Art File Extension': {property: 'trackCoverArtFileExtension'},
      'Wallpaper File Extension': {property: 'wallpaperFileExtension'},
      'Banner File Extension': {property: 'bannerFileExtension'},

      'Art Tags': {property: 'artTags'},

      'Referenced Artworks': {
        property: 'referencedArtworks',
        transform: parseAnnotatedReferences,
      },

      // Groups

      'Groups': {property: 'groups'},

      // Content entries

      'Commentary': {
        property: 'commentary',
        transform: parseCommentary,
      },

      'Crediting Sources': {
        property: 'creditingSources',
        transform: parseCreditingSources,
      },

      // Additional files

      'Additional Files': {
        property: 'additionalFiles',
        transform: parseAdditionalFiles,
      },

      // Shenanigans

      'Franchises': {ignore: true},
      'Review Points': {ignore: true},
    },

    invalidFieldCombinations: [
      {message: `Move commentary on singles to the track`, fields: [
        ['Style', 'single'],
        'Commentary',
      ]},

      {message: `Move crediting sources on singles to the track`, fields: [
        ['Style', 'single'],
        'Crediting Sources',
      ]},

      {message: `Move additional names on singles to the track`, fields: [
        ['Style', 'single'],
        'Additional Names',
      ]},

      {message: `Specify one wallpaper style or multiple wallpaper parts, not both`, fields: [
        'Wallpaper Parts',
        'Wallpaper Style',
      ]},

      {message: `Wallpaper file extensions are specified on asset, per part`, fields: [
        'Wallpaper Parts',
        'Wallpaper File Extension',
      ]},
    ],
  };

  static [Thing.getYamlLoadingSpec] = ({
    documentModes: {headerAndEntries},
    thingConstructors: {Album, Track},
  }) => ({
    title: `Process album files`,

    files: dataPath =>
      traverse(path.join(dataPath, DATA_ALBUM_DIRECTORY), {
        filterFile: name => path.extname(name) === '.yaml',
        prefixPath: DATA_ALBUM_DIRECTORY,
      }),

    documentMode: headerAndEntries,
    headerDocumentThing: Album,
    entryDocumentThing: document =>
      ('Section' in document
        ? TrackSection
        : Track),

    connect({header: album, entries}) {
      const trackSections = [];

      let currentTrackSection = new TrackSection();
      let currentTrackSectionTracks = [];

      Object.assign(currentTrackSection, {
        name: `Default Track Section`,
        isDefaultTrackSection: true,
      });

      const closeCurrentTrackSection = () => {
        if (
          currentTrackSection.isDefaultTrackSection &&
          empty(currentTrackSectionTracks)
        ) {
          return;
        }

        currentTrackSection.tracks = currentTrackSectionTracks;
        currentTrackSection.album = album;

        trackSections.push(currentTrackSection);
      };

      for (const entry of entries) {
        if (entry instanceof TrackSection) {
          closeCurrentTrackSection();
          currentTrackSection = entry;
          currentTrackSectionTracks = [];
          continue;
        }

        entry.album = album;
        entry.trackSection = currentTrackSection;

        currentTrackSectionTracks.push(entry);
      }

      closeCurrentTrackSection();

      album.trackSections = trackSections;
    },

    sort({albumData, trackData}) {
      sortChronologically(albumData);
      sortAlbumsTracksChronologically(trackData);
    },
  });

  getOwnAdditionalFilePath(_file, filename) {
    return [
      'media.albumAdditionalFile',
      this.directory,
      filename,
    ];
  }

  getOwnArtworkPath(artwork) {
    if (artwork === this.bannerArtwork) {
      return [
        'media.albumBanner',
        this.directory,
        artwork.fileExtension,
      ];
    }

    if (artwork === this.wallpaperArtwork) {
      if (!empty(this.wallpaperParts)) {
        return null;
      }

      return [
        'media.albumWallpaper',
        this.directory,
        artwork.fileExtension,
      ];
    }

    // TODO: using trackCover here is obviously, badly wrong
    // but we ought to refactor banners and wallpapers similarly
    // (i.e. depend on those intrinsic artwork paths rather than
    // accessing media.{albumBanner,albumWallpaper} from content
    // or other code directly)
    return [
      'media.trackCover',
      this.directory,

      (artwork.unqualifiedDirectory
        ? 'cover-' + artwork.unqualifiedDirectory
        : 'cover'),

      artwork.fileExtension,
    ];
  }

  // As of writing, albums don't even have a `duration` property...
  // so this function will never be called... but the message stands...
  countOwnContributionInDurationTotals(_contrib) {
    return false;
  }
}

export class TrackSection extends Thing {
  static [Thing.friendlyName] = `Track Section`;
  static [Thing.referenceType] = `track-section`;
  static [Thing.wikiData] = 'trackSectionData';

  static [Thing.getPropertyDescriptors] = ({Track}) => ({
    // Update & expose

    album: thing(V(Album)),

    name: name(V('Unnamed Track Section')),

    unqualifiedDirectory: directory(),

    directorySuffix: [
      exposeUpdateValueOrContinue({
        validate: input.value(isDirectory),
      }),

      withPropertyFromObject({
        object: 'album',
        property: input.value('directorySuffix'),
      }),

      exposeDependency({dependency: '#album.directorySuffix'}),
    ],

    suffixTrackDirectories: [
      exposeUpdateValueOrContinue({
        validate: input.value(isBoolean),
      }),

      withPropertyFromObject({
        object: 'album',
        property: input.value('suffixTrackDirectories'),
      }),

      exposeDependency({dependency: '#album.suffixTrackDirectories'}),
    ],

    color: [
      exposeUpdateValueOrContinue({
        validate: input.value(isColor),
      }),

      withPropertyFromObject({
        object: 'album',
        property: input.value('color'),
      }),

      exposeDependency({dependency: '#album.color'}),
    ],

    hasTrackNumbers: [
      exposeUpdateValueOrContinue({
        validate: input.value(isBoolean),
      }),

      withPropertyFromObject('album', V('hasTrackNumbers')),
      exposeDependency('#album.hasTrackNumbers'),
    ],

    startCountingFrom: [
      exposeUpdateValueOrContinue({
        validate: input.value(isNumber),
      }),

      withPropertyFromObject('album', V('hasTrackNumbers')),
      exitWithoutDependency('#album.hasTrackNumbers', V(1), V('falsy')),

      withPropertyFromObject('album', V('trackSections')),

      withNearbyItemFromList({
        list: '#album.trackSections',
        item: input.myself(),
        offset: input.value(-1),
      }).outputs({
        '#nearbyItem': '#previousTrackSection',
      }),

      exitWithoutDependency('#previousTrackSection', V(1)),

      withPropertyFromObject('#previousTrackSection', V('continueCountingFrom')),
      exposeDependency('#previousTrackSection.continueCountingFrom'),
    ],

    dateOriginallyReleased: simpleDate(),

    countTracksInArtistTotals: [
      exposeUpdateValueOrContinue({
        validate: input.value(isBoolean),
      }),

      withPropertyFromObject({
        object: 'album',
        property: input.value('countTracksInArtistTotals'),
      }),

      exposeDependency({dependency: '#album.countTracksInArtistTotals'}),
    ],

    isDefaultTrackSection: flag(V(false)),

    description: contentString(),

    tracks: thingList(V(Track)),

    // Update only

    reverse: soupyReverse(),

    // Expose only

    isTrackSection: [
      exposeConstant({
        value: input.value(true),
      }),
    ],

    directory: [
      exitWithoutDependency({
        dependency: 'album',
      }),

      withPropertyFromObject({
        object: 'album',
        property: input.value('directory'),
      }),

      {
        dependencies: ['#album.directory', 'unqualifiedDirectory'],
        compute: ({
          ['#album.directory']: albumDirectory,
          ['unqualifiedDirectory']: unqualifiedDirectory,
        }) =>
          albumDirectory + '/' + unqualifiedDirectory,
      },
    ],

    continueCountingFrom: [
      withPropertyFromObject('album', V('hasTrackNumbers')),
      exitWithoutDependency('#album.hasTrackNumbers', V(null), V('falsy')),

      {
        dependencies: ['hasTrackNumbers', 'startCountingFrom'],
        compute: (continuation, {hasTrackNumbers, startCountingFrom}) =>
          (hasTrackNumbers
            ? continuation()
            : continuation.exit(startCountingFrom)),
      },

      withLengthOfList('tracks'),

      {
        dependencies: ['startCountingFrom', '#tracks.length'],
        compute: ({startCountingFrom, '#tracks.length': tracks}) =>
          startCountingFrom + tracks,
      },
    ],
  });

  static [Thing.findSpecs] = {
    trackSection: {
      referenceTypes: ['track-section'],
      bindTo: 'trackSectionData',
    },

    unqualifiedTrackSection: {
      referenceTypes: ['unqualified-track-section'],

      getMatchableDirectories: trackSection =>
        [trackSection.unqualifiedDirectory],
    },
  };

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Section': {property: 'name'},
      'Directory Suffix': {property: 'directorySuffix'},
      'Suffix Track Directories': {property: 'suffixTrackDirectories'},

      'Color': {property: 'color'},
      'Has Track Numbers': {property: 'hasTrackNumbers'},
      'Start Counting From': {property: 'startCountingFrom'},

      'Date Originally Released': {
        property: 'dateOriginallyReleased',
        transform: parseDate,
      },

      'Count Tracks In Artist Totals': {property: 'countTracksInArtistTotals'},

      'Description': {property: 'description'},
    },
  };

  [inspect.custom](depth) {
    const parts = [];

    parts.push(Thing.prototype[inspect.custom].apply(this));

    if (depth >= 0) showAlbum: {
      let album = null;
      try {
        album = this.album;
      } catch {
        break showAlbum;
      }

      let first = null;
      try {
        first = this.tracks.at(0).trackNumber;
      } catch {}

      let last = null;
      try {
        last = this.tracks.at(-1).trackNumber;
      } catch {}

      const albumName = album.name;
      const albumIndex = album.trackSections.indexOf(this);

      const num =
        (albumIndex === -1
          ? 'indeterminate position'
          : `#${albumIndex + 1}`);

      const range =
        (albumIndex >= 0 && first !== null && last !== null
          ? `: ${first}-${last}`
          : '');

      parts.push(` (${colors.yellow(num + range)} in ${colors.green(`"${albumName}"`)})`);
    }

    return parts.join('');
  }
}
