export const DATA_ALBUM_DIRECTORY = 'album';

import * as path from 'node:path';
import {inspect} from 'node:util';

import CacheableObject from '#cacheable-object';
import {colors} from '#cli';
import {input} from '#composite';
import {traverse} from '#node-utils';
import {sortAlbumsTracksChronologically, sortChronologically} from '#sort';
import {empty} from '#sugar';
import Thing from '#thing';
import {is, isColor, isDate, isDirectory, isNumber} from '#validators';

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

import {withPropertyFromObject} from '#composite/data';
import {exitWithoutArtwork, withDirectory, withHasArtwork}
  from '#composite/wiki-data';

import {
  exitWithoutDependency,
  exposeConstant,
  exposeDependency,
  exposeUpdateValueOrContinue,
} from '#composite/control-flow';

import {
  color,
  commentatorArtists,
  constitutibleArtwork,
  constitutibleArtworkList,
  contentString,
  contribsPresent,
  contributionList,
  dimensions,
  directory,
  fileExtension,
  flag,
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

import {withCoverArtDate, withTracks} from '#composite/things/album';
import {withAlbum, withContinueCountingFrom, withStartCountingFrom}
  from '#composite/things/track-section';

export class Album extends Thing {
  static [Thing.referenceType] = 'album';

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

    trackSections: thingList({
      class: input.value(TrackSection),
    }),

    // > Update & expose - Identifying metadata

    name: name('Unnamed Album'),
    directory: directory(),

    directorySuffix: [
      exposeUpdateValueOrContinue({
        validate: input.value(isDirectory),
      }),

      withDirectory(),

      exposeDependency({
        dependency: '#directory',
      }),
    ],

    alwaysReferenceByDirectory: flag(false),
    alwaysReferenceTracksByDirectory: flag(false),
    suffixTrackDirectories: flag(false),

    style: [
      exposeUpdateValueOrContinue({
        validate: input.value(is(...[
          'album',
          'single',
        ])),
      }),

      exposeConstant({
        value: input.value('album'),
      }),
    ],

    bandcampAlbumIdentifier: simpleString(),
    bandcampArtworkIdentifier: simpleString(),

    additionalNames: thingList({
      class: input.value(AdditionalName),
    }),

    date: simpleDate(),
    dateAddedToWiki: simpleDate(),

    // > Update & expose - Credits and contributors

    artistContribs: contributionList({
      date: 'date',
      artistProperty: input.value('albumArtistContributions'),
    }),

    // > Update & expose - General configuration

    countTracksInArtistTotals: flag(true),

    hasTrackNumbers: flag(true),
    isListedOnHomepage: flag(true),
    isListedInGalleries: flag(true),

    // > Update & expose - General metadata

    color: color(),

    urls: urls(),

    // > Update & expose - Artworks

    coverArtworks: [
      // This works, lol, because this array describes `expose.transform` for
      // the coverArtworks property, and compositions generally access the
      // update value, not what's exposed by property access out in the open.
      // There's no recursion going on here.
      exitWithoutArtwork({
        contribs: 'coverArtistContribs',
        artworks: 'coverArtworks',
        value: input.value([]),
      }),

      constitutibleArtworkList.fromYAMLFieldSpec
        .call(this, 'Cover Artwork'),
    ],

    coverArtistContribs: [
      withCoverArtDate(),

      contributionList({
        date: '#coverArtDate',
        artistProperty: input.value('albumCoverArtistContributions'),
      }),
    ],

    coverArtDate: [
      withCoverArtDate({
        from: input.updateValue({
          validate: isDate,
        }),
      }),

      exposeDependency({dependency: '#coverArtDate'}),
    ],

    coverArtFileExtension: [
      exitWithoutArtwork({
        contribs: 'coverArtistContribs',
        artworks: 'coverArtworks',
      }),

      fileExtension('jpg'),
    ],

    coverArtDimensions: [
      exitWithoutArtwork({
        contribs: 'coverArtistContribs',
        artworks: 'coverArtworks',
      }),

      dimensions(),
    ],

    artTags: [
      exitWithoutArtwork({
        contribs: 'coverArtistContribs',
        artworks: 'coverArtworks',
        value: input.value([]),
      }),

      referenceList({
        class: input.value(ArtTag),
        find: soupyFind.input('artTag'),
      }),
    ],

    referencedArtworks: [
      exitWithoutArtwork({
        contribs: 'coverArtistContribs',
        artworks: 'coverArtworks',
        value: input.value([]),
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

    trackCoverArtFileExtension: fileExtension('jpg'),

    trackDimensions: dimensions(),

    wallpaperArtwork: [
      exitWithoutDependency({
        dependency: 'wallpaperArtistContribs',
        mode: input.value('empty'),
        value: input.value(null),
      }),

      constitutibleArtwork.fromYAMLFieldSpec
        .call(this, 'Wallpaper Artwork'),
    ],

    wallpaperArtistContribs: [
      withCoverArtDate(),

      contributionList({
        date: '#coverArtDate',
        artistProperty: input.value('albumWallpaperArtistContributions'),
      }),
    ],

    wallpaperFileExtension: [
      exitWithoutArtwork({
        contribs: 'wallpaperArtistContribs',
        artwork: 'wallpaperArtwork',
      }),

      fileExtension('jpg'),
    ],

    wallpaperStyle: [
      exitWithoutArtwork({
        contribs: 'wallpaperArtistContribs',
        artwork: 'wallpaperArtwork',
      }),

      simpleString(),
    ],

    wallpaperParts: [
      // kinda nonsensical or at least unlikely lol, but y'know
      exitWithoutArtwork({
        contribs: 'wallpaperArtistContribs',
        artwork: 'wallpaperArtwork',
        value: input.value([]),
      }),

      wallpaperParts(),
    ],

    bannerArtwork: [
      exitWithoutDependency({
        dependency: 'bannerArtistContribs',
        mode: input.value('empty'),
        value: input.value(null),
      }),

      constitutibleArtwork.fromYAMLFieldSpec
        .call(this, 'Banner Artwork'),
    ],

    bannerArtistContribs: [
      withCoverArtDate(),

      contributionList({
        date: '#coverArtDate',
        artistProperty: input.value('albumBannerArtistContributions'),
      }),
    ],

    bannerFileExtension: [
      exitWithoutArtwork({
        contribs: 'bannerArtistContribs',
        artwork: 'bannerArtwork',
      }),

      fileExtension('jpg'),
    ],

    bannerDimensions: [
      exitWithoutArtwork({
        contribs: 'bannerArtistContribs',
        artwork: 'bannerArtwork',
      }),

      dimensions(),
    ],

    bannerStyle: [
      exitWithoutArtwork({
        contribs: 'bannerArtistContribs',
        artwork: 'bannerArtwork',
      }),

      simpleString(),
    ],

    // > Update & expose - Groups

    groups: referenceList({
      class: input.value(Group),
      find: soupyFind.input('group'),
    }),

    // > Update & expose - Content entries

    commentary: thingList({
      class: input.value(CommentaryEntry),
    }),

    creditingSources: thingList({
      class: input.value(CreditingSourcesEntry),
    }),

    // > Update & expose - Additional files

    additionalFiles: thingList({
      class: input.value(AdditionalFile),
    }),

    // > Update only

    find: soupyFind(),
    reverse: soupyReverse(),

    // used for referencedArtworkList (mixedFind)
    artworkData: wikiData({
      class: input.value(Artwork),
    }),

    // used for withMatchingContributionPresets (indirectly by Contribution)
    wikiInfo: thing({
      class: input.value(WikiInfo),
    }),

    // > Expose only

    isAlbum: [
      exposeConstant({
        value: input.value(true),
      }),
    ],

    commentatorArtists: commentatorArtists(),

    hasCoverArt: [
      withHasArtwork({
        contribs: 'coverArtistContribs',
        artworks: 'coverArtworks',
      }),

      exposeDependency({dependency: '#hasArtwork'}),
    ],

    hasWallpaperArt: contribsPresent({contribs: 'wallpaperArtistContribs'}),
    hasBannerArt: contribsPresent({contribs: 'bannerArtistContribs'}),

    tracks: [
      withTracks(),
      exposeDependency({dependency: '#tracks'}),
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
    albumsWhoseTracksInclude: {
      bindTo: 'albumData',

      referencing: album => [album],
      referenced: album => album.tracks,
    },

    albumsWhoseTrackSectionsInclude: {
      bindTo: 'albumData',

      referencing: album => [album],
      referenced: album => album.trackSections,
    },

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

      // General configuration

      'Count Tracks In Artist Totals': {property: 'countTracksInArtistTotals'},

      'Has Track Numbers': {property: 'hasTrackNumbers'},
      'Listed on Homepage': {property: 'isListedOnHomepage'},
      'Listed in Galleries': {property: 'isListedInGalleries'},

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

      {message: `Move referencing sources on singles to the track`, fields: [
        ['Style', 'single'],
        'Referencing Sources',
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

    save(results) {
      const albumData = [];
      const trackSectionData = [];
      const trackData = [];

      const artworkData = [];
      const commentaryData = [];
      const creditingSourceData = [];
      const referencingSourceData = [];
      const lyricsData = [];

      for (const {header: album, entries} of results) {
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

          currentTrackSection.tracks =
            currentTrackSectionTracks;

          trackSections.push(currentTrackSection);
          trackSectionData.push(currentTrackSection);
        };

        for (const entry of entries) {
          if (entry instanceof TrackSection) {
            closeCurrentTrackSection();
            currentTrackSection = entry;
            currentTrackSectionTracks = [];
            continue;
          }

          currentTrackSectionTracks.push(entry);
          trackData.push(entry);

          // Set the track's album before accessing its list of artworks.
          // The existence of its artwork objects may depend on access to
          // its album's 'Default Track Cover Artists'.
          entry.album = album;

          artworkData.push(...entry.trackArtworks);
          commentaryData.push(...entry.commentary);
          creditingSourceData.push(...entry.creditingSources);
          referencingSourceData.push(...entry.referencingSources);

          // TODO: As exposed, Track.lyrics tries to inherit from the main
          // release, which is impossible before the data's been linked.
          // We just use the update value here. But it's icky!
          lyricsData.push(...CacheableObject.getUpdateValue(entry, 'lyrics') ?? []);
        }

        closeCurrentTrackSection();

        albumData.push(album);

        artworkData.push(...album.coverArtworks);

        if (album.bannerArtwork) {
          artworkData.push(album.bannerArtwork);
        }

        if (album.wallpaperArtwork) {
          artworkData.push(album.wallpaperArtwork);
        }

        commentaryData.push(...album.commentary);
        creditingSourceData.push(...album.creditingSources);

        album.trackSections = trackSections;
      }

      return {
        albumData,
        trackSectionData,
        trackData,

        artworkData,
        commentaryData,
        creditingSourceData,
        referencingSourceData,
        lyricsData,
      };
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

  static [Thing.getPropertyDescriptors] = ({Track}) => ({
    // Update & expose

    name: name('Unnamed Track Section'),

    unqualifiedDirectory: directory(),

    color: [
      exposeUpdateValueOrContinue({
        validate: input.value(isColor),
      }),

      withAlbum(),

      withPropertyFromObject({
        object: '#album',
        property: input.value('color'),
      }),

      exposeDependency({dependency: '#album.color'}),
    ],

    startCountingFrom: [
      withStartCountingFrom({
        from: input.updateValue({validate: isNumber}),
      }),

      exposeDependency({dependency: '#startCountingFrom'}),
    ],

    dateOriginallyReleased: simpleDate(),

    isDefaultTrackSection: flag(false),

    description: contentString(),

    album: [
      withAlbum(),
      exposeDependency({dependency: '#album'}),
    ],

    tracks: thingList({
      class: input.value(Track),
    }),

    // Update only

    reverse: soupyReverse(),

    // Expose only

    isTrackSection: [
      exposeConstant({
        value: input.value(true),
      }),
    ],

    directory: [
      withAlbum(),

      exitWithoutDependency({
        dependency: '#album',
      }),

      withPropertyFromObject({
        object: '#album',
        property: input.value('directory'),
      }),

      withDirectory({
        directory: 'unqualifiedDirectory',
      }).outputs({
        '#directory': '#unqualifiedDirectory',
      }),

      {
        dependencies: ['#album.directory', '#unqualifiedDirectory'],
        compute: ({
          ['#album.directory']: albumDirectory,
          ['#unqualifiedDirectory']: unqualifiedDirectory,
        }) =>
          albumDirectory + '/' + unqualifiedDirectory,
      },
    ],

    continueCountingFrom: [
      withContinueCountingFrom(),

      exposeDependency({dependency: '#continueCountingFrom'}),
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

  static [Thing.reverseSpecs] = {
    trackSectionsWhichInclude: {
      bindTo: 'trackSectionData',

      referencing: trackSection => [trackSection],
      referenced: trackSection => trackSection.tracks,
    },
  };

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Section': {property: 'name'},
      'Color': {property: 'color'},
      'Start Counting From': {property: 'startCountingFrom'},

      'Date Originally Released': {
        property: 'dateOriginallyReleased',
        transform: parseDate,
      },

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
