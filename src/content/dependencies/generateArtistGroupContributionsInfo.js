import {stitchArrays, unique} from '../../util/sugar.js';

export default {
  contentDependencies: ['linkGroup'],
  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({groupCategoryData}) {
    return {
      groupOrder: groupCategoryData.flatMap(category => category.groups),
    }
  },

  query(sprawl, tracksAndAlbums) {
    const filteredAlbums = tracksAndAlbums.filter(thing => !thing.album);
    const filteredTracks = tracksAndAlbums.filter(thing => thing.album);

    const allAlbums = unique([
      ...filteredAlbums,
      ...filteredTracks.map(track => track.album),
    ]);

    const allGroupsUnordered = new Set(Array.from(allAlbums).flatMap(album => album.groups));
    const allGroupsOrdered = sprawl.groupOrder.filter(group => allGroupsUnordered.has(group));

    const mapTemplate = allGroupsOrdered.map(group => [group, 0]);
    const groupToCountMap = new Map(mapTemplate);
    const groupToDurationMap = new Map(mapTemplate);
    const groupToDurationCountMap = new Map(mapTemplate);

    for (const album of filteredAlbums) {
      for (const group of album.groups) {
        groupToCountMap.set(group, groupToCountMap.get(group) + 1);
      }
    }

    for (const track of filteredTracks) {
      for (const group of track.album.groups) {
        groupToCountMap.set(group, groupToCountMap.get(group) + 1);
        if (track.duration) {
          groupToDurationMap.set(group, groupToDurationMap.get(group) + track.duration);
          groupToDurationCountMap.set(group, groupToDurationCountMap.get(group) + 1);
        }
      }
    }

    const groupsSortedByCount =
      allGroupsOrdered
        .sort((a, b) => groupToCountMap.get(b) - groupToCountMap.get(a));

    const groupsSortedByDuration =
      allGroupsOrdered
        .filter(group => groupToDurationMap.get(group) > 0)
        .sort((a, b) => groupToDurationMap.get(b) - groupToDurationMap.get(a));

    const groupCounts =
      groupsSortedByCount
        .map(group => groupToCountMap.get(group));

    const groupDurations =
      groupsSortedByDuration
        .map(group => groupToDurationMap.get(group));

    const groupDurationsApproximate =
      groupsSortedByDuration
        .map(group => groupToDurationCountMap.get(group) > 1);

    return {
      groupsSortedByCount,
      groupsSortedByDuration,
      groupCounts,
      groupDurations,
      groupDurationsApproximate,
    };
  },

  relations(relation, query) {
    return {
      groupLinksSortedByCount:
        query.groupsSortedByCount
          .map(group => relation('linkGroup', group)),

      groupLinksSortedByDuration:
        query.groupsSortedByDuration
          .map(group => relation('linkGroup', group)),
    };
  },

  data(query) {
    return {
      groupCounts: query.groupCounts,
      groupDurations: query.groupDurations,
      groupDurationsApproximate: query.groupDurationsApproximate,
    };
  },

  slots: {
    mode: {
      validate: v => v.is('count', 'duration'),
    },
  },

  generate(data, relations, slots, {language}) {
    return (
      language.formatUnitList(
        (slots.mode === 'count'
          ? stitchArrays({
              groupLink: relations.groupLinksSortedByCount,
              count: data.groupCounts,
            }).map(({groupLink, count}) =>
                language.$('artistPage.groupsLine.item.withCount', {
                  group: groupLink,
                  count,
                }))
          : stitchArrays({
              groupLink: relations.groupLinksSortedByDuration,
              duration: data.groupDurations,
              approximate: data.groupDurationsApproximate,
            }).map(({groupLink, duration, approximate}) =>
                language.$('artistPage.groupsLine.item.withDuration', {
                  group: groupLink,
                  duration: language.formatDuration(duration, {approximate}),
                })))));
  },
};
