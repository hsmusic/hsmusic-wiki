import {input} from '#composite';
import find from '#find';
import {isDate} from '#validators';

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

import {
  parseAdditionalFiles,
  parseContributors,
  parseDimensions,
} from '#yaml';

import Thing from './thing.js';

export class Album extends Thing {
  static [Thing.referenceType] = 'album';

  static [Thing.getPropertyDescriptors] = ({ArtTag, Artist, Group, Track}) => ({
    // Update & expose

    name: name('Unnamed Album'),
    color: color(),
    directory: directory(),
    urls: urls(),

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

  static [Thing.yamlDocumentSpec] = {
    fieldTransformations: {
      'Artists': parseContributors,
      'Cover Artists': parseContributors,
      'Default Track Cover Artists': parseContributors,
      'Wallpaper Artists': parseContributors,
      'Banner Artists': parseContributors,

      'Date': (value) => new Date(value),
      'Date Added': (value) => new Date(value),
      'Cover Art Date': (value) => new Date(value),
      'Default Track Cover Art Date': (value) => new Date(value),

      'Banner Dimensions': parseDimensions,

      'Additional Files': parseAdditionalFiles,
    },

    propertyFieldMapping: {
      name: 'Album',
      directory: 'Directory',
      date: 'Date',
      color: 'Color',
      urls: 'URLs',

      hasTrackNumbers: 'Has Track Numbers',
      isListedOnHomepage: 'Listed on Homepage',
      isListedInGalleries: 'Listed in Galleries',

      coverArtDate: 'Cover Art Date',
      trackArtDate: 'Default Track Cover Art Date',
      dateAddedToWiki: 'Date Added',

      coverArtFileExtension: 'Cover Art File Extension',
      trackCoverArtFileExtension: 'Track Art File Extension',

      wallpaperArtistContribs: 'Wallpaper Artists',
      wallpaperStyle: 'Wallpaper Style',
      wallpaperFileExtension: 'Wallpaper File Extension',

      bannerArtistContribs: 'Banner Artists',
      bannerStyle: 'Banner Style',
      bannerFileExtension: 'Banner File Extension',
      bannerDimensions: 'Banner Dimensions',

      commentary: 'Commentary',
      additionalFiles: 'Additional Files',

      artistContribs: 'Artists',
      coverArtistContribs: 'Cover Artists',
      trackCoverArtistContribs: 'Default Track Cover Artists',
      groups: 'Groups',
      artTags: 'Art Tags',
    },

    ignoredFields: ['Review Points'],
  };
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
    fieldTransformations: {
      'Date Originally Released': (value) => new Date(value),
    },

    propertyFieldMapping: {
      name: 'Section',
      color: 'Color',
      dateOriginallyReleased: 'Date Originally Released',
    },
  };
}
