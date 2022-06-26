// @format

import { withEntries } from "./util/sugar.js";

const urlSpec = {
  data: {
    prefix: "data/",

    paths: {
      root: "",
      path: "<>",

      album: "album/<>",
      artist: "artist/<>",
      track: "track/<>",
    },
  },

  localized: {
    // TODO: Implement this.
    // prefix: '_languageCode',

    paths: {
      root: "",
      path: "<>",

      home: "",

      album: "album/<>/",
      albumCommentary: "commentary/album/<>/",

      artist: "artist/<>/",
      artistGallery: "artist/<>/gallery/",

      commentaryIndex: "commentary/",

      flashIndex: "flash/",
      flash: "flash/<>/",

      groupInfo: "group/<>/",
      groupGallery: "group/<>/gallery/",

      listingIndex: "list/",
      listing: "list/<>/",

      newsIndex: "news/",
      newsEntry: "news/<>/",

      staticPage: "<>/",
      tag: "tag/<>/",
      track: "track/<>/",
    },
  },

  shared: {
    paths: {
      root: "",
      path: "<>",

      utilityRoot: "util",
      staticRoot: "static",

      utilityFile: "util/<>",
      staticFile: "static/<>",
    },
  },

  media: {
    prefix: "media/",

    paths: {
      root: "",
      path: "<>",

      albumCover: "album-art/<>/cover.<>",
      albumWallpaper: "album-art/<>/bg.<>",
      albumBanner: "album-art/<>/banner.<>",
      trackCover: "album-art/<>/<>.<>",
      artistAvatar: "artist-avatar/<>.<>",
      flashArt: "flash-art/<>.<>",
      albumAdditionalFile: "album-additional/<>/<>",
    },
  },
};

// This gets automatically switched in place when working from a baseDirectory,
// so it should never be referenced manually.
urlSpec.localizedWithBaseDirectory = {
  paths: withEntries(urlSpec.localized.paths, (entries) =>
    entries.map(([key, path]) => [key, "<>/" + path])
  ),
};

export default urlSpec;
