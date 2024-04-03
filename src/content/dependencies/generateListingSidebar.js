export default {
  contentDependencies: [
    'generateListingIndexList',
    'generatePageSidebar',
    'linkListingIndex',
  ],

  extraDependencies: ['html'],

  relations: (relation, currentListing) => ({
    sidebar:
      relation('generatePageSidebar'),

    listingIndexLink:
      relation('linkListingIndex'),

    listingIndexList:
      relation('generateListingIndexList', currentListing),
  }),

  generate: (relations, {html}) =>
    relations.sidebar.slots({
      attributes: {class: 'listing-map-sidebar-box'},
      content: [
        html.tag('h1', relations.listingIndexLink),
        relations.listingIndexList.slot('mode', 'sidebar'),
      ],
    }),
};
