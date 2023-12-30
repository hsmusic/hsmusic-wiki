import {stitchArrays} from '#sugar';

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

    if (album.date) {
      query.adjacentGroupInfo =
        album.groups.map(group => {
          const albums = group.albums.filter(album => album.date);
          const index = albums.indexOf(album);

          return {
            previousAlbum:
              (index > 0
                ? albums[index - 1]
                : null),

            nextAlbum:
              (index < albums.length - 1
                ? albums[index + 1]
                : null),
          };
        });
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

    if (query.adjacentGroupInfo) {
      relations.previousNextLinks =
        query.adjacentGroupInfo
          .map(({previousAlbum, nextAlbum}) =>
            (previousAlbum || nextAlbum
              ? relation('generatePreviousNextLinks')
              : null));

      relations.previousAlbumLinks =
        query.adjacentGroupInfo
          .map(({previousAlbum}) =>
            (previousAlbum
              ? relation('linkAlbumDynamically', previousAlbum)
              : null));

      relations.nextAlbumLinks =
        query.adjacentGroupInfo
          .map(({nextAlbum}) =>
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
                colorStyle,

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
