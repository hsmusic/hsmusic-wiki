export const DATA_ALBUM_DIRECTORY = 'album';

import * as path from 'node:path';
import {inspect} from 'node:util';

import CacheableObject from '#cacheable-object';
import {colors} from '#cli';
import {input} from '#composite';
import find from '#find';
import {traverse} from '#node-utils';
import {sortAlbumsTracksChronologically, sortChronologically} from '#sort';
import {accumulateSum, empty} from '#sugar';
import Thing from '#thing';
import {isColor, isDate, validateReference, validateWikiData}
  from '#validators';
import {parseAdditionalFiles, parseContributors, parseDate, parseDimensions}
  from '#yaml';

import {withPropertyFromObject} from '#composite/data';

import {
  exitWithoutDependency,
  exposeDependency,
  exposeDependencyOrContinue,
  exposeUpdateValueOrContinue,
} from '#composite/control-flow';

import {
  exitWithoutContribs,
  withDirectory,
  withResolvedReference,
  withCoverArtDate,
} from '#composite/wiki-data';

import {
  additionalFiles,
  commentary,
  color,
  commentatorArtists,
  contentString,
  contribsPresent,
  contributionList,
  dimensions,
  directory,
  fileExtension,
  flag,
  name,
  referenceList,
  simpleDate,
  simpleString,
  singleReference,
  thing,
  thingList,
  urls,
  wikiData,
} from '#composite/wiki-properties';

import {withTracks} from '#composite/things/album';
import {withAlbum} from '#composite/things/track-section';

export class Album extends Thing {
  static [Thing.referenceType] = 'album';

