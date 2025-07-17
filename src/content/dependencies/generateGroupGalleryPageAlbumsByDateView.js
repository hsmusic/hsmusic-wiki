import {sortChronologically} from '#sort';

export default {
  contentDependencies: [
    'generateGroupGalleryPageAlbumGrid',
    'generateGroupGalleryPageStyleSelector',
  ],

  extraDependencies: ['html', 'language'],

  query: (group) => ({
    albums:
      sortChronologically(group.albums, {latestFirst: true}),
  }),

  relations: (relation, query, group) => ({
    styleSelector:
      (group.divideAlbumsByStyle
        ? relation('generateGroupGalleryPageStyleSelector', group)
        : null),

    albumGrid:
      relation('generateGroupGalleryPageAlbumGrid',
        query.albums,
        group),
  }),

  slots: {
    showTitle: {
      type: 'boolean',
    },

    attributes: {
      type: 'attributes',
      mutable: false,
    },
  },

  generate: (relations, slots, {html, language}) =>
    language.encapsulate('groupGalleryPage.albumsByDate', capsule =>
      html.tag('div', {id: 'group-album-gallery-by-date'},
        slots.attributes,

        {[html.onlyIfContent]: true},

        html.tag('section', [
          slots.showTitle &&
            html.tag('h2',
              language.$(capsule, 'title')),

          relations.styleSelector,

          relations.albumGrid,
        ]))),
};
