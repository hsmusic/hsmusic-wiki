import {sortChronologically} from '#sort';
import {atOffset} from '#sugar';

export default {
  contentDependencies: [
    'generateColorStyleAttribute',
    'generateSecondaryNavParentSiblingsPart',
    'linkAlbumDynamically',
    'linkGroup',
  ],

  extraDependencies: ['html'],

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
    parentSiblingsPart:
      relation('generateSecondaryNavParentSiblingsPart'),

    groupLink:
      relation('linkGroup', group),

    colorStyle:
      relation('generateColorStyleAttribute', group.color),

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

  generate: (relations, slots) =>
    relations.parentSiblingsPart.slots({
      showPreviousNext: slots.mode === 'album',

      colorStyle: relations.colorStyle,
      mainLink: relations.groupLink,
      previousLink: relations.previousAlbumLink,
      nextLink: relations.nextAlbumLink,

      stringsKey: 'albumSecondaryNav.group',
      mainLinkOption: 'group',
    }),
};
