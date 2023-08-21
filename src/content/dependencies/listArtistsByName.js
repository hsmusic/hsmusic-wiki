import {empty, stitchArrays, unique} from '#sugar';
import {getArtistNumContributions, sortAlphabetically} from '#wiki-data';

export default {
  contentDependencies: ['generateListingPage', 'linkArtist', 'linkGroup'],
  extraDependencies: ['language', 'wikiData'],

  sprawl({artistData, wikiInfo}) {
    return {artistData, wikiInfo};
  },

  query(sprawl, spec) {
    const artists = sortAlphabetically(sprawl.artistData.slice());
    const groups = sprawl.wikiInfo.divideTrackListsByGroups;

    if (empty(groups)) {
      return {spec, artists};
    }

    const artistGroups =
      artists.map(artist =>
        unique(
          unique([
            ...artist.albumsAsAny,
            ...artist.tracksAsAny.map(track => track.album),
          ]).flatMap(album => album.groups)))

    const artistsByGroup =
      groups.map(group =>
        artists.filter((artist, index) => artistGroups[index].includes(group)));

    return {spec, groups, artistsByGroup};
  },

  relations(relation, query) {
    const relations = {};

    relations.page =
      relation('generateListingPage', query.spec);

    if (query.artists) {
      relations.artistLinks =
        query.artists
          .map(artist => relation('linkArtist', artist));
    }

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

    if (query.artists) {
      data.counts =
        query.artists
          .map(artist => getArtistNumContributions(artist));
    }

    if (query.artistsByGroup) {
      data.countsByGroup =
        query.artistsByGroup
          .map(artists => artists
            .map(artist => getArtistNumContributions(artist)));
    }

    return data;
  },

  generate(data, relations, {language}) {
    return (
      (relations.artistLinksByGroup
        ? relations.page.slots({
            type: 'chunks',

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
          })
        : relations.page.slots({
            type: 'rows',
            rows:
              stitchArrays({
                link: relations.artistLinks,
                count: data.counts,
              }).map(({link, count}) => ({
                  artist: link,
                  contributions: language.countContributions(count, {unit: true}),
                })),
          })));
  },
};
