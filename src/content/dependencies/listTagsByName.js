import {sortAlphabetically} from '#sort';
import {stitchArrays} from '#sugar';

export default {
  contentDependencies: ['generateListingPage', 'linkArtTag'],
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
            .filter(tag => !tag.isContentWarning)),
    };
  },

  relations(relation, query) {
    return {
      page: relation('generateListingPage', query.spec),

      artTagLinks:
        query.artTags
          .map(tag => relation('linkArtTag', tag)),
    };
  },

  data(query) {
    return {
      counts:
        query.artTags
          .map(tag => tag.taggedInThings.length),
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
