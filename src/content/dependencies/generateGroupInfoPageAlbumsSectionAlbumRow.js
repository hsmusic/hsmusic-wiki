import {empty} from '#sugar';

export default {
  contentDependencies: [
    'generateAbsoluteDatetimestamp',
    'generateColorStyleAttribute',
    'linkAlbum',
    'linkGroup',
  ],

  extraDependencies: ['html', 'language'],

  query(album, group) {
    const otherCategory =
      album.groups
        .map(group => group.category)
        .find(category => category !== group.category);

    const otherGroups =
      album.groups
        .filter(({category}) => category === otherCategory);

    return {otherGroups};
  },

  relations: (relation, query, album) => ({
    albumLink:
      relation('linkAlbum', album),

    colorStyle:
      relation('generateColorStyleAttribute', album.color),

    otherGroupLinks:
      query.otherGroups
        .map(group => relation('linkGroup', group)),

    datetimestamp:
      (album.date
        ? relation('generateAbsoluteDatetimestamp', album.date)
        : null),
  }),

  slots: {
    showDatetimestamp: {
      type: 'boolean',
      default: true,
    },
  },

  generate: (relations, slots, {html, language}) =>
    language.encapsulate('groupInfoPage.albumList.item', itemCapsule =>
      html.tag('li',
        relations.colorStyle,

          language.encapsulate(itemCapsule, workingCapsule => {
            const workingOptions = {};

            workingOptions.album =
              relations.albumLink.slot('color', false);

            if (slots.showDatetimestamp && relations.datetimestamp) {
              workingCapsule += '.withYear';
              workingOptions.yearAccent =
                language.$(itemCapsule, 'yearAccent', {
                  year:
                    relations.datetimestamp.slots({
                      style: 'year',
                      tooltip: true,
                    }),
                });
            }

            if (!empty(relations.otherGroupLinks)) {
              workingCapsule += '.withOtherGroup';
              workingOptions.otherGroupAccent =
                html.tag('span', {class: 'other-group-accent'},
                  language.$(itemCapsule, 'otherGroupAccent', {
                    groups:
                      language.formatConjunctionList(
                        relations.otherGroupLinks
                          .map(groupLink =>
                            groupLink.slot('color', false))),
                  }));
            }

            return language.$(workingCapsule, workingOptions);
          }))),
};
