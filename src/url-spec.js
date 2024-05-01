import {withEntries} from '#sugar';

const genericPaths = {
  root: '',
  path: '<>/',
};

const urlSpec = {
  data: {
    prefix: 'data/',

    paths: {
      ...genericPaths,

      album: 'album/<>',
      artist: 'artist/<>',
      track: 'track/<>',
    },
  },

  localized: {
    // TODO: Implement this.
    // prefix: '_languageCode',

    paths: {
      ...genericPaths,
      page: '<>/',

      home: '',

      album: 'album/<>/',
      albumCommentary: 'commentary/album/<>/',
      albumGallery: 'album/<>/gallery/',

      artist: 'artist/<>/',
      artistGallery: 'artist/<>/gallery/',

      commentaryIndex: 'commentary/',

      flashIndex: 'flash/',

      flash: 'flash/<>/',

      flashActGallery: 'flash-act/<>/',

      groupInfo: 'group/<>/',
      groupGallery: 'group/<>/gallery/',

      listingIndex: 'list/',

      listing: 'list/<>/',

      newsIndex: 'news/',

      newsEntry: 'news/<>/',

      staticPage: '<>/',

      tag: 'tag/<>/',

      track: 'track/<>/',
    },
  },

  shared: {
    paths: {
      ...genericPaths,

      utilityRoot: 'util',
      staticRoot: 'static',

      utilityFile: 'util/<>',
      staticFile: 'static/<>?<>',

      staticIcon: 'static/icons.svg#icon-<>',
    },
  },

  media: {
    prefix: 'media/',

    paths: {
      ...genericPaths,

      albumAdditionalFile: 'album-additional/<>/<>',
      albumBanner: 'album-art/<>/banner.<>',
      albumCover: 'album-art/<>/cover.<>',
      albumWallpaper: 'album-art/<>/bg.<>',

      artistAvatar: 'artist-avatar/<>.<>',

      flashArt: 'flash-art/<>.<>',

      trackCover: 'album-art/<>/<>.<>',
    },
  },

  thumb: {
    prefix: 'thumb/',
    paths: genericPaths,
  },

  static: {
    prefix: 'static/',
    paths: genericPaths,
  },

  util: {
    prefix: 'util/',
    paths: genericPaths,
  },
};

// This gets automatically switched in place when working from a baseDirectory,
// so it should never be referenced manually.
urlSpec.localizedWithBaseDirectory = {
  paths: withEntries(urlSpec.localized.paths, (entries) =>
    entries.map(([key, path]) => [key, '<>/' + path])),
};

export default urlSpec;
