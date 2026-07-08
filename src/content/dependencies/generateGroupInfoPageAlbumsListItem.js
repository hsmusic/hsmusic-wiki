import {empty} from '#sugar';

export default {
  query(album, group) {
    if (album.groups.length > 1) {
      const currentCategory = group.category;

      const candidateGroups =
        album.groups
          .filter(group => !group.excludeFromOtherGroupAlbumSummaries);

      const categoriesToGroups =
        Map.groupBy(candidateGroups, group => group.category);

      for (const [category, groups] of categoriesToGroups) {
        if (category === currentCategory) {
          continue;
        }

        if (empty(groups)) {
          continue;
        }

        return {detail: 'groups', detailGroups: groups};
      }
    }

    if (!empty(album.artistContribs)) {
      if (album.artistContribs.length >= 2) {
        return {detail: 'artists'};
      }

      const onlyAlbumArtist = album.artistContribs[0].artist;
      const firstGroupArtist = group.closelyLinkedArtists[0]?.artist;

      if (!firstGroupArtist || onlyAlbumArtist !== firstGroupArtist) {
        return {detail: 'artists'};
      }
    }

    return {detail: null};
  },

  relations: (relation, query, album, _group) => ({
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
      (query.detail === 'groups'
        ? query.detailGroups.map(group => relation('linkGroup', group))
        : []),
  }),

  data: (query, album, group) => ({
    groupName:
      group.name,

    notFromThisGroup:
      !group.albums.includes(album),

    autoDetailArtists:
      query.detail === 'artists',
  }),

  slots: {
    detail: {
      validate: v => v.is('auto', 'artists'),
    },
  },

  generate: (data, relations, slots, {html, language}) =>
    html.tag('li',
      relations.colorStyle,

      language.encapsulate('groupInfoPage.albumList.item', itemCapsule =>
        language.encapsulate(itemCapsule, workingCapsule => {
          const workingOptions = {};

          workingOptions.album =
            relations.albumLink.slots({
              showNameDetail: 'accent',
              color: false,
            });

          const yearCapsule = language.encapsulate(itemCapsule, 'withYear');

          if (relations.datetimestamp) {
            workingCapsule += '.withYear';
            workingOptions.yearAccent =
              language.$(yearCapsule, 'accent', {
                year:
                  relations.datetimestamp.slot('style', 'year'),
              });
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

          let showDetail = null;
          switch (slots.detail) {
            case null:
              break;

            case 'artists': {
              if (!html.isBlank(artistCredit)) {
                showDetail = 'artists';
                break;
              }

              break;
            }

            case 'auto': {
              if (data.notFromThisGroup) {
                showDetail = 'not from this group';
                break;
              }

              if (!empty(relations.otherGroupLinks)) {
                showDetail = 'other groups';
                break;
              }

              if (!html.isBlank(artistCredit) && data.autoDetailArtists) {
                showDetail = 'artists';
              }

              break;
            }
          }

          const otherGroupCapsule = language.encapsulate(itemCapsule, 'withOtherGroup');

          if (showDetail === 'not from this group') {
            workingCapsule += '.withOtherGroup';
            workingOptions.otherGroupAccent =
              html.tag('span', {class: 'other-group-accent'},
                language.$(otherGroupCapsule, 'notFromThisGroup', {
                  group:
                    data.groupName,
                }));
          }

          if (showDetail === 'other groups') {
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

          if (showDetail === 'artists') {
            workingCapsule += '.withArtists';
            workingOptions.by =
              html.tag('span', {class: 'by'},
                artistCredit);
          }

          return language.$(workingCapsule, workingOptions);
        }))),
};
