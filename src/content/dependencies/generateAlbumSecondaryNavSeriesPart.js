import {atOffset} from '#sugar';

export default {
  contentDependencies: [
    'generateColorStyleAttribute',
    'generateSecondaryNavParentSiblingsPart',
    'linkAlbumDynamically',
    'linkGroup',
  ],

  extraDependencies: ['html', 'language'],

  query(series, album) {
    const query = {};

    const albums =
      series.albums;

    const currentIndex =
      albums.indexOf(album);

    query.previousAlbum =
      atOffset(albums, currentIndex, -1);

    query.nextAlbum =
      atOffset(albums, currentIndex, +1);

    return query;
  },

  relations: (relation, query, series, _album) => ({
    parentSiblingsPart:
      relation('generateSecondaryNavParentSiblingsPart'),

    groupLink:
      relation('linkGroup', series.group),

    colorStyle:
      relation('generateColorStyleAttribute', series.group.color),

    previousAlbumLink:
      (query.previousAlbum
        ? relation('linkAlbumDynamically', query.previousAlbum)
        : null),

    nextAlbumLink:
      (query.nextAlbum
        ? relation('linkAlbumDynamically', query.nextAlbum)
        : null),
  }),

  data: (_query, series) => ({
    name: series.name,
  }),

  slots: {
    mode: {
      validate: v => v.is('album', 'track'),
      default: 'album',
    },
  },

  generate: (data, relations, slots, {language}) =>
    relations.parentSiblingsPart.slots({
      attributes: {class: 'series-nav-link'},

      showPreviousNext: slots.mode === 'album',

      colorStyle: relations.colorStyle,

      mainLink:
        relations.groupLink.slots({
          attributes: {class: 'series'},
          content: language.sanitize(data.name),
        }),

      previousLink: relations.previousAlbumLink,
      nextLink: relations.nextAlbumLink,

      stringsKey: 'albumSecondaryNav.series',
      mainLinkOption: 'series',
    }),
};