  static [Thing.getPropertyDescriptors] = ({
    ArtTag,
    Artist,
    Group,
    LengthClassification,
    Track,
    TrackSection,
    WikiInfo,
  }) => ({
    // Update & expose

    name: name('Unnamed Album'),
    color: color(),
    directory: directory(),
    urls: urls(),

    alwaysReferenceTracksByDirectory: flag(false),

    bandcampAlbumIdentifier: simpleString(),
    bandcampArtworkIdentifier: simpleString(),

    date: simpleDate(),
    trackArtDate: simpleDate(),
    dateAddedToWiki: simpleDate(),

    coverArtDate: [
      // TODO: Why does this fall back, but Track.coverArtDate doesn't?
      withCoverArtDate({
        from: input.updateValue({
          validate: isDate,
        }),

        fallback: input.value(true),
      }),

      exposeDependency({dependency: '#coverArtDate'}),
    ],

    coverArtFileExtension: [
      exitWithoutContribs({contribs: 'coverArtistContribs'}),
      fileExtension('jpg'),
    ],

    trackCoverArtFileExtension: fileExtension('jpg'),

    wallpaperFileExtension: [
      exitWithoutContribs({contribs: 'wallpaperArtistContribs'}),
      fileExtension('jpg'),
    ],

    bannerFileExtension: [
      exitWithoutContribs({contribs: 'bannerArtistContribs'}),
      fileExtension('jpg'),
    ],

    wallpaperStyle: [
      exitWithoutContribs({contribs: 'wallpaperArtistContribs'}),
      simpleString(),
    ],

    bannerStyle: [
      exitWithoutContribs({contribs: 'bannerArtistContribs'}),
      simpleString(),
    ],

    coverArtDimensions: [
      exitWithoutContribs({contribs: 'coverArtistContribs'}),
      dimensions(),
    ],

    bannerDimensions: [
      exitWithoutContribs({contribs: 'bannerArtistContribs'}),
      dimensions(),
    ],

    hasTrackNumbers: flag(true),
    isListedOnHomepage: flag(true),
    isListedInGalleries: flag(true),

    commentary: commentary(),
    creditSources: commentary(),
    additionalFiles: additionalFiles(),

    trackSections: thingList({
      class: input.value(TrackSection),
    }),

    artistContribs: contributionList({
      date: 'date',
      artistProperty: input.value('albumArtistContributions'),
    }),

    coverArtistContribs: [
      withCoverArtDate({
        fallback: input.value(true),
      }),

      contributionList({
        date: '#coverArtDate',
        artistProperty: input.value('albumCoverArtistContributions'),
      }),
    ],

    trackCoverArtistContribs: contributionList({
      // May be null, indicating cover art was added for tracks on the date
      // each track specifies, or else the track's own release date.
      date: 'trackArtDate',

      // This is the "correct" value, but it gets overwritten - with the same
      // value - regardless.
      artistProperty: input.value('trackCoverArtistContributions'),
    }),

    wallpaperArtistContribs: [
      withCoverArtDate({
        fallback: input.value(true),
      }),

      contributionList({
        date: '#coverArtDate',
        artistProperty: input.value('albumWallpaperArtistContributions'),
      }),
    ],

    bannerArtistContribs: [
      withCoverArtDate({
        fallback: input.value(true),
      }),

      contributionList({
        date: '#coverArtDate',
        artistProperty: input.value('albumBannerArtistContributions'),
      }),
    ],

    groups: referenceList({
      class: input.value(Group),
      find: input.value(find.group),
      data: 'groupData',
    }),

    artTags: [
      exitWithoutContribs({
        contribs: 'coverArtistContribs',
        value: input.value([]),
      }),

      referenceList({
        class: input.value(ArtTag),
        find: input.value(find.artTag),
        data: 'artTagData',
      }),
    ],

    lengthClassification: [
      exitWithoutDependency({
        dependency: 'lengthClassificationData',
      }),

      withResolvedReference({
        ref: input.updateValue({
          validate: validateReference('length-classification'),
        }),

        data: 'lengthClassificationData',
        find: input.value(find.lengthClassification),
      }),

      exposeDependencyOrContinue({
        dependency: '#resolvedReference',
      }),

      {
        dependencies: ['lengthClassificationData', input.myself()],
        compute: ({
          ['lengthClassificationData']: lengthClassificationData,
          [input.myself()]: myself,
        }) =>
          lengthClassificationData
            .find(lengthClassification =>
              lengthClassification.locallyIncludes(myself)),
      },
    ],

    // Update only

    artistData: wikiData({
      class: input.value(Artist),
    }),

    artTagData: wikiData({
      class: input.value(ArtTag),
    }),

    groupData: wikiData({
      class: input.value(Group),
    }),

    lengthClassificationData: wikiData({
      class: input.value(LengthClassification),
    }),

    wikiInfo: thing({
      class: input.value(WikiInfo),
    }),

    // Expose only

    commentatorArtists: commentatorArtists(),

    hasCoverArt: contribsPresent({contribs: 'coverArtistContribs'}),
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
      referenceTypes: ['album', 'album-commentary', 'album-gallery'],
      bindTo: 'albumData',
    },
  };

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Album': {property: 'name'},
      'Directory': {property: 'directory'},

      'Always Reference Tracks By Directory': {
        property: 'alwaysReferenceTracksByDirectory',
      },

      'Bandcamp Album ID': {
        property: 'bandcampAlbumIdentifier',
        transform: String,
      },

      'Bandcamp Artwork ID': {
        property: 'bandcampArtworkIdentifier',
        transform: String,
      },

      'Date': {
        property: 'date',
        transform: parseDate,
      },

      'Color': {property: 'color'},
      'URLs': {property: 'urls'},

      'Has Track Numbers': {property: 'hasTrackNumbers'},
      'Listed on Homepage': {property: 'isListedOnHomepage'},
      'Listed in Galleries': {property: 'isListedInGalleries'},

      'Length Classification': {property: 'lengthClassification'},

      'Cover Art Date': {
        property: 'coverArtDate',
        transform: parseDate,
      },

      'Default Track Cover Art Date': {
        property: 'trackArtDate',
        transform: parseDate,
      },

      'Date Added': {
        property: 'dateAddedToWiki',
        transform: parseDate,
      },

      'Cover Art File Extension': {property: 'coverArtFileExtension'},
      'Track Art File Extension': {property: 'trackCoverArtFileExtension'},

      'Cover Art Dimensions': {
        property: 'coverArtDimensions',
        transform: parseDimensions,
      },

