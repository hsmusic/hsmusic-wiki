import {sortChronologically} from '#sort';
import {atOffset} from '#sugar';

export default {
  contentDependencies: [
    'generatePageSidebarBox',
    'linkAlbum',
    'linkExternal',
    'linkGroup',
    'transformContent',
  ],

  extraDependencies: ['html', 'language'],

  query(album, group) {
    const query = {};

    if (album.date) {
      const albums =
        group.albums.filter(album => album.date);

      // Sort by latest first. This matches the sorting order used on group
      // gallery pages, ensuring that previous/next matches moving up/down
      // the gallery. Note that this makes the index offsets "backwards"
      // compared to how latest-last chronological lists are accessed.
      sortChronologically(albums, {latestFirst: true});

      const index =
        albums.indexOf(album);

      query.previousAlbum =
        atOffset(albums, index, +1);

      query.nextAlbum =
        atOffset(albums, index, -1);
    }

    return query;
  },

  relations(relation, query, album, group) {
    const relations = {};

    relations.box =
      relation('generatePageSidebarBox');

    relations.groupLink =
      relation('linkGroup', group);

    relations.externalLinks =
      group.urls.map(url =>
        relation('linkExternal', url));

    if (group.descriptionShort) {
      relations.description =
        relation('transformContent', group.descriptionShort);
    }

    if (query.previousAlbum) {
      relations.previousAlbumLink =
        relation('linkAlbum', query.previousAlbum);
    }

    if (query.nextAlbum) {
      relations.nextAlbumLink =
        relation('linkAlbum', query.nextAlbum);
    }

    return relations;
  },

  slots: {
    mode: {
      validate: v => v.is('album', 'track'),
      default: 'track',
    },
  },

  generate: (relations, slots, {html, language}) =>
    relations.box.slots({
      attributes: {class: 'individual-group-sidebar-box'},
      content: [
        html.tag('h1',
          language.$('albumSidebar.groupBox.title', {
            group: relations.groupLink,
          })),

        slots.mode === 'album' &&
          relations.description
            ?.slot('mode', 'multiline'),

        html.tag('p',
          {[html.onlyIfContent]: true},

          language.$('releaseInfo.visitOn', {
            [language.onlyIfOptions]: ['links'],

            links:
              language.formatDisjunctionList(
                relations.externalLinks
                  .map(link => link.slot('context', 'group'))),
          })),

        slots.mode === 'album' &&
          html.tag('p', {class: 'group-chronology-link'},
            {[html.onlyIfContent]: true},
            language.$('albumSidebar.groupBox.next', {
              [language.onlyIfOptions]: ['album'],
              album: relations.nextAlbumLink,
            })),

        slots.mode === 'album' &&
          html.tag('p', {class: 'group-chronology-link'},
            {[html.onlyIfContent]: true},
            language.$('albumSidebar.groupBox.previous', {
              [language.onlyIfOptions]: ['album'],
              album: relations.previousAlbumLink,
            })),
      ],
    }),
};
