// Index structures shared by client and server, and relevant interfaces.

function prepareArtwork(thing) {
  switch (thing.constructor[Symbol.for('Thing.referenceType')]) {
    case 'flash': {
      return ['flash', thing.coverArtFileExtension];
    }

    case 'track': {
      if (thing.hasUniqueCoverArt) {
        if (thing.coverArtFileExtension === 'gif')
          return undefined;
        return ['track', thing.album.directory];
      } else if (thing.album.hasCoverArt) {
        if (thing.album.coverArtFileExtension === 'gif')
          return undefined;
        return ['track-album', thing.album.directory];
      } else {
        return undefined;
      }
    }

    default:
      return undefined;
  }
}

export const searchSpec = {
  generic: {
    query: ({
      albumData,
      artistData,
      flashData,
      trackData,
    }) => [
      albumData,

      artistData
        .filter(artist => !artist.isAlias),

      flashData,

      trackData
        // Exclude rereleases - there's no reasonable way to differentiate
        // them from the main release as part of this query.
        .filter(track => !track.originalReleaseTrack),
    ].flat(),

    process: (thing) => ({
      primaryName:
        thing.name,

      color:
        thing.color,

      additionalNames:
        (Object.hasOwn(thing, 'additionalNames')
          ? thing.additionalNames.map(entry => entry.name)
       : Object.hasOwn(thing, 'aliasNames')
          ? thing.aliasNames
          : []),

      contributors:
        ([
          'artistContribs',
          'bannerArtistContribs',
          'contributorContribs',
          'coverArtistContribs',
          'wallpaperArtistContribs',
        ]).filter(key => Object.hasOwn(thing, key))
          .flatMap(key => thing[key])
          .map(contrib => contrib.artist)
          .flatMap(artist => [artist.name, ...artist.aliasNames]),

      groups:
        (Object.hasOwn(thing, 'groups')
          ? thing.groups.map(group => group.name)
       : Object.hasOwn(thing, 'album')
          ? thing.album.groups.map(group => group.name)
          : []),

      artwork:
        prepareArtwork(thing),
    }),

    index: [
      'primaryName',
      'additionalNames',
      'contributors',
      'groups',
    ],

    store: [
      'primaryName',
      'artwork',
      'color',
    ],
  },

  albums: {
    query: ({albumData}) => albumData,

    process: (album) => ({
      name:
        album.name,

      groups:
        album.groups.map(group => group.name),
    }),

    index: [
      'name',
      'groups',
    ],
  },

  tracks: {
    query: ({trackData}) => trackData,

    process: (track) => ({
      name:
        track.name,

      color:
        track.color,

      album:
        track.album.name,

      albumDirectory:
        track.album.directory,

      artists:
        track.artistContribs
          .map(contrib => contrib.artist)
          .flatMap(artist => [artist.name, ...artist.aliasNames]),

      additionalNames:
        track.additionalNames
          .map(entry => entry.name),

      artwork:
        prepareArtwork(track),
    }),

    index: [
      'name',
      'album',
      'artists',
      'additionalNames',
    ],

    store: [
      'color',
      'name',
      'albumDirectory',
      'artwork',
    ],
  },

  artists: {
    query: ({artistData}) =>
      artistData
        .filter(artist => !artist.isAlias),

    process: (artist) => ({
      names:
        [artist.name, ...artist.aliasNames],
    }),

    index: [
      'names',
    ],
  },

  groups: {
    query: ({groupData}) => groupData,

    process: (group) => ({
      names: group.name,
      description: group.description,
      // category: group.category
    }),

    index: [
      'name',
      'description',
      // 'category',
    ],
  },

  flashes: {
    query: ({flashData}) => flashData,

    process: (flash) => ({
      name:
        flash.name,

      tracks:
        flash.featuredTracks
          .map(track => track.name),

      contributors:
        flash.contributorContribs
          .map(contrib => contrib.artist)
          .flatMap(artist => [artist.name, ...artist.aliasNames]),
    }),

    index: [
      'name',
      'tracks',
      'contributors',
    ],
  },
};

export function makeSearchIndex(descriptor, {FlexSearch}) {
  return new FlexSearch.Document({
    id: 'reference',
    index: descriptor.index,
    store: descriptor.store,
  });
}

// TODO: This function basically mirrors bind-utilities.js, which isn't
// exactly robust, but... binding might need some more thought across the
// codebase in *general.*
function bindSearchUtilities({
  checkIfImagePathHasCachedThumbnails,
  getThumbnailEqualOrSmaller,
  thumbsCache,
  urls,
}) {
  const bound = {
    urls,
  };

  bound.checkIfImagePathHasCachedThumbnails =
    (imagePath) =>
      checkIfImagePathHasCachedThumbnails(imagePath, thumbsCache);

  bound.getThumbnailEqualOrSmaller =
    (preferred, imagePath) =>
      getThumbnailEqualOrSmaller(preferred, imagePath, thumbsCache);

  return bound;
}

export function populateSearchIndex(index, descriptor, opts) {
  const {wikiData} = opts;
  const bound = bindSearchUtilities(opts);

  const collection = descriptor.query(wikiData);

  for (const thing of collection) {
    const reference = thing.constructor.getReference(thing);

    let processed;
    try {
      processed = descriptor.process(thing, bound);
    } catch (caughtError) {
      throw new Error(
        `Failed to process searchable thing ${reference}`,
        {cause: caughtError});
    }

    index.add({reference, ...processed});
  }
}
