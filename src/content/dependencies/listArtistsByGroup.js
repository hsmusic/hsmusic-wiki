import {sortAlphabetically} from '#sort';

import {
  empty,
  filterByCount,
  filterMultipleArrays,
  stitchArrays,
  transposeArrays,
  unique,
} from '#sugar';

export default {
  sprawl({artistData, wikiInfo}) {
    return {artistData, wikiInfo};
  },

  query(sprawl, spec) {
    const artists =
      sortAlphabetically(
        sprawl.artistData.filter(artist => !artist.isAlias));

    const groupishDivisions =
      sprawl.wikiInfo.divideMusicBy
        .filter(thing => thing.isGroup || thing.isGroupCategory);

    if (empty(groupishDivisions)) {
      return {spec};
    }

    // We don't actually care about *which* things belong to each group, only
    // how many belong to each group. So we'll just compute a list of all the
    // divisions that each of each artists' things belongs to.
    const artistThingDivisions =
      artists.map(artist => {
        const artworkThings =
          unique(
            artist.artworkContributions
              .map(contrib => contrib.thing)
              .map(artwork => artwork.thing));

        const musicThings =
          unique(
            artist.musicContributions
              .map(contrib => contrib.thing));

        // This list can deliberately include doubles, i.e. if an artist
        // contributed music and art for the sames track.
        const things =
          [artworkThings, musicThings].flat();

        const thingDivisions =
          things
            .map(thing => thing.divisions ?? [])
            .map(divisions => divisions
              .filter(group => groupishDivisions.includes(group)));

        return thingDivisions;
      });

    const [artistsByDivision, countsByDivision] =
      transposeArrays(groupishDivisions.map(group => {
        const counts =
          artistThingDivisions
            .map(thingGroups => thingGroups
              .filter(thingGroups => thingGroups.includes(group))
              .length);

        const filteredArtists = artists.slice();

        filterByCount(filteredArtists, counts);

        return [filteredArtists, counts];
      }));

    const divisions = groupishDivisions;

    filterMultipleArrays(
      divisions,
      artistsByDivision,
      countsByDivision,
      (_group, artists, _counts) => !empty(artists));

    return {
      spec,
      divisions,
      artistsByDivision,
      countsByDivision,
    };
  },

  relations(relation, query) {
    const relations = {};

    relations.page =
      relation('generateListingPage', query.spec);

    if (query.artistsByDivision) {
      relations.divisionLinks =
        query.divisions
          .map(division => relation('linkAnythingMan', division));

      relations.artistLinksByDivision =
        query.artistsByDivision
          .map(artists => artists
            .map(artist => relation('linkArtist', artist)));
    }

    return relations;
  },

  data(query) {
    const data = {};

    if (query.artistsByDivision) {
      data.divisionDirectories =
        query.divisions
          .map(division => division.directory);

      data.countsByDivision =
        query.countsByDivision;
    }

    return data;
  },

  generate: (data, relations, {language}) =>
    relations.page.slots({
      type: 'chunks',

      showSkipToSection: true,
      chunkIDs:
        data.divisionDirectories
          .map(directory => `contributed-to-${directory}`),

      chunkTitles:
        relations.divisionLinks.map(groupLink => ({
          group: groupLink,
        })),

      chunkRows:
        stitchArrays({
          artistLinks: relations.artistLinksByDivision,
          counts: data.countsByDivision,
        }).map(({artistLinks, counts}) =>
            stitchArrays({
              link: artistLinks,
              count: counts,
            }).map(({link, count}) => ({
                artist: link,
                contributions: language.countContributions(count),
              }))),
    }),
};
