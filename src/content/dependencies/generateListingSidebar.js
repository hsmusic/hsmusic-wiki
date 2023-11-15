export default {
  contentDependencies: ['generateListingIndexList', 'linkListingIndex'],
  extraDependencies: ['html'],

  relations(relation, currentListing) {
    return {
      listingIndexLink: relation('linkListingIndex'),
      listingIndexList: relation('generateListingIndexList', currentListing),
    };
  },

  generate(relations, {html}) {
    return {
      leftSidebarClass: 'listing-map-sidebar-box',
      leftSidebarContent: [
        html.tag('h1', relations.listingIndexLink),
        relations.listingIndexList.slot('mode', 'sidebar'),
      ],
    };
  },
};
