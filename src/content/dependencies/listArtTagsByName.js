import {stitchArrays, unique} from '#sugar';
import {sortAlphabetically} from '#wiki-data';

export default {
  contentDependencies: ['generateListingPage', 'linkArtTagGallery'],
  extraDependencies: ['language', 'wikiData'],

  sprawl({artTagData}) {
    return {artTagData};
  },

  query({artTagData}, spec) {
    return {
      spec,

      artTags:
        sortAlphabetically(
          artTagData
            .filter(artTag => !artTag.isContentWarning)),
    };
  },

  relations(relation, query) {
    return {
      page: relation('generateListingPage', query.spec),

      artTagLinks:
        query.artTags
          .map(artTag => relation('linkArtTagGallery', artTag)),
    };
  },

  data(query) {
    return {
      counts:
        query.artTags.map(artTag =>
          unique([
            ...artTag.indirectlyTaggedInThings,
            ...artTag.directlyTaggedInThings,
          ]).length),
    };
  },

  generate(data, relations, {language}) {
    return relations.page.slots({
      type: 'rows',
      rows:
        stitchArrays({
          link: relations.artTagLinks,
          count: data.counts,
        }).map(({link, count}) => ({
            tag: link,
            timesUsed: language.countTimesUsed(count, {unit: true}),
          })),
    });
  },
};
