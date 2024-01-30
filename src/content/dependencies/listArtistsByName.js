import {stitchArrays} from '#sugar';
import {getArtistNumContributions, sortAlphabetically} from '#wiki-data';

export default {
  contentDependencies: ['generateListingPage', 'linkArtist', 'linkGroup'],
  extraDependencies: ['language', 'wikiData'],

  sprawl: ({artistData, wikiInfo}) =>
    ({artistData, wikiInfo}),

  query: (sprawl, spec) => ({
    spec,

    artists:
      sortAlphabetically(
        sprawl.artistData.filter(artist => !artist.isAlias)),
  }),

  relations: (relation, query) => ({
    page:
      relation('generateListingPage', query.spec),

    artistLinks:
      query.artists
        .map(artist => relation('linkArtist', artist)),
  }),

  data: (query) => ({
    counts:
      query.artists
        .map(artist => getArtistNumContributions(artist)),
  }),

  generate(data, relations, {language}) {
    return relations.page.slots({
      type: 'rows',
      rows:
        stitchArrays({
          link: relations.artistLinks,
          count: data.counts,
        }).map(({link, count}) => ({
            artist: link,
            contributions: language.countContributions(count, {unit: true}),
          })),
    });
  },
};