      'Wallpaper Artists': {
        property: 'wallpaperArtistContribs',
        transform: parseContributors,
      },

      'Wallpaper Style': {property: 'wallpaperStyle'},
      'Wallpaper File Extension': {property: 'wallpaperFileExtension'},

      'Banner Artists': {
        property: 'bannerArtistContribs',
        transform: parseContributors,
      },

      'Banner Style': {property: 'bannerStyle'},
      'Banner File Extension': {property: 'bannerFileExtension'},

      'Banner Dimensions': {
        property: 'bannerDimensions',
        transform: parseDimensions,
      },

      'Commentary': {property: 'commentary'},
      'Credit Sources': {property: 'creditSources'},

      'Additional Files': {
        property: 'additionalFiles',
        transform: parseAdditionalFiles,
      },

      'Franchises': {ignore: true},

      'Artists': {
        property: 'artistContribs',
        transform: parseContributors,
      },

      'Cover Artists': {
        property: 'coverArtistContribs',
        transform: parseContributors,
      },

      'Default Track Cover Artists': {
        property: 'trackCoverArtistContribs',
        transform: parseContributors,
      },

      'Groups': {property: 'groups'},
      'Art Tags': {property: 'artTags'},

      'Review Points': {ignore: true},
    },
  };

  static [Thing.getYamlLoadingSpec] = ({
    documentModes: {headerAndEntries},
    thingConstructors: {Album, Track, TrackSectionHelper},
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

      for (const {header: album, entries} of results) {
        const trackSections = [];

        let currentTrackSection = new TrackSection();
        let currentTrackSectionTracks = [];

        Object.assign(currentTrackSection, {
          name: `Default Track Section`,
          isDefaultTrackSection: true,
        });

        const albumRef = Thing.getReference(album);

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

          entry.dataSourceAlbum = albumRef;
        }

        closeCurrentTrackSection();

        albumData.push(album);

        album.trackSections = trackSections;
      }

      return {albumData, trackSectionData, trackData};
    },

    sort({albumData, trackData}) {
      sortChronologically(albumData);
      sortAlbumsTracksChronologically(trackData);
    },
  });
}

export class TrackSection extends Thing {
  static [Thing.friendlyName] = `Track Section`;
  static [Thing.referenceType] = `track-section`;

  static [Thing.getPropertyDescriptors] = ({Album, Track}) => ({
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

    albumData: wikiData({
      class: input.value(Album),
    }),

    // Expose only

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

    startIndex: [
      withAlbum(),

      withPropertyFromObject({
        object: '#album',
        property: input.value('trackSections'),
      }),

      {
        dependencies: ['#album.trackSections', input.myself()],
        compute: (continuation, {
          ['#album.trackSections']: trackSections,
          [input.myself()]: myself,
        }) => continuation({
          ['#index']:
            trackSections.indexOf(myself),
        }),
      },

      exitWithoutDependency({
        dependency: '#index',
        mode: input.value('index'),
        value: input.value(0),
      }),

      {
        dependencies: ['#album.trackSections', '#index'],
        compute: ({
          ['#album.trackSections']: trackSections,
          ['#index']: index,
        }) =>
          accumulateSum(
            trackSections
              .slice(0, index)
              .map(section => section.tracks.length)),
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
      'Color': {property: 'color'},

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

    if (depth >= 0) {
      let album = null;
      try {
        album = this.album;
      } catch {}

      let first = null;
      try {
        first = this.startIndex;
      } catch {}

      let length = null;
      try {
        length = this.tracks.length;
      } catch {}

      if (album) {
        const albumName = album.name;
        const albumIndex = album.trackSections.indexOf(this);

        const num =
          (albumIndex === -1
            ? 'indeterminate position'
            : `#${albumIndex + 1}`);

        const range =
          (albumIndex >= 0 && first !== null && length !== null
            ? `: ${first + 1}-${first + length + 1}`
            : '');

        parts.push(` (${colors.yellow(num + range)} in ${colors.green(albumName)})`);
      }
    }

    return parts.join('');
  }
}
