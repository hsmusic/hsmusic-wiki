import {sortAlbumsTracksChronologically} from '#sort';

export default {
  query: (group) => ({
    albumsAndTracks:
      sortAlbumsTracksChronologically(
        group.albumsAndTracks.slice(),
        {latestFirst: true}),
  }),

  relations: (relation, query, group) => ({
    styleSelector:
      (group.divideAlbumsByStyle
        ? relation('generateGroupGalleryPageStyleSelector', group)
        : null),

    grid:
      relation('generateGroupGalleryPageMusicGrid',
        query.albumsAndTracks,
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
    language.encapsulate('groupGalleryPage.musicByDate', capsule =>
      html.tag('div', {id: 'group-music-gallery-by-date'},
        slots.attributes,
        {[html.onlyIfContent]: true},

        html.tag('section',
          slots.showTitle &&
            html.tag('h2',
              language.$(capsule, 'title')),

          relations.styleSelector,
          relations.grid))),
};
