import {sortChronologically} from '#sort';

export default {
  contentDependencies: [
    'generateListingPage',
    'generateListAllAdditionalFilesAlbumSection',
  ],

  extraDependencies: ['html', 'wikiData'],

  sprawl: ({albumData}) => ({albumData}),

  query: (sprawl, spec, property) => ({
    spec,
    property,

    albums:
      sortChronologically(sprawl.albumData.slice()),
  }),

  relations: (relation, query) => ({
    page:
      relation('generateListingPage', query.spec),

    albumSections:
      query.albums.map(album =>
        relation('generateListAllAdditionalFilesAlbumSection',
          album,
          query.property)),
  }),

  slots: {
    stringsKey: {type: 'string'},
  },

  generate: (relations, slots) =>
    relations.page.slots({
      type: 'custom',

      content:
        relations.albumSections.map(section =>
          section.slot('stringsKey', slots.stringsKey)),
    }),
};
