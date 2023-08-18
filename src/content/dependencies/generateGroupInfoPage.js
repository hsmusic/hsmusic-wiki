import {empty} from '#sugar';

export default {
  contentDependencies: [
    'generateContentHeading',
    'generateGroupNavLinks',
    'generateGroupSidebar',
    'generatePageLayout',
    'linkAlbum',
    'linkExternal',
    'linkGroupGallery',
    'linkGroup',
    'transformContent',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({wikiInfo}) {
    return {
      enableGroupUI: wikiInfo.enableGroupUI,
    };
  },

  relations(relation, sprawl, group) {
    const relations = {};
    const sec = relations.sections = {};

    relations.layout =
      relation('generatePageLayout');

    relations.navLinks =
      relation('generateGroupNavLinks', group);

    if (sprawl.enableGroupUI) {
      relations.sidebar =
        relation('generateGroupSidebar', group);
    }

    sec.info = {};

    if (!empty(group.urls)) {
      sec.info.visitLinks =
        group.urls
          .map(url => relation('linkExternal', url));
    }

    if (group.description) {
      sec.info.description =
        relation('transformContent', group.description);
    }

    if (!empty(group.albums)) {
      sec.albums = {};

      sec.albums.heading =
        relation('generateContentHeading');

      sec.albums.galleryLink =
        relation('linkGroupGallery', group);

      sec.albums.entries =
        group.albums.map(album => {
          const links = {};
          links.albumLink = relation('linkAlbum', album);

          const otherGroup = album.groups.find(g => g !== group);
          if (otherGroup) {
            links.groupLink = relation('linkGroup', otherGroup);
          }

          return links;
        });
    }

    return relations;
  },

  data(sprawl, group) {
    const data = {};

    data.name = group.name;
    data.color = group.color;

    if (!empty(group.albums)) {
      data.albumYears =
        group.albums
          .map(album => album.date?.getFullYear());
    }

    return data;
  },

  generate(data, relations, {html, language}) {
    const {sections: sec} = relations;

    return relations.layout
      .slots({
        title: language.$('groupInfoPage.title', {group: data.name}),
        headingMode: 'sticky',
        color: data.color,

        mainContent: [
          sec.info.visitLinks &&
            html.tag('p',
              language.$('releaseInfo.visitOn', {
                links: language.formatDisjunctionList(sec.info.visitLinks),
              })),

          html.tag('blockquote',
            {[html.onlyIfContent]: true},
            sec.info.description
              ?.slot('mode', 'multiline')),

          sec.albums && [
            sec.albums.heading
              .slots({
                tag: 'h2',
                title: language.$('groupInfoPage.albumList.title'),
              }),

            html.tag('p',
              language.$('groupInfoPage.viewAlbumGallery', {
                link:
                  sec.albums.galleryLink
                    .slot('content', language.$('groupInfoPage.viewAlbumGallery.link')),
              })),

            html.tag('ul',
              sec.albums.entries.map(({albumLink, groupLink}, index) => {
                // All these strings are really jank, and should probably
                // be implemented with the same 'const parts = [], opts = {}'
                // form used elsewhere...
                const year = data.albumYears[index];
                const item =
                  (year
                    ? language.$('groupInfoPage.albumList.item', {
                        year,
                        album: albumLink,
                      })
                    : language.$('groupInfoPage.albumList.item.withoutYear', {
                        album: albumLink,
                      }));

                return html.tag('li',
                  (groupLink
                    ? language.$('groupInfoPage.albumList.item.withAccent', {
                        item,
                        accent:
                          html.tag('span', {class: 'other-group-accent'},
                            language.$('groupInfoPage.albumList.item.otherGroupAccent', {
                              group:
                                groupLink.slot('color', false),
                            })),
                      })
                    : item));
              })),
          ],
        ],

        ...relations.sidebar?.content ?? {},

        navLinkStyle: 'hierarchical',
        navLinks: relations.navLinks.content,
      });
  },
};
