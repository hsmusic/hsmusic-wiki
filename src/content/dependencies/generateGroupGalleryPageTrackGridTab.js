import {empty} from '#sugar';

export default {
  query(track, group) {
    if (track.groups.length > 1) {
      const currentCategory = group.category;

      const candidateGroups =
        track.groups
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

    if (!empty(track.artistContribs)) {
      if (track.artistContribs.length >= 2) {
        return {mode: 'artists'};
      };

      const onlyTrackArtist = track.artistContribs[0].artist;
      const firstGroupArtist = group.closelyLinkedArtists[0]?.artist;

      if (!firstGroupArtist || onlyTrackArtist !== firstGroupArtist) {
        return {mode: 'artists'};
      }
    }

    return {mode: null};
  },

  relations: (relation, query, track, _group) => ({
    artistCredit:
      (query.mode === 'artists'
        ? relation('generateArtistCredit', track.artistContribs, [])
        : null),
  }),

  data: (query, _track, _group) => ({
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
