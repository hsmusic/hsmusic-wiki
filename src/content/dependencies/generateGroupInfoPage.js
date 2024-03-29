import {empty, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateAbsoluteDatetimestamp',
    'generateColorStyleAttribute',
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

  query(sprawl, group) {
    const albums =
      group.albums;

    const albumGroups =
      albums
        .map(album => album.groups);

    const albumOtherCategory =
      albumGroups
        .map(groups => groups
          .map(group => group.category)
          .find(category => category !== group.category));

    const albumOtherGroups =
      stitchArrays({
        groups: albumGroups,
        category: albumOtherCategory,
      }).map(({groups, category}) =>
          groups
            .filter(group => group.category === category));

    return {albums, albumOtherGroups};
  },

  relations(relation, query, sprawl, group) {
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

    if (!empty(query.albums)) {
      sec.albums = {};

      sec.albums.heading =
        relation('generateContentHeading');

      sec.albums.galleryLink =
        relation('linkGroupGallery', group);

      sec.albums.albumColorStyles =
        query.albums
          .map(album => relation('generateColorStyleAttribute', album.color));

      sec.albums.albumLinks =
        query.albums
          .map(album => relation('linkAlbum', album));

      sec.albums.otherGroupLinks =
        query.albumOtherGroups
          .map(groups => groups
            .map(group => relation('linkGroup', group)));

      sec.albums.datetimestamps =
        group.albums.map(album =>
          (album.date
            ? relation('generateAbsoluteDatetimestamp', album.date)
            : null));
    }

    return relations;
  },

  data(query, sprawl, group) {
    const data = {};

    data.name = group.name;
    data.color = group.color;

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
                      .map(link => link.slots({
                        context: 'group',
                        style: 'platform',
                      }))),
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
                otherGroupLinks: sec.albums.otherGroupLinks,
                datetimestamp: sec.albums.datetimestamps,
                albumColorStyle: sec.albums.albumColorStyles,
              }).map(({
                  albumLink,
                  otherGroupLinks,
                  datetimestamp,
                  albumColorStyle,
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

                  if (!empty(otherGroupLinks)) {
                    parts.push('withOtherGroup');
                    options.otherGroupAccent =
                      html.tag('span', {class: 'other-group-accent'},
                        language.$(prefix, 'otherGroupAccent', {
                          groups:
                            language.formatConjunctionList(
                              otherGroupLinks.map(groupLink =>
                                groupLink.slot('color', false))),
                        }));
                  }

                  return (
                    html.tag('li',
                      albumColorStyle,
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
