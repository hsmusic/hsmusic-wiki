import {empty, stitchArrays} from '#sugar';

import groupTracksByGroup from '../util/groupTracksByGroup.js';

export default {
  contentDependencies: [
    'generateContentHeading',
    'generateTrackList',
    'linkGroup',
  ],

  extraDependencies: ['html', 'language'],

  query: (tracks, groups) => ({
    lists:
      (empty(groups)
        ? []
        : groupTracksByGroup(tracks, groups)),
  }),

  relations(relation, query, tracks, groups) {
    if (empty(tracks)) {
      return {};
    }

    if (empty(groups)) {
      return {
        flatList:
          relation('generateTrackList', tracks),
      };
    }

    return {
      contentHeading:
        relation('generateContentHeading'),

      groupedLists:
        Array.from(query.lists.entries())
          .map(([groupOrOther, tracks]) => ({
            ...(groupOrOther === 'other'
                  ? {other: true}
                  : {groupLink: relation('linkGroup', groupOrOther)}),

            list:
              relation('generateTrackList', tracks),
          })),
    };
  },

  data: (query) => ({
    groupNames:
      Array.from(query.lists.keys())
        .map(groupOrOther =>
          (groupOrOther === 'group'
            ? null
            : groupOrOther.name)),
  }),

  slots: {
    headingString: {
      type: 'string',
    },
  },

  generate(data, relations, slots, {html, language}) {
    if (relations.flatList) {
      return relations.flatList;
    }

    return html.tag('dl',
      stitchArrays({
        groupName: data.groupNames,
        listEntry: relations.groupedLists
      }).map(({
          groupName,
          listEntry: {other, groupLink, list},
        }) => [
          (slots.headingString
            ? relations.contentHeading.clone().slots({
                tag: 'dt',

                title:
                  (other
                    ? language.$('trackList.fromOther')
                    : language.$('trackList.fromGroup', {
                        group: groupLink
                      })),

                stickyTitle:
                  (other
                    ? language.$(slots.headingString, 'sticky', 'fromOther')
                    : language.$(slots.headingString, 'sticky', 'fromGroup', {
                        group: groupName,
                      })),
              })
            : html.tag('dt',
                (other
                  ? language.$('trackList.fromOther')
                  : language.$('trackList.fromGroup', {
                      group: groupLink
                    })))),

          html.tag('dd', list),
        ]));
  },
};
