export const DATA_ALBUM_DIRECTORY = 'album';

import * as path from 'node:path';

import {input} from '#composite';
import find from '#find';
import {traverse} from '#node-utils';
import {sortAlbumsTracksChronologically, sortChronologically} from '#sort';
import {empty} from '#sugar';
import Thing from '#thing';
import {isDate} from '#validators';
import {parseAdditionalFiles, parseContributors, parseDate, parseDimensions}
  from '#yaml';

import {exposeDependency, exposeUpdateValueOrContinue}
  from '#composite/control-flow';
import {exitWithoutContribs} from '#composite/wiki-data';

import {
  additionalFiles,
  commentary,
  color,
  commentatorArtists,
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
  urls,
  wikiData,
} from '#composite/wiki-properties';

import {withTracks, withTrackSections} from '#composite/things/album';

export class Album extends Thing {
  static [Thing.referenceType] = 'album';

  static [Thing.getPropertyDescriptors] = ({ArtTag, Artist, Group, Track}) => ({
    // Update & expose

    name: name('Unnamed Album'),
    color: color(),
    directory: directory(),
    urls: urls(),

    bandcampAlbumIdentifier: simpleString(),
    bandcampArtworkIdentifier: simpleString(),

    date: simpleDate(),
    trackArtDate: simpleDate(),
    dateAddedToWiki: simpleDate(),

    coverArtDate: [
      exitWithoutContribs({contribs: 'coverArtistContribs'}),

      exposeUpdateValueOrContinue({
        validate: input.value(isDate),
      }),

      exposeDependency({dependency: 'date'}),
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

    bannerDimensions: [
      exitWithoutContribs({contribs: 'bannerArtistContribs'}),
      dimensions(),
    ],

    hasTrackNumbers: flag(true),
    isListedOnHomepage: flag(true),
    isListedInGalleries: flag(true),

    commentary: commentary(),
    additionalFiles: additionalFiles(),

    trackSections: [
      withTrackSections(),
      exposeDependency({dependency: '#trackSections'}),
    ],

    artistContribs: contributionList(),
    coverArtistContribs: contributionList(),
    trackCoverArtistContribs: contributionList(),
    wallpaperArtistContribs: contributionList(),
    bannerArtistContribs: contributionList(),

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

    // Only the tracks which belong to this album.
    // Necessary for computing the track list, so provide this statically
    // or keep it updated.
    ownTrackData: wikiData({
      class: input.value(Track),
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
        ? TrackSectionHelper
        : Track),

    save(results) {
      const albumData = [];
      const trackData = [];

      for (const {header: album, entries} of results) {
        // We can't mutate an array once it's set as a property value,
        // so prepare the track sections that will show up in a track list
        // all the way before actually applying them. (It's okay to mutate
        // an individual section before applying it, since those are just
        // generic objects; they aren't Things in and of themselves.)
        const trackSections = [];
        const ownTrackData = [];

        let currentTrackSection = {
          name: `Default Track Section`,
          isDefaultTrackSection: true,
          tracks: [],
        };

        const albumRef = Thing.getReference(album);

        const closeCurrentTrackSection = () => {
          if (!empty(currentTrackSection.tracks)) {
            trackSections.push(currentTrackSection);
          }
        };

        for (const entry of entries) {
          if (entry instanceof TrackSectionHelper) {
            closeCurrentTrackSection();

            currentTrackSection = {
              name: entry.name,
              color: entry.color,
              dateOriginallyReleased: entry.dateOriginallyReleased,
              isDefaultTrackSection: false,
              tracks: [],
            };

            continue;
          }

          trackData.push(entry);

          entry.dataSourceAlbum = albumRef;

          ownTrackData.push(entry);
          currentTrackSection.tracks.push(Thing.getReference(entry));
        }

        closeCurrentTrackSection();

        albumData.push(album);

        album.trackSections = trackSections;
        album.ownTrackData = ownTrackData;
      }

      return {albumData, trackData};
    },

    sort({albumData, trackData}) {
      sortChronologically(albumData);
      sortAlbumsTracksChronologically(trackData);
    },
  });
}

export class TrackSectionHelper extends Thing {
  static [Thing.friendlyName] = `Track Section`;

  static [Thing.getPropertyDescriptors] = () => ({
    name: name('Unnamed Track Section'),
    color: color(),
    dateOriginallyReleased: simpleDate(),
    isDefaultTrackGroup: flag(false),
  })

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Section': {property: 'name'},
      'Color': {property: 'color'},

      'Date Originally Released': {
        property: 'dateOriginallyReleased',
        transform: parseDate,
      },
    },
  };
}
