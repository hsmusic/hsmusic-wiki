import {empty} from '#sugar';

export default {
  contentDependencies: ['generateArtistCredit'],
  extraDependencies: ['language'],

  query(album, group) {
    const query = {};

    const contextGroup = group;

    const candidateGroups =
      album.groups
        .filter(group => !group.excludeFromGalleryTabs)
        .filter(group => group.category !== contextGroup.category);

    query.notedGroup = candidateGroups.at(0) ?? null;

    if (
      album.artistContribs.length === 1 &&
      !empty(group.closelyLinkedArtists) &&
      (album.artistContribs[0].artist.name ===
       group.closelyLinkedArtists[0].artist.name)
    ) {
      query.notedArtistContribs = [];
    } else {
      query.notedArtistContribs = album.artistContribs;
    }

    return query;
  },

  relations: (relation, query, _album, _group) => ({
    artistCredit:
      relation('generateArtistCredit', query.notedArtistContribs, []),
  }),

  data: (query, _album, _group) => ({
    groupName:
      (query.notedGroup
        ? query.notedGroup.name
        : null),
  }),

  generate: (data, relations, {language}) =>
    language.encapsulate('misc.coverGrid.tab', capsule =>
      (data.groupName
        ? language.$(capsule, 'group', {
            group: data.groupName,
          })
     : relations.artistCredit
        ? relations.artistCredit.slots({
            normalStringKey:
              capsule + '.artists',

            normalFeaturingStringKey:
              capsule + '.artists.featuring',
          })
        : null)),
};
