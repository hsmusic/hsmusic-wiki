import {sortAlphabetically} from '#sort';
import {
  empty,
  filterByCount,
  filterMultipleArrays,
  stitchArrays,
  transposeArrays,
} from '#sugar';

export default {
  contentDependencies: ['generateListingPage', 'linkArtist', 'linkGroup'],
  extraDependencies: ['language', 'wikiData'],

  sprawl({artistData, wikiInfo}) {
    return {artistData, wikiInfo};
  },

  query(sprawl, spec) {
    const artists =
      sortAlphabetically(
        sprawl.artistData.filter(artist => !artist.isAlias));

    const interestingGroups =
      sprawl.wikiInfo.divideTrackListsByGroups;

    if (empty(interestingGroups)) {
      return {spec};
    }

    // We don't actually care about *which* things belong to each group, only
    // how many belong to each group. So we'll just compute a list of all the
    // (interesting) groups that each of each artists' things belongs to.
    const artistThingGroups =
      artists.map(artist =>
        ([...artist.albumsAsAny.map(album => album.groups),
          ...artist.tracksAsAny.map(track => track.album.groups)])
            .map(groups => groups
              .filter(group => interestingGroups.includes(group))));

    const [artistsByGroup, countsByGroup] =
      transposeArrays(interestingGroups.map(group => {
        const counts =
          artistThingGroups
            .map(thingGroups => thingGroups
              .filter(thingGroups => thingGroups.includes(group))
              .length);

        const filteredArtists = artists.slice();

        filterByCount(filteredArtists, counts);

        return [filteredArtists, counts];
      }));

    const groups = interestingGroups;

    filterMultipleArrays(
      groups,
      artistsByGroup,
      countsByGroup,
      (_group, artists, _counts) => !empty(artists));

    return {
      spec,
      groups,
      artistsByGroup,
      countsByGroup,
    };
  },

  relations(relation, query) {
    const relations = {};

    relations.page =
      relation('generateListingPage', query.spec);

    if (query.artistsByGroup) {
      relations.groupLinks =
        query.groups
          .map(group => relation('linkGroup', group));

      relations.artistLinksByGroup =
        query.artistsByGroup
          .map(artists => artists
            .map(artist => relation('linkArtist', artist)));
    }

    return relations;
  },

  data(query) {
    const data = {};

    if (query.artistsByGroup) {
      data.groupDirectories =
        query.groups
          .map(group => group.directory);

      data.countsByGroup =
        query.countsByGroup;
    }

    return data;
  },

  generate: (data, relations, {language}) =>
    relations.page.slots({
      type: 'chunks',

      showSkipToSection: true,
      chunkIDs:
        data.groupDirectories
          .map(directory => `contributed-to-${directory}`),

      chunkTitles:
        relations.groupLinks.map(groupLink => ({
          group: groupLink,
        })),

      chunkRows:
        stitchArrays({
          artistLinks: relations.artistLinksByGroup,
          counts: data.countsByGroup,
        }).map(({artistLinks, counts}) =>
            stitchArrays({
              link: artistLinks,
              count: counts,
            }).map(({link, count}) => ({
                artist: link,
                contributions: language.countContributions(count, {unit: true}),
              }))),
    }),
};
