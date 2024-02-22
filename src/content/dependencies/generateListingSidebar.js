import {getIndexListingForScope} from '#wiki-data';

export default {
  contentDependencies: [
    'generateListingIndexList',
    'generatePageSidebar',
    'generatePageSidebarBox',
    'linkListing',
  ],

  extraDependencies: ['html', 'wikiData'],

  sprawl: ({listingSpec}, currentListing) => ({
    indexListing:
      getIndexListingForScope(currentListing.scope, {listingSpec}),
  }),

  relations: (relation, sprawl, currentListing) => ({
    sidebar:
      relation('generatePageSidebar'),

    sidebarBox:
      relation('generatePageSidebarBox'),

    listingIndexLink:
      relation('linkListing', sprawl.indexListing),

    listingIndexList:
      relation('generateListingIndexList', currentListing),
  }),

  generate: (relations, {html}) =>
    relations.sidebar.slots({
      boxes: [
        relations.sidebarBox.slots({
          attributes: {class: 'listing-map-sidebar-box'},
          content: [
            html.tag('h1', relations.listingIndexLink),
            relations.listingIndexList.slot('mode', 'sidebar'),
          ],
        }),
      ],
    }),
};
