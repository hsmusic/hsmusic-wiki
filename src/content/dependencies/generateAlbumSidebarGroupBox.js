import {empty} from '../../util/sugar.js';

export default {
  contentDependencies: ['linkAlbum', 'linkExternal', 'linkGroup'],
  extraDependencies: ['html', 'language', 'transformMultiline'],

  contracts: {
    relations: {
      hook(contract, [relation, album, group]) {
        contract.provide({
          group, album,

          urls: contract.selectProperty(group, 'urls'),
          adjacentAlbums: contract.subcontract('adjacentAlbumsInGroup', album, group),
        });
      },

      compute({relation, group, album, urls, adjacentAlbums}) {
        const relations = {};

        relations.groupLink =
          relation('linkGroup', group);

        relations.externalLinks =
          urls.map(url =>
            relation('linkExternal', urls));

        const {previousAlbum, nextAlbum} = adjacentAlbums;

        if (previousAlbum) {
          relations.previousAlbumLink =
            relation('linkAlbum', previousAlbum);
        }

        if (nextAlbum) {
          relations.nextAlbumLink =
            relation('linkAlbum', nextAlbum);
        }

        return relations;
      },
    },

    data: {
      hook(contract, [album, group]) {
        contract.provide({
          description: contract.selectProperty(group, 'descriptionShort'),
        });
      },

      compute({description}) {
        return {description};
      },
    },
  },

  generate(data, relations, {html, language, transformMultiline}) {
    return html.template({
      annotation: `generateAlbumSidebarGroupBox`,

      slots: {
        isAlbumPage: {type: 'boolean', default: false},
      },

      content(slots) {
        return html.tags([
          html.tag('h1',
            language.$('albumSidebar.groupBox.title', {
              group: relations.groupLink,
            })),

          slots.isAlbumPage &&
            transformMultiline(data.description),

          !empty(relations.externalLinks) &&
            html.tag('p',
              language.$('releaseInfo.visitOn', {
                links: language.formatDisjunctionList(relations.externalLinks),
              })),

          slots.isAlbumPage &&
          relations.nextAlbumLink &&
            html.tag('p', {class: 'group-chronology-link'},
              language.$('albumSidebar.groupBox.next', {
                album: relations.nextAlbumLink,
              })),

          slots.isAlbumPage &&
          relations.previousAlbumLink &&
            html.tag('p', {class: 'group-chronology-link'},
              language.$('albumSidebar.groupBox.previous', {
                album: relations.previousAlbumLink,
              })),
        ]);
      },
    });
  },
};
