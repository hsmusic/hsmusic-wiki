import {stitchArrays} from '#sugar';

import {
  filterByCount,
  getTotalDuration,
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
    const durations =
      groups.map(group =>
        getTotalDuration(
          group.albums.flatMap(album => album.tracks),
          {originalReleasesOnly: true}));

    filterByCount(groups, durations);
    sortByCount(groups, durations, {greatestFirst: true});

    return {spec, groups, durations};
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
      durations: query.durations,
    };
  },

  generate(data, relations, {language}) {
    return relations.page.slots({
      type: 'rows',
      rows:
        stitchArrays({
          link: relations.groupLinks,
          duration: data.durations,
        }).map(({link, duration}) => ({
            group: link,
            duration: language.formatDuration(duration),
          })),
    });
  },
};
