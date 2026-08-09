import {empty, filterMultipleArrays, stitchArrays} from '#sugar';
import {sortMotifConnectionsChronologically} from '#sort';

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

    const groupings = new Map();
    const ungroupedRefs = [];

    // Entry order matters! Add blank lists for each group
    // in the order that those groups are provided.
    for (const group of dividingGroups) {
      groupings.set(group, []);
    }

    for (const mc of motifConnections) {
      const firstMatchingGroup =
        dividingGroups.find(group => group.albums.includes(mc.track.album));

      if (firstMatchingGroup) {
        groupings.get(firstMatchingGroup).push(mc);
      } else {
        ungroupedRefs.push(mc);
      }
    }

    const groups = Array.from(groupings.keys());
    const groupedRefs = Array.from(groupings.values());

    // Drop the empty lists, so just the groups which
    // at least a single track matched are left.
    filterMultipleArrays(
      groups,
      groupedRefs,
      (_group, tracks) => !empty(tracks));

    return {groups, groupedRefs, ungroupedRefs};
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
