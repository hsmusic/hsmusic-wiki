import {sortChronologically} from '#sort';

export default {
  contentDependencies: ['generateGroupGalleryPageAlbumGrid'],
  extraDependencies: ['html', 'language'],

  query: (group) => ({
    albums:
      sortChronologically(group.albums, {latestFirst: true}),
  }),

  relations: (relation, query, group) => ({
    albumGrid:
      relation('generateGroupGalleryPageAlbumGrid',
        query.albums,
        group),
  }),

  slots: {
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
          html.tag('h2',
            language.$(capsule, 'title')),

          relations.albumGrid,
        ]))),
};
