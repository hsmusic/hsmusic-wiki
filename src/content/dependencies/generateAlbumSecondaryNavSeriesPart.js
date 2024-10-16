import {atOffset} from '#sugar';

export default {
  contentDependencies: [
    'generateColorStyleAttribute',
    'generatePreviousNextLinks',
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
    groupLink:
      relation('linkGroup', series.group),

    colorStyle:
      relation('generateColorStyleAttribute', series.group.color),

    previousNextLinks:
      relation('generatePreviousNextLinks'),

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

  generate: (data, relations, slots, {html, language}) =>
    html.tag('span',
      {class: 'nav-link'},

      relations.colorStyle
        .slot('context', 'primary-only'),

      language.encapsulate('albumSecondaryNav.series', workingCapsule => {
        const workingOptions = {};

        workingOptions.series =
          relations.groupLink.slots({
            attributes: {class: 'series'},
            color: false,
            content: language.sanitize(data.name),
          });

        if (slots.mode === 'album') {
          const {previousNextLinks} = relations;

          previousNextLinks.setSlots({
            previousLink: relations.previousAlbumLink,
            nextLink: relations.nextAlbumLink,
            id: false,
          });

          if (!html.isBlank(previousNextLinks)) {
            workingCapsule += '.withPreviousNext';
            workingOptions.previousNext =
              language.formatUnitList(previousNextLinks.content);
          }
        }

        return language.$(workingCapsule, workingOptions);
      })),
};
