export default {
  contentDependencies: ['generateListingIndexList', 'linkListing'],
  extraDependencies: ['html', 'wikiData'],

  relations: (relation, currentListing) => ({
    listingIndexLink:
      relation('linkListing', currentListing.indexListing),

    listingIndexList:
      relation('generateListingIndexList', currentListing),
  }),

  generate: (relations, {html}) => ({
    leftSidebarClass: 'listing-map-sidebar-box',
    leftSidebarContent: [
      html.tag('h1', relations.listingIndexLink),
      relations.listingIndexList.slot('mode', 'sidebar'),
    ],
  }),
};
