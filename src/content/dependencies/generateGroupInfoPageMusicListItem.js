import {empty} from '#sugar';

export default {
  query(thing, group) {
    if (thing.groups.length > 1) {
      const currentCategory = group.category;

      const candidateGroups =
        thing.groups
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

    if (!empty(thing.artistContribs)) {
      if (thing.artistContribs.length >= 2) {
        return {detail: 'artists'};
      }

      const onlyAlbumArtist = thing.artistContribs[0].artist;
      const firstGroupArtist = group.closelyLinkedArtists[0]?.artist;

      if (!firstGroupArtist || onlyAlbumArtist !== firstGroupArtist) {
        return {detail: 'artists'};
      }
    }

    return {detail: null};
  },

  relations: (relation, query, thing, _group) => ({
    colorStyle:
      relation('generateColorStyleAttribute', thing.color),

    albumOrTrackLink:
      relation('linkAnythingMan', thing),

    datetimestamp:
      (thing.date
        ? relation('generateAbsoluteDatetimestamp', thing.date)
        : null),

    artistCredit:
      relation('generateArtistCredit', thing.artistContribs, []),

    otherGroupLinks:
      (query.detail === 'groups'
        ? query.detailGroups.map(group => relation('linkGroup', group))
        : []),
  }),

  data: (query, thing, group) => ({
    type:
      (thing.isAlbum ? 'album' :
       thing.isTrack ? 'track' :
       null),

    groupName:
      group.name,

    notFromThisGroup:
      !thing.groups.includes(group) &&
      !thing.ownGroups?.includes(group),

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

      language.encapsulate('groupInfoPage.musicList', listCapsule => {
        const itemCapsule = language.encapsulate(listCapsule, 'item', data.type);

        let workingCapsule = itemCapsule;
        const workingOptions = {};

        workingOptions[data.type] =
          relations.albumOrTrackLink.slots({
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

        const otherGroupCapsule = language.encapsulate(itemCapsule, 'withOtherGroups');

        if (showDetail === 'not from this group') {
          workingCapsule += '.withOtherGroups';
          workingOptions.fromOtherGroups =
            html.tag('span', {class: 'other-group-accent'},
              language.$(otherGroupCapsule, 'accent.notFromThisGroup', {
                group:
                  data.groupName,
              }));
        }

        if (showDetail === 'other groups') {
          workingCapsule += '.withOtherGroups';
          workingOptions.fromOtherGroups =
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
      })),
};
