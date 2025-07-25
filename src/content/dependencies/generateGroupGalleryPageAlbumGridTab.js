import {empty} from '#sugar';

export default {
  contentDependencies: ['generateArtistCredit'],
  extraDependencies: ['language'],

  query(album, group) {
    if (album.groups.length > 1) {
      const contextGroup = group;

      const candidateGroupCategory =
        album.groups
          .filter(group => !group.excludeFromGalleryTabs)
          .find(group => group.category !== contextGroup.category)
          ?.category ??
        null;

      const candidateGroups =
        album.groups
          .filter(group => !group.excludeFromGalleryTabs)
          .filter(group => group.category === candidateGroupCategory);

      if (!empty(candidateGroups)) {
        return {
          mode: 'groups',
          notedGroups: candidateGroups,
        };
      }
    }

    if (!empty(album.artistContribs)) {
      if (
        album.artistContribs.length === 1 &&
        !empty(group.closelyLinkedArtists) &&
        (album.artistContribs[0].artist.name ===
         group.closelyLinkedArtists[0].artist.name)
      ) {
        return {mode: null};
      }

      return {
        mode: 'artists',
        notedArtistContribs: album.artistContribs,
      };
    }

    return {mode: null};;
  },

  relations: (relation, query, _album, _group) => ({
    artistCredit:
      (query.mode === 'artists'
        ? relation('generateArtistCredit', query.notedArtistContribs, [])
        : null),
  }),

  data: (query, _album, _group) => ({
    mode: query.mode,

    groupNames:
      (query.mode === 'groups'
        ? query.notedGroups.map(group => group.name)
        : null),
  }),

  generate: (data, relations, {language}) =>
    language.encapsulate('misc.coverGrid.tab', capsule =>
      (data.mode === 'groups'
        ? language.$(capsule, 'groups', {
            groups:
              language.formatUnitList(data.groupNames),
          })
     : data.mode === 'artists'
        ? relations.artistCredit.slots({
            normalStringKey:
              capsule + '.artists',

            normalFeaturingStringKey:
              capsule + '.artists.featuring',
          })
        : null)),
};
