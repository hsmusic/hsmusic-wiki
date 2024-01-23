import {stitchArrays, unique} from '#sugar';
import {filterByCount, sortAlphabetically, sortByCount} from '#wiki-data';

export default {
  contentDependencies: ['generateListingPage', 'linkArtTagGallery'],
  extraDependencies: ['language', 'wikiData'],

  sprawl: ({artTagData}) =>
    ({artTagData}),

  query({artTagData}, spec) {
    const artTags =
      sortAlphabetically(
        artTagData
          .filter(artTag => !artTag.isContentWarning));

    const counts =
      artTags.map(artTag =>
        unique([
          ...artTag.directlyTaggedInThings,
          ...artTag.indirectlyTaggedInThings,
        ]).length);

    filterByCount(artTags, counts);
    sortByCount(artTags, counts, {greatestFirst: true});

    return {spec, artTags, counts};
  },

  relations: (relation, query) => ({
    page:
      relation('generateListingPage', query.spec),

    artTagLinks:
      query.artTags
        .map(artTag => relation('linkArtTagGallery', artTag)),
  }),

  data: (query) =>
    ({counts: query.counts}),

  generate: (data, relations, {language}) =>
    relations.page.slots({
      type: 'rows',
      rows:
        stitchArrays({
          link: relations.artTagLinks,
          count: data.counts,
        }).map(({link, count}) => ({
            tag: link,
            timesUsed: language.countTimesUsed(count, {unit: true}),
          })),
    }),
};
