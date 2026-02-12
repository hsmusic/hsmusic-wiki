// Index structures shared by client and server, and relevant interfaces.
// First and foremost, this is complemented by src/search-select.js, which
// actually fills the search indexes up with stuff. During build this all
// gets consumed by src/search.js to make an index, fill it with stuff
// (as described by search-select.js), and export it to disk; then on
// the client that export is consumed by src/static/js/search-worker.js,
// which builds an index in the same shape and imports the data for query.

const baselineStore = [
  'primaryName',
  'disambiguators',
  'classification',
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
