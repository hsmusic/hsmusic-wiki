export default {
  contentDependencies: [
    'generateColorStyleVariables',
    'generateSecondaryNav',
    'linkAlbum',
    'linkGroup',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language'],

  relations(relation, album) {
    const relations = {};

    relations.secondaryNav =
      relation('generateSecondaryNav');

    relations.groupParts =
      album.groups.map(group => {
        const relations = {};

        relations.groupLink =
          relation('linkGroup', group);

        relations.colorVariables =
          relation('generateColorStyleVariables', group.color);

        if (album.date) {
          const albums = group.albums.filter(album => album.date);
          const index = albums.indexOf(album);
          const previousAlbum = (index > 0) && albums[index - 1];
          const nextAlbum = (index < albums.length - 1) && albums[index + 1];

          if (previousAlbum) {
            relations.previousAlbumLink =
              relation('linkAlbum', previousAlbum);
          }

          if (nextAlbum) {
            relations.nextAlbumLink =
              relation('linkAlbum', nextAlbum);
          }
        }

        return relations;
      });

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
        relations.groupParts.map(({
          colorVariables,
          groupLink,
          previousAlbumLink,
          nextAlbumLink,
        }) => {
          const links = [
            previousAlbumLink
              ?.slots({
                color: false,
                content: language.$('misc.nav.previous'),
              }),

            nextAlbumLink
              ?.slots({
                color: false,
                content: language.$('misc.nav.next'),
              }),
          ].filter(Boolean);

          return (
            (slots.mode === 'album'
              ? html.tag('span', {style: colorVariables}, [
                  language.$('albumSidebar.groupBox.title', {
                    group: groupLink,
                  }),
                  `(${language.formatUnitList(links)})`,
                ])
              : language.$('albumSidebar.groupBox.title', {
                  group: groupLink,
                })));
        }),
    });
  },
};
