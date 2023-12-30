import {empty, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateAbsoluteDatetimestamp',
    'generateColorStyleVariables',
    'generateContentHeading',
    'generateGroupNavLinks',
    'generateGroupSecondaryNav',
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
      relations.secondaryNav =
        relation('generateGroupSecondaryNav', group);

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

      sec.albums.colorVariables =
        group.albums
          .map(() => relation('generateColorStyleVariables'));

      sec.albums.albumLinks =
        group.albums
          .map(album => relation('linkAlbum', album));

      sec.albums.groupLinks =
        group.albums
          .map(album => album.groups.find(g => g !== group))
          .map(group =>
            (group
              ? relation('linkGroup', group)
              : null));

      sec.albums.datetimestamps =
        group.albums.map(album =>
          (album.date
            ? relation('generateAbsoluteDatetimestamp', album.date)
            : null));
    }

    return relations;
  },

  data(sprawl, group) {
    const data = {};

    data.name = group.name;
    data.color = group.color;

    data.albumColors =
      group.albums.map(album => album.color);

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
                links:
                  language.formatDisjunctionList(
                    sec.info.visitLinks
                      .map(link => link.slot('context', 'group'))),
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
              stitchArrays({
                albumLink: sec.albums.albumLinks,
                groupLink: sec.albums.groupLinks,
                datetimestamp: sec.albums.datetimestamps,
                colorVariables: sec.albums.colorVariables,
                albumColor: data.albumColors,
              }).map(({
                  albumLink,
                  groupLink,
                  datetimestamp,
                  colorVariables,
                  albumColor,
                }) => {
                  const prefix = 'groupInfoPage.albumList.item';
                  const parts = [prefix];
                  const options = {};

                  options.album =
                    albumLink.slot('color', false);

                  if (datetimestamp) {
                    parts.push('withYear');
                    options.yearAccent =
                      language.$(prefix, 'yearAccent', {
                        year:
                          datetimestamp.slots({style: 'year', tooltip: true}),
                      });
                  }

                  if (groupLink) {
                    parts.push('withOtherGroup');
                    options.otherGroupAccent =
                      html.tag('span', {class: 'other-group-accent'},
                        language.$(prefix, 'otherGroupAccent', {
                          group:
                            groupLink.slot('color', false),
                        }));
                  }

                  return (
                    html.tag('li',
                      {style:
                        colorVariables
                          .slot('color', albumColor)
                          .content},

                      language.$(...parts, options)));
                })),
          ],
        ],

        ...relations.sidebar?.content ?? {},

        navLinkStyle: 'hierarchical',
        navLinks: relations.navLinks.content,

        secondaryNav: relations.secondaryNav ?? null,
      });
  },
};
