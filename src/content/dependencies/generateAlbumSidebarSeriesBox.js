import {atOffset} from '#sugar';

export default {
  contentDependencies: [
    'generatePageSidebarBox',
    'linkAlbum',
    'linkGroup',
    'transformContent',
  ],

  extraDependencies: ['html', 'language'],

  query(album, series) {
    const query = {};

    const albums =
      series.albums;

    const index =
      albums.indexOf(album);

    query.previousAlbum =
      atOffset(albums, index, -1);

    query.nextAlbum =
      atOffset(albums, index, +1);

    return query;
  },

  relations: (relation, query, _album, series) => ({
    box:
      relation('generatePageSidebarBox'),

    groupLink:
      relation('linkGroup', series.group),

    description:
      relation('transformContent', series.description),

    previousAlbumLink:
      (query.previousAlbum
        ? relation('linkAlbum', query.previousAlbum)
        : null),

    nextAlbumLink:
      (query.nextAlbum
        ? relation('linkAlbum', query.nextAlbum)
        : null),
  }),

  data: (_query, _album, series) => ({
    name: series.name,
  }),

  slots: {
    mode: {
      validate: v => v.is('album', 'track'),
      default: 'track',
    },
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('albumSidebar.groupBox', boxCapsule =>
      relations.box.slots({
        attributes: {class: 'individual-series-sidebar-box'},
        content: [
          html.tag('h1',
            language.$(boxCapsule, 'title', {
              group:
                relations.groupLink.slots({
                  attributes: {class: 'series'},
                  content: language.sanitize(data.name),
                }),
            })),

          slots.mode === 'album' &&
            relations.description
              ?.slot('mode', 'multiline'),

          slots.mode === 'album' &&
            html.tag('p', {class: 'series-chronology-link'},
              {[html.onlyIfContent]: true},

              language.$(boxCapsule, 'next', {
                [language.onlyIfOptions]: ['album'],

                album: relations.nextAlbumLink,
              })),

          slots.mode === 'album' &&
            html.tag('p', {class: 'series-chronology-link'},
              {[html.onlyIfContent]: true},

              language.$(boxCapsule, 'previous', {
                [language.onlyIfOptions]: ['album'],

                album: relations.previousAlbumLink,
              })),
        ],
      })),
};
