import {empty, stitchArrays} from '#sugar';
import {sortMotifConnectionsChronologically} from '#sort';
import {divideIntoGroups} from '#wiki-data';

export default {
  contentDependencies: [
    'generateContentHeading',
    'generateMotifConnectionList',
    'generateMotifConnectionListItem',
    'linkGroup'
  ],
  extraDependencies: ['html', 'wikiData', 'language'],

  slots: {
    headingString: {
      type: 'string',
    },
  },

  sprawl: ({wikiInfo}) => ({
    divideTrackListsByGroups:
      wikiInfo.divideTrackListsByGroups,
  }),

  query(sprawl, motifConnections) {
    const dividingGroups = sprawl.divideTrackListsByGroups;

    const {groups, groupedItems, ungroupedItems} =
      divideIntoGroups(motifConnections, dividingGroups, {
        compareGroup: (connection, group) =>
          connection.track.album.groups.includes(group),
      });

    return {
      groups,
      groupedRefs: groupedItems,
      ungroupedRefs: ungroupedItems,
    };
  },

  relations: (relation, query, sprawl, connections, context) => ({
    items:
      sortMotifConnectionsChronologically(connections)
        .map(connection =>
          relation('generateMotifConnectionListItem', connection, context)),

    contentHeading:
      relation('generateContentHeading'),

    groupLinks:
      query.groups
        .map(group => relation('linkGroup', group)),

    groupedRefLists:
      query.groupedRefs
        .map(refs => relation('generateMotifConnectionList', refs, context)),

    ungroupedRefList:
      (empty(query.ungroupedRefs)
        ? null
        : relation('generateMotifConnectionList', query.ungroupedRefs, context)),
  }),

  data: (query, _sprawl, _connections, _context) => ({
    groupNames:
      query.groups
        .map(group => group.name),
  }),

  generate: (data, relations, slots, {html, language}) =>
    relations.flatList ??

    html.tag('dl', {class: 'division-list'},
      {[html.onlyIfContent]: true},

      language.encapsulate('trackList', listCapsule => [
        stitchArrays({
          groupName: data.groupNames,
          groupLink: relations.groupLinks,
          refList: relations.groupedRefLists,
        }).map(({
            groupName,
            groupLink,
            refList,
          }) => [
            language.encapsulate(listCapsule, 'fromGroup', capsule =>
              (slots.headingString
                ? relations.contentHeading.clone().slots({
                    tag: 'dt',

                    title:
                      language.$(capsule, {
                        group: groupLink
                      }),

                    stickyTitle:
                      language.$(slots.headingString, 'sticky', 'fromGroup', {
                        group: groupName,
                      }),
                  })
                : html.tag('dt',
                    language.$(capsule, {
                      group: groupLink
                    })))),

            html.tag('dd', refList),
          ]),

        relations.ungroupedRefList && [
          language.encapsulate(listCapsule, 'fromOther', capsule =>
            (slots.headingString
              ? relations.contentHeading.clone().slots({
                  tag: 'dt',

                  title:
                    language.$(capsule),

                  stickyTitle:
                    language.$(slots.headingString, 'sticky', 'fromOther'),
                })
              : html.tag('dt',
                  language.$(capsule)))),

          html.tag('dd', relations.ungroupedRefList),
        ],
      ]))
};
