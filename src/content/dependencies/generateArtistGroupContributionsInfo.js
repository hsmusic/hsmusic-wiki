import {accumulateSum, stitchArrays, withEntries} from '#sugar';

export default {
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

    const filteredGroupsOrdered =
      allGroupsOrdered.filter(group =>
        groupToThingsCountedForContributions.get(group).size ||
        groupToTotalDuration.get(group));

    return {
      groups:
        filteredGroupsOrdered,

      groupCounts:
        filteredGroupsOrdered
          .map(group => groupToTotalContributions.get(group)),

      groupDurations:
        filteredGroupsOrdered
          .map(group => groupToTotalDuration.get(group)),
    };
  },

  relations: (relation, query) => ({
    groupLinks:
      query.groups
        .map(group => relation('linkGroup', group)),
  }),

  data: (query) => ({
    groupDirectories:
      query.groups
        .map(group => group.directory),

    hasCountColumn:
      true,

    hasDurationColumn:
      query.groupDurations.some(Boolean),

    groupsChangeCategory:
      query.groups
        .map((group, index, groups) =>
          index >= 1 &&
          (group.category !==
           groups[index - 1].category)),

    groupCounts:
      query.groupCounts,

    groupDurations:
      query.groupDurations,
  }),

  slots: {
    string: {type: 'string'},
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('artistPage.groupContributions', capsule =>
      html.tag('table', {class: 'group-contributions-table'},
        {[html.onlyIfContent]: true},

        [
          html.tag('thead',
            {[html.onlyIfSiblings]: true},

            html.tag('tr', [
              html.tag('th',
                language.$(capsule, 'title', slots.string)),

              data.hasCountColumn &&
                html.tag('th',
                  language.$(capsule, 'column.count', slots.string)),

              data.hasDurationColumn &&
                html.tag('th',
                  language.$(capsule, 'column.duration')),
            ])),

          html.tag('tbody',
            {[html.onlyIfContent]: true},

            stitchArrays({
              link: relations.groupLinks,
              directory: data.groupDirectories,
              changesCategory: data.groupsChangeCategory,
              count: data.groupCounts,
              duration: data.groupDurations,
            }).map(({link, directory, changesCategory, count, duration}) =>
                html.tag('tr', changesCategory && {class: 'split'}, [
                  html.tag('td', {class: 'group'},
                    link.slots({
                      attributes: {'data-directory': directory},
                    })),

                  data.hasCountColumn &&
                    html.tag('td', {class: 'count'},
                      count),

                  data.hasDurationColumn &&
                    html.tag('td', {class: 'duration'},
                      language.formatDuration(duration)),
                ]),
              )),
        ])),
};
