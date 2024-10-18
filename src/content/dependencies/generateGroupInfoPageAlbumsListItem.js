import {empty} from '#sugar';

export default {
  contentDependencies: [
    'generateAbsoluteDatetimestamp',
    'generateArtistCredit',
    'generateColorStyleAttribute',
    'linkAlbum',
    'linkGroup',
  ],

  extraDependencies: ['html', 'language'],

  query: (album, group) => {
    const otherCategory =
      album.groups
        .map(group => group.category)
        .find(category => category !== group.category);

    const otherGroups =
      album.groups
        .filter(group => group.category === otherCategory);

    return {otherGroups};
  },

  relations: (relation, query, album) => ({
    colorStyle:
      relation('generateColorStyleAttribute', album.color),

    albumLink:
      relation('linkAlbum', album),

    datetimestamp:
      (album.date
        ? relation('generateAbsoluteDatetimestamp', album.date)
        : null),

    artistCredit:
      relation('generateArtistCredit', album.artistContribs, []),

    otherGroupLinks:
      query.otherGroups
        .map(group => relation('linkGroup', group)),
  }),

  slots: {
    accentMode: {
      validate: v => v.is('groups', 'artists'),
    },
  },

  generate: (relations, slots, {html, language}) =>
    html.tag('li',
      relations.colorStyle,

      language.encapsulate('groupInfoPage.albumList.item', itemCapsule =>
        language.encapsulate(itemCapsule, workingCapsule => {
          const workingOptions = {};

          workingOptions.album =
            relations.albumLink.slot('color', false);

          const yearCapsule = language.encapsulate(itemCapsule, 'withYear');

          if (relations.datetimestamp) {
            workingCapsule += '.withYear';
            workingOptions.yearAccent =
              language.$(yearCapsule, 'accent', {
                year:
                  relations.datetimestamp.slots({style: 'year', tooltip: true}),
              });
          }

          const otherGroupCapsule = language.encapsulate(itemCapsule, 'withOtherGroup');

          if (slots.accentMode === 'groups' && !empty(relations.otherGroupLinks)) {
            workingCapsule += '.withOtherGroup';
            workingOptions.otherGroupAccent =
              html.tag('span', {class: 'other-group-accent'},
                language.$(otherGroupCapsule, 'accent', {
                  groups:
                    language.formatConjunctionList(
                      relations.otherGroupLinks.map(groupLink =>
                        groupLink.slot('color', false))),
                }));
          }

          const artistCapsule = language.encapsulate(itemCapsule, 'withArtists');
          const {artistCredit} = relations;

          artistCredit.setSlots({
            normalStringKey:
              artistCapsule + '.by',

            featuringStringKey:
              artistCapsule + '.featuring',

            normalFeaturingStringKey:
              artistCapsule + '.by.featuring',
          });

          if (slots.accentMode === 'artists' && !html.isBlank(artistCredit)) {
            workingCapsule += '.withArtists';
            workingOptions.by =
              html.tag('span', {class: 'by'},
                html.metatag('chunkwrap', {split: ','},
                  html.resolve(artistCredit)));
          }

          return language.$(workingCapsule, workingOptions);
        }))),
};
