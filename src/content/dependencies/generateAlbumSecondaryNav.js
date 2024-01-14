import {atOffset, stitchArrays} from '#sugar';
import {sortChronologically} from '#wiki-data';

export default {
  contentDependencies: [
    'generateColorStyleAttribute',
    'generatePreviousNextLinks',
    'generateSecondaryNav',
    'linkAlbumDynamically',
    'linkGroup',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language'],

  query(album) {
    const query = {};

    query.groups =
      album.groups;

    if (album.date) {
      // Sort by latest first. This matches the sorting order used on group
      // gallery pages, ensuring that previous/next matches moving up/down
      // the gallery. Note that this makes the index offsets "backwards"
      // compared to how latest-last chronological lists are accessed.
      const groupAlbums =
        query.groups.map(group =>
          sortChronologically(
            group.albums.filter(album => album.date),
            {latestFirst: true}));

      const groupCurrentIndex =
        groupAlbums.map(albums =>
          albums.indexOf(album));

      query.groupPreviousAlbum =
        stitchArrays({
          albums: groupAlbums,
          index: groupCurrentIndex,
        }).map(({albums, index}) =>
            atOffset(albums, index, +1));

      query.groupNextAlbum =
        stitchArrays({
          albums: groupAlbums,
          index: groupCurrentIndex,
        }).map(({albums, index}) =>
            atOffset(albums, index, -1));
    }

    return query;
  },

  relations(relation, query, album) {
    const relations = {};

    relations.secondaryNav =
      relation('generateSecondaryNav');

    relations.groupLinks =
      album.groups
        .map(group => relation('linkGroup', group));

    relations.colorStyles =
      album.groups
        .map(group => relation('generateColorStyleAttribute', group.color));

    if (album.date) {
      relations.previousNextLinks =
        stitchArrays({
          previousAlbum: query.groupPreviousAlbum,
          nextAlbum: query.groupNextAlbum
        }).map(({previousAlbum, nextAlbum}) =>
            (previousAlbum || nextAlbum
              ? relation('generatePreviousNextLinks')
              : null));

      relations.previousAlbumLinks =
        query.groupPreviousAlbum.map(previousAlbum =>
          (previousAlbum
            ? relation('linkAlbumDynamically', previousAlbum)
            : null));

      relations.nextAlbumLinks =
        query.groupNextAlbum.map(nextAlbum =>
          (nextAlbum
            ? relation('linkAlbumDynamically', nextAlbum)
            : null));
    }

    return relations;
  },

  slots: {
    mode: {
      validate: v => v.is('album', 'track'),
      default: 'album',
    },
  },

  generate(relations, slots, {html, language}) {
    return relations.secondaryNav.slots({
      class: 'nav-links-groups',
      content:
        stitchArrays({
          colorStyle: relations.colorStyles,
          groupLink: relations.groupLinks,
          previousNextLinks: relations.previousNextLinks ?? null,
          previousAlbumLink: relations.previousAlbumLinks ?? null,
          nextAlbumLink: relations.nextAlbumLinks ?? null,
        }).map(({
            colorStyle,
            groupLink,
            previousNextLinks,
            previousAlbumLink,
            nextAlbumLink,
          }) => {
            if (
              slots.mode === 'track' ||
              !previousAlbumLink && !nextAlbumLink
            ) {
              return language.$('albumSidebar.groupBox.title', {
                group: groupLink,
              });
            }

            const {content: previousNextPart} =
              previousNextLinks.slots({
                previousLink: previousAlbumLink,
                nextLink: nextAlbumLink,
                id: false,
              });

            return (
              html.tag('span',
                colorStyle.slot('context', 'primary-only'),

                [
                  language.$('albumSidebar.groupBox.title', {
                    group: groupLink.slot('color', false),
                  }),

                  `(${language.formatUnitList(previousNextPart)})`,
                ]));
          }),
    });
  },
};
