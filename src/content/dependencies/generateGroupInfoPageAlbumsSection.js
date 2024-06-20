import {sortChronologically} from '#sort';
import {empty, stitchArrays} from '#sugar';

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
    // Typically, a latestFirst: false (default) chronological sort would be
    // appropriate here, but navigation between adjacent albums in a group is a
    // rather "essential" movement or relationship in the wiki, and we consider
    // the sorting order of a group's gallery page (latestFirst: true) to be
    // "canonical" in this regard. We exactly match its sort here, but reverse
    // it, to still present earlier albums preceding later ones.
    const albums =
      sortChronologically(group.albums.slice(), {latestFirst: true})
        .reverse();

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
      query.albums.map(album =>
        (album.date
          ? relation('generateAbsoluteDatetimestamp', album.date)
          : null)),
  }),

  generate: (relations, {html, language}) =>
    language.encapsulate('groupInfoPage', pageCapsule =>
      language.encapsulate(pageCapsule, 'albumList', listCapsule =>
        html.tags([
          relations.contentHeading
            .slots({
              tag: 'h2',
              title: language.$(listCapsule, 'title'),
            }),

          html.tag('p',
            {[html.onlyIfSiblings]: true},

            language.encapsulate(pageCapsule, 'viewAlbumGallery', capsule =>
              language.$(capsule, {
                link:
                  relations.galleryLink
                    .slot('content', language.$(capsule, 'link')),
              }))),

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
              }) =>
                html.tag('li',
                  albumColorStyle,

                  language.encapsulate(listCapsule, 'item', itemCapsule =>
                    language.encapsulate(itemCapsule, workingCapsule => {
                      const workingOptions = {};

                      workingOptions.album =
                        albumLink.slot('color', false);

                      if (datetimestamp) {
                        workingCapsule += '.withYear';
                        workingOptions.yearAccent =
                          language.$(itemCapsule, 'yearAccent', {
                            year:
                              datetimestamp.slots({style: 'year', tooltip: true}),
                          });
                      }

                      if (!empty(otherGroupLinks)) {
                        workingCapsule += '.withOtherGroup';
                        workingOptions.otherGroupAccent =
                          html.tag('span', {class: 'other-group-accent'},
                            language.$(itemCapsule, 'otherGroupAccent', {
                              groups:
                                language.formatConjunctionList(
                                  otherGroupLinks.map(groupLink =>
                                    groupLink.slot('color', false))),
                            }));
                      }

                      return language.$(workingCapsule, workingOptions);
                    }))))),
        ]))),
};
