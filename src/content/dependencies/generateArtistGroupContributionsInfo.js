import {accumulateSum, empty, stitchArrays, withEntries} from '#sugar';

export default {
  contentDependencies: ['linkGroup'],
  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({groupCategoryData}) => ({
    groupOrder:
      groupCategoryData.flatMap(category => category.groups),
  }),

  query(sprawl, contributions) {
    const allGroupsUnordered =
      new Set(contributions.flatMap(contrib => contrib.groups));

    const allGroupsOrdered =
      sprawl.groupOrder.filter(group => allGroupsUnordered.has(group));

    const groupToThingsCountedForContributions =
      new Map(allGroupsOrdered.map(group => [group, new Set]));

    const groupToThingsCountedForDuration =
      new Map(allGroupsOrdered.map(group => [group, new Set]));

    for (const contrib of contributions) {
      for (const group of contrib.groups) {
        if (contrib.countInContributionTotals) {
          groupToThingsCountedForContributions.get(group).add(contrib.thing);
        }

        if (contrib.countInDurationTotals) {
          groupToThingsCountedForDuration.get(group).add(contrib.thing);
        }
      }
    }

    const groupToTotalContributions =
      withEntries(
        groupToThingsCountedForContributions,
        entries => entries.map(
          ([group, things]) =>
          ([group, things.size])));

    const groupToTotalDuration =
      withEntries(
        groupToThingsCountedForDuration,
        entries => entries.map(
          ([group, things]) =>
          ([group, accumulateSum(things, thing => thing.duration)])))

    const groupsSortedByCount =
      allGroupsOrdered
        .slice()
        .sort((a, b) =>
          (groupToTotalContributions.get(b)
         - groupToTotalContributions.get(a)));

    // The filter here ensures all displayed groups have at least some duration
    // when sorting by duration.
    const groupsSortedByDuration =
      allGroupsOrdered
        .filter(group => groupToTotalDuration.get(group) > 0)
        .sort((a, b) =>
          (groupToTotalDuration.get(b)
         - groupToTotalDuration.get(a)));

    const groupCountsSortedByCount =
      groupsSortedByCount
        .map(group => groupToTotalContributions.get(group));

    const groupDurationsSortedByCount =
      groupsSortedByCount
        .map(group => groupToTotalDuration.get(group));

    const groupDurationsApproximateSortedByCount =
      groupsSortedByCount
        .map(group => groupToThingsCountedForDuration.get(group).size > 1);

    const groupCountsSortedByDuration =
      groupsSortedByDuration
        .map(group => groupToTotalContributions.get(group));

    const groupDurationsSortedByDuration =
      groupsSortedByDuration
        .map(group => groupToTotalDuration.get(group));

    const groupDurationsApproximateSortedByDuration =
      groupsSortedByDuration
        .map(group => groupToThingsCountedForDuration.get(group).size > 1);

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

  relations: (relation, query) => ({
    groupLinksSortedByCount:
      query.groupsSortedByCount
        .map(group => relation('linkGroup', group)),

    groupLinksSortedByDuration:
      query.groupsSortedByDuration
        .map(group => relation('linkGroup', group)),
  }),

  data: (query) => ({
    groupCountsSortedByCount:
      query.groupCountsSortedByCount,

    groupDurationsSortedByCount:
      query.groupDurationsSortedByCount,

    groupDurationsApproximateSortedByCount:
      query.groupDurationsApproximateSortedByCount,

    groupCountsSortedByDuration:
      query.groupCountsSortedByDuration,

    groupDurationsSortedByDuration:
      query.groupDurationsSortedByDuration,

    groupDurationsApproximateSortedByDuration:
      query.groupDurationsApproximateSortedByDuration,
  }),

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

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('artistPage.groupContributions', capsule => {
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
          language.encapsulate(capsule, 'title', capsule =>
            (switchingSortPossible && slots.showSortButton
              ? language.$(capsule, 'withSortButton', {
                  title: slots.title,
                  sort:
                    html.tag('a', {class: 'group-contributions-sort-button'},
                      {href: '#'},

                      (slots.sort === 'count'
                        ? language.$(capsule, 'sorting.count')
                        : language.$(capsule, 'sorting.duration'))),
                })
              : slots.title))),

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
                    language.encapsulate(capsule, 'item', capsule =>
                      html.tag('li',
                        html.tag('div', {class: 'group-contributions-row'}, [
                          group,
                          html.tag('span', {class: 'group-contributions-metrics'},
                            // When sorting by count, duration details aren't necessarily
                            // available for all items.
                            (slots.showBothColumns && duration
                              ? language.$(capsule, 'countDurationAccent', {count, duration})
                              : language.$(capsule, 'countAccent', {count}))),
                        ]))))

              : stitchArrays({
                  group: relations.groupLinksSortedByDuration,
                  count: getCounts(data.groupCountsSortedByDuration),
                  duration:
                    getDurations(
                      data.groupDurationsSortedByDuration,
                      data.groupDurationsApproximateSortedByDuration),
                }).map(({group, count, duration}) =>
                    language.encapsulate(capsule, 'item', capsule =>
                      html.tag('li',
                        html.tag('div', {class: 'group-contributions-row'}, [
                          group,
                          html.tag('span', {class: 'group-contributions-metrics'},
                            // Count details are always available, since they're just the
                            // number of contributions directly. And duration details are
                            // guaranteed for every item when sorting by duration.
                            (slots.showBothColumns
                              ? language.$(capsule, 'durationCountAccent', {duration, count})
                              : language.$(capsule, 'durationAccent', {duration}))),
                        ]))))))),
      ]);
    }),
};
