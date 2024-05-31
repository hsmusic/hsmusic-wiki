import {empty, filterProperties, stitchArrays, unique} from '#sugar';

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
        if (track.duration && track.originalReleaseTrack === null) {
          groupToDurationMap.set(group, groupToDurationMap.get(group) + track.duration);
          groupToDurationCountMap.set(group, groupToDurationCountMap.get(group) + 1);
        }
      }
    }

    const groupsSortedByCount =
      allGroupsOrdered
        .slice()
        .sort((a, b) => groupToCountMap.get(b) - groupToCountMap.get(a));

    // The filter here ensures all displayed groups have at least some duration
    // when sorting by duration.
    const groupsSortedByDuration =
      allGroupsOrdered
        .filter(group => groupToDurationMap.get(group) > 0)
        .sort((a, b) => groupToDurationMap.get(b) - groupToDurationMap.get(a));

    const groupCountsSortedByCount =
      groupsSortedByCount
        .map(group => groupToCountMap.get(group));

    const groupDurationsSortedByCount =
      groupsSortedByCount
        .map(group => groupToDurationMap.get(group));

    const groupDurationsApproximateSortedByCount =
      groupsSortedByCount
        .map(group => groupToDurationCountMap.get(group) > 1);

    const groupCountsSortedByDuration =
      groupsSortedByDuration
        .map(group => groupToCountMap.get(group));

    const groupDurationsSortedByDuration =
      groupsSortedByDuration
        .map(group => groupToDurationMap.get(group));

    const groupDurationsApproximateSortedByDuration =
      groupsSortedByDuration
        .map(group => groupToDurationCountMap.get(group) > 1);

    return {
      groupsSortedByCount,
      groupsSortedByDuration,

      groupCountsSortedByCount,
      groupDurationsSortedByCount,
      groupDurationsApproximateSortedByCount,

      groupCountsSortedByDuration,
      groupDurationsSortedByDuration,
      groupDurationsApproximateSortedByDuration,
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
    return filterProperties(query, [
      'groupCountsSortedByCount',
      'groupDurationsSortedByCount',
      'groupDurationsApproximateSortedByCount',

      'groupCountsSortedByDuration',
      'groupDurationsSortedByDuration',
      'groupDurationsApproximateSortedByDuration',
    ]);
  },

  slots: {
    title: {
      type: 'html',
      mutable: false,
    },

    showBothColumns: {type: 'boolean'},
    showSortButton: {type: 'boolean'},
    visible: {type: 'boolean', default: true},

    sort: {validate: v => v.is('count', 'duration')},
    countUnit: {validate: v => v.is('tracks', 'artworks')},
  },

  generate(data, relations, slots, {html, language}) {
    if (slots.sort === 'count' && empty(relations.groupLinksSortedByCount)) {
      return html.blank();
    } else if (slots.sort === 'duration' && empty(relations.groupLinksSortedByDuration)) {
      return html.blank();
    }

    const getCounts = counts =>
      counts.map(count => {
        switch (slots.countUnit) {
          case 'tracks': return language.countTracks(count, {unit: true});
          case 'artworks': return language.countArtworks(count, {unit: true});
        }
      });

    // We aren't displaying the "~" approximate symbol here for now.
    // The general notion that these sums aren't going to be 100% accurate
    // is made clear by the "XYZ has contributed ~1:23:45 hours of music..."
    // line that's always displayed above this table.
    const getDurations = (durations, approximate) =>
      stitchArrays({
        duration: durations,
        approximate: approximate,
      }).map(({duration}) => language.formatDuration(duration));

    const topLevelClasses = [
      'group-contributions-sorted-by-' + slots.sort,
      slots.visible && 'visible',
    ];

    // TODO: It feels pretty awkward that this component is the only one that
    // has enough knowledge to decide if the sort button is even applicable...
    const switchingSortPossible =
      !empty(relations.groupLinksSortedByCount) &&
      !empty(relations.groupLinksSortedByDuration);

    return html.tags([
      html.tag('dt', {class: topLevelClasses},
        (switchingSortPossible && slots.showSortButton
          ? language.$('artistPage.groupContributions.title.withSortButton', {
              title: slots.title,
              sort:
                html.tag('a', {class: 'group-contributions-sort-button'},
                  {href: '#'},

                  (slots.sort === 'count'
                    ? language.$('artistPage.groupContributions.title.sorting.count')
                    : language.$('artistPage.groupContributions.title.sorting.duration'))),
            })
          : slots.title)),

      html.tag('dd', {class: topLevelClasses},
        html.tag('ul', {class: 'group-contributions-table'},
          {role: 'list'},

          (slots.sort === 'count'
            ? stitchArrays({
                group: relations.groupLinksSortedByCount,
                count: getCounts(data.groupCountsSortedByCount),
                duration:
                  getDurations(
                    data.groupDurationsSortedByCount,
                    data.groupDurationsApproximateSortedByCount),
              }).map(({group, count, duration}) =>
                  html.tag('li',
                    html.tag('div', {class: 'group-contributions-row'}, [
                      group,
                      html.tag('span', {class: 'group-contributions-metrics'},
                        // When sorting by count, duration details aren't necessarily
                        // available for all items.
                        (slots.showBothColumns && duration
                          ? language.$('artistPage.groupContributions.item.countDurationAccent', {count, duration})
                          : language.$('artistPage.groupContributions.item.countAccent', {count}))),
                    ])))

            : stitchArrays({
                group: relations.groupLinksSortedByDuration,
                count: getCounts(data.groupCountsSortedByDuration),
                duration:
                  getDurations(
                    data.groupDurationsSortedByDuration,
                    data.groupDurationsApproximateSortedByDuration),
              }).map(({group, count, duration}) =>
                  html.tag('li',
                    html.tag('div', {class: 'group-contributions-row'}, [
                      group,
                      html.tag('span', {class: 'group-contributions-metrics'},
                        // Count details are always available, since they're just the
                        // number of contributions directly. And duration details are
                        // guaranteed for every item when sorting by duration.
                        (slots.showBothColumns
                          ? language.$('artistPage.groupContributions.item.durationCountAccent', {duration, count})
                          : language.$('artistPage.groupContributions.item.durationAccent', {duration}))),
                    ])))))),
    ]);
  },
};
