import {accumulateSum, stitchArrays} from '#sugar';

import {
  filterByCount,
  sortAlphabetically,
  sortByCount,
} from '#wiki-data';

export default {
  contentDependencies: ['generateListingPage', 'linkGroup'],
  extraDependencies: ['language', 'wikiData'],

  sprawl({groupData}) {
    return {groupData};
  },

  query({groupData}, spec) {
    const groups = sortAlphabetically(groupData.slice());
    const counts =
      groups.map(group =>
        accumulateSum(
          group.albums,
          ({tracks}) => tracks.length));

    filterByCount(groups, counts);
    sortByCount(groups, counts, {greatestFirst: true});

    return {spec, groups, counts};
  },

  relations(relation, query) {
    return {
      page: relation('generateListingPage', query.spec),

      groupLinks:
        query.groups
          .map(group => relation('linkGroup', group)),
    };
  },

  data(query) {
    return {
      counts: query.counts,
    };
  },

  generate(data, relations, {language}) {
    return relations.page.slots({
      type: 'rows',
      rows:
        stitchArrays({
          link: relations.groupLinks,
          count: data.counts,
        }).map(({link, count}) => ({
            group: link,
            tracks: language.countTracks(count, {unit: true}),
          })),
    });
  },
};
