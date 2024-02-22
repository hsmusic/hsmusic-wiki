import {getIndexListingForScope} from '#wiki-data';

export default {
  contentDependencies: ['generateListingIndexList', 'linkListing'],
  extraDependencies: ['html', 'wikiData'],

  sprawl: ({listingSpec}, currentListing) => ({
    indexListing:
      getIndexListingForScope(currentListing.scope, {listingSpec}),
  }),

  relations: (relation, sprawl, currentListing) => ({
    listingIndexLink:
      relation('linkListing', sprawl.indexListing),

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
