// Index structures shared by client and server, and relevant interfaces.
// First and foremost, this is complemented by src/search-select.js, which
// actually fills the search indexes up with stuff. During build this all
// gets consumed by src/search.js to make an index, fill it with stuff
// (as described by search-select.js), and export it to disk; then on
// the client that export is consumed by src/static/js/search-worker.js,
// which builds an index in the same shape and imports the data for query.

const baselineStore = [
  'primaryName',
  'disambiguator',
  'artwork',
  'color',
];

const genericStore = baselineStore;

const searchShape = {
  generic: {
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

export default searchShape;

export function makeSearchIndex(descriptor, {FlexSearch}) {
  return new FlexSearch.Document({
    id: 'reference',
    index: descriptor.index,
    store: descriptor.store,

    // Disable scoring, always return results according to provided order
    // (specified above in `genericQuery`, etc).
    resolution: 1,
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
  // TODO: :boom:

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

  for (const thing of descriptor.select(wikiData)) {
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
