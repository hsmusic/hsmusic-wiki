// Index structures shared by client and server, and relevant interfaces.

function prepareArtwork(artwork, thing, {
  checkIfImagePathHasCachedThumbnails,
  getThumbnailEqualOrSmaller,
  urls,
}) {
  if (!artwork) {
    return undefined;
  }

  const hasWarnings =
    artwork.artTags?.some(artTag => artTag.isContentWarning);

  const artworkPath =
    artwork.path;

  if (!artworkPath) {
    return undefined;
  }

  const mediaSrc =
    urls
      .from('media.root')
      .to(...artworkPath);

  if (!checkIfImagePathHasCachedThumbnails(mediaSrc)) {
    return undefined;
  }

  const selectedSize =
    getThumbnailEqualOrSmaller(
      (hasWarnings ? 'mini' : 'adorb'),
      mediaSrc);

  const mediaSrcJpeg =
    mediaSrc.replace(/\.(png|jpg)$/, `.${selectedSize}.jpg`);

  const displaySrc =
    urls
      .from('thumb.root')
      .to('thumb.path', mediaSrcJpeg);

  const serializeSrc =
    displaySrc.replace(thing.directory, '<>');

  return serializeSrc;
}

function baselineProcess(thing, opts) {
  const fields = {};

  fields.primaryName =
    thing.name;

  fields.artwork =
    null;

  fields.color =
    thing.color;

  fields.disambiguator =
    null;

  return fields;
}

const baselineStore = [
  'primaryName',
  'disambiguator',
  'artwork',
  'color',
];

function genericQuery(wikiData) {
  return [
    wikiData.albumData,

    wikiData.artTagData,

    wikiData.artistData
      .filter(artist => !artist.isAlias),

    wikiData.flashData,

    wikiData.groupData,

    wikiData.trackData
      // Exclude rereleases - there's no reasonable way to differentiate
      // them from the main release as part of this query.
      .filter(track => !track.mainReleaseTrack),
  ].flat();
}

function genericProcess(thing, opts) {
  const fields = baselineProcess(thing, opts);

  const kind =
    thing.constructor[Symbol.for('Thing.referenceType')];

  const boundPrepareArtwork = artwork =>
    prepareArtwork(artwork, thing, opts);

  fields.artwork =
    (kind === 'track' && thing.hasUniqueCoverArt
      ? boundPrepareArtwork(thing.trackArtworks[0])
   : kind === 'track'
      ? boundPrepareArtwork(thing.album.coverArtworks[0])
   : kind === 'album'
      ? boundPrepareArtwork(thing.coverArtworks[0])
   : kind === 'flash'
      ? boundPrepareArtwork(thing.coverArtwork)
      : null);

  fields.parentName =
    (kind === 'track'
      ? thing.album.name
   : kind === 'group'
      ? thing.category.name
   : kind === 'flash'
      ? thing.act.name
      : null);

  fields.disambiguator =
    fields.parentName;

  fields.artTags =
    (Array.from(new Set(
      (kind === 'track'
        ? thing.trackArtworks.flatMap(artwork => artwork.artTags)
     : kind === 'album'
        ? thing.coverArtworks.flatMap(artwork => artwork.artTags)
        : []))))

      .map(artTag => artTag.nameShort);

  fields.additionalNames =
    (thing.constructor.hasPropertyDescriptor('additionalNames')
      ? thing.additionalNames.map(entry => entry.name)
   : thing.constructor.hasPropertyDescriptor('aliasNames')
      ? thing.aliasNames
      : []);

  const contribKeys = [
    'artistContribs',
    'contributorContribs',
  ];

  const contributions =
    contribKeys
      .filter(key => Object.hasOwn(thing, key))
      .flatMap(key => thing[key]);

  fields.contributors =
    contributions
      .flatMap(({artist}) => [
        artist.name,
        ...artist.aliasNames,
      ]);

  const groups =
     (Object.hasOwn(thing, 'groups')
       ? thing.groups
    : Object.hasOwn(thing, 'album')
       ? thing.album.groups
       : []);

  const mainContributorNames =
    contributions
      .map(({artist}) => artist.name);

  fields.groups =
    groups
      .filter(group => !mainContributorNames.includes(group.name))
      .map(group => group.name);

  return fields;
}

const genericStore = baselineStore;

export const searchSpec = {
  generic: {
    query: genericQuery,
    process: genericProcess,

    index: [
      'primaryName',
      'parentName',
      'artTags',
      'additionalNames',
      'contributors',
      'groups',
    ].map(field => ({field, tokenize: 'forward'})),

    store: genericStore,
  },

  verbatim: {
    query: genericQuery,
    process: genericProcess,

    index: [
      'primaryName',
      'parentName',
      'artTags',
      'additionalNames',
      'contributors',
      'groups',
    ],

    store: genericStore,
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
