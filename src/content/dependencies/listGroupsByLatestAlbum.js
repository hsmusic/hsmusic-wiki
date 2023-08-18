import {stitchArrays} from '#sugar';

import {
  compareDates,
  filterMultipleArrays,
  sortChronologically,
  sortMultipleArrays,
} from '#wiki-data';

export default {
  contentDependencies: [
    'generateListingPage',
    'linkAlbum',
    'linkGroup',
    'linkGroupGallery',
  ],

  extraDependencies: ['language', 'wikiData'],

  sprawl({groupData}) {
    return {groupData};
  },

  query({groupData}, spec) {
    const groups = sortChronologically(groupData.slice());

    const albums =
      groups
        .map(group =>
          sortChronologically(
            group.albums.filter(album => album.date),
            {latestFirst: true}))
        .map(albums => albums[0]);

    filterMultipleArrays(groups, albums, (group, album) => album);

    const dates = albums.map(album => album.date);

    // Note: After this sort, the groups/dates arrays are misaligned with
    // albums. That's OK only because we aren't doing anything further with
    // the albums array.
    sortMultipleArrays(groups, dates,
      (groupA, groupB, dateA, dateB) =>
        compareDates(dateA, dateB, {latestFirst: true}));

    return {spec, groups, dates};
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
      dates: query.dates,
    };
  },

  generate(data, relations, {language}) {
    return relations.page.slots({
      type: 'rows',
      rows:
        stitchArrays({
          groupLink: relations.groupLinks,
          date: data.dates,
        }).map(({groupLink, date}) => ({
            group: groupLink,
            date: language.formatDate(date),
          })),
    });
  },
};
