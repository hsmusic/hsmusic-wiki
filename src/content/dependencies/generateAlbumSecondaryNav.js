import {stitchArrays} from '../../util/sugar.js';

export default {
  contentDependencies: [
    'generateColorStyleVariables',
    'generatePreviousNextLinks',
    'generateSecondaryNav',
    'linkAlbum',
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

    relations.colorVariables =
      album.groups
        .map(() => relation('generateColorStyleVariables'));

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
              ? relation('linkAlbum', previousAlbum)
              : null));

      relations.nextAlbumLinks =
        query.adjacentGroupInfo
          .map(({nextAlbum}) =>
            (nextAlbum
              ? relation('linkAlbum', nextAlbum)
              : null));
    }

    return relations;
  },

  data(query, album) {
    return {
      groupColors:
        album.groups.map(group => group.color),
    };
  },

  slots: {
    mode: {
      validate: v => v.is('album', 'track'),
      default: 'album',
    },
  },

  generate(data, relations, slots, {html, language}) {
    return relations.secondaryNav.slots({
      class: 'nav-links-groups',
      content:
        stitchArrays({
          colorVariables: relations.colorVariables,
          groupLink: relations.groupLinks,
          previousNextLinks: relations.previousNextLinks ?? null,
          previousAlbumLink: relations.previousAlbumLinks ?? null,
          nextAlbumLink: relations.nextAlbumLinks ?? null,
          groupColor: data.groupColors,
        }).map(({
            colorVariables,
            groupLink,
            previousNextLinks,
            previousAlbumLink,
            nextAlbumLink,
            groupColor,
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
                {style: colorVariables.slot('color', groupColor).content},
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
