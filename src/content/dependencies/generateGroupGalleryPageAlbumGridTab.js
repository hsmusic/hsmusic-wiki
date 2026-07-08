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

        return {mode: 'groups', groups};
      }
    }

    if (!empty(album.artistContribs)) {
      if (album.artistContribs.length >= 2) {
        return {mode: 'artists'};
      };

      const onlyAlbumArtist = album.artistContribs[0].artist;
      const firstGroupArtist = group.closelyLinkedArtists[0]?.artist;

      if (!firstGroupArtist || onlyAlbumArtist !== firstGroupArtist) {
        return {mode: 'artists'};
      }
    }

    return {mode: null};
  },

  relations: (relation, query, album, _group) => ({
    artistCredit:
      (query.mode === 'artists'
        ? relation('generateArtistCredit', album.artistContribs, [])
        : null),
  }),

  data: (query, _album, _group) => ({
    mode: query.mode,

    groupNames:
      (query.mode === 'groups'
        ? query.groups.map(group => group.name)
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
