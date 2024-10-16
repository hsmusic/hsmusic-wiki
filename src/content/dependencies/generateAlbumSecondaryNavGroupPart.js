import {sortChronologically} from '#sort';
import {atOffset} from '#sugar';

export default {
  contentDependencies: [
    'generateColorStyleAttribute',
    'generatePreviousNextLinks',
    'linkAlbumDynamically',
    'linkGroup',
  ],

  extraDependencies: ['html', 'language'],

  query(group, album) {
    const query = {};

    if (album.date) {
      // Sort by latest first. This matches the sorting order used on group
      // gallery pages, ensuring that previous/next matches moving up/down
      // the gallery. Note that this makes the index offsets "backwards"
      // compared to how latest-last chronological lists are accessed.
      const albums =
        sortChronologically(
          group.albums.filter(album => album.date),
          {latestFirst: true});

      const currentIndex =
        albums.indexOf(album);

      query.previousAlbum =
        atOffset(albums, currentIndex, +1);

      query.nextAlbum =
        atOffset(albums, currentIndex, -1);
    }

    return query;
  },

  relations: (relation, query, group, _album) => ({
    groupLink:
      relation('linkGroup', group),

    colorStyle:
      relation('generateColorStyleAttribute', group.color),

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

  slots: {
    mode: {
      validate: v => v.is('album', 'track'),
      default: 'album',
    },
  },

  generate: (relations, slots, {html, language}) =>
    html.tag('span', {class: 'nav-link'},
      relations.colorStyle
        .slot('context', 'primary-only'),

      language.encapsulate('albumSecondaryNav.group', workingCapsule => {
        const workingOptions = {};

        workingOptions.group =
          relations.groupLink
            .slot('color', false);

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
