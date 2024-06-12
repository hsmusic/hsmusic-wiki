import {empty} from '#sugar';
import {stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateAbsoluteDatetimestamp',
    'generateColorStyleAttribute',
    'generateContentHeading',
    'linkAlbum',
    'linkGroupGallery',
    'linkGroup',
  ],

  extraDependencies: ['html', 'language'],

  query(group) {
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

  relations: (relation, query, group) => ({
    contentHeading:
      relation('generateContentHeading'),

    galleryLink:
      relation('linkGroupGallery', group),

    albumColorStyles:
      query.albums
        .map(album => relation('generateColorStyleAttribute', album.color)),

    albumLinks:
      query.albums
        .map(album => relation('linkAlbum', album)),

    otherGroupLinks:
      query.albumOtherGroups
        .map(groups => groups
          .map(group => relation('linkGroup', group))),

    datetimestamps:
      group.albums.map(album =>
        (album.date
          ? relation('generateAbsoluteDatetimestamp', album.date)
          : null)),
  }),

  generate: (relations, {html, language}) =>
    html.tags([
      relations.contentHeading
        .slots({
          tag: 'h2',
          title: language.$('groupInfoPage.albumList.title'),
        }),

      html.tag('p',
        {[html.onlyIfSiblings]: true},
        language.$('groupInfoPage.viewAlbumGallery', {
          link:
            relations.galleryLink
              .slot('content', language.$('groupInfoPage.viewAlbumGallery.link')),
        })),

      html.tag('ul',
        {[html.onlyIfContent]: true},

        stitchArrays({
          albumLink: relations.albumLinks,
          otherGroupLinks: relations.otherGroupLinks,
          datetimestamp: relations.datetimestamps,
          albumColorStyle: relations.albumColorStyles,
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
    ]),
};
