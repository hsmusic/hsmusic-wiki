import {empty, filterMultipleArrays, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateContentHeading',
    'generateTrackList',
    'linkGroup',
  ],

  extraDependencies: ['html', 'language'],

  query(tracks, dividingGroups) {
    const groupings = new Map();
    const ungroupedTracks = [];

    // Entry order matters! Add blank lists for each group
    // in the order that those groups are provided.
    for (const group of dividingGroups) {
      groupings.set(group, []);
    }

    for (const track of tracks) {
      const firstMatchingGroup =
        dividingGroups.find(group => group.albums.includes(track.album));

      if (firstMatchingGroup) {
        groupings.get(firstMatchingGroup).push(track);
      } else {
        ungroupedTracks.push(track);
      }
    }

    const groups = Array.from(groupings.keys());
    const groupedTracks = Array.from(groupings.values());

    // Drop the empty lists, so just the groups which
    // at least a single track matched are left.
    filterMultipleArrays(
      groups,
      groupedTracks,
      (_group, tracks) => !empty(tracks));

    return {groups, groupedTracks, ungroupedTracks};
  },

  relations: (relation, query, tracks, groups) => ({
    flatList:
      (empty(groups)
        ? relation('generateTrackList', tracks)
        : null),

    contentHeading:
      relation('generateContentHeading'),

    groupLinks:
      query.groups
        .map(group => relation('linkGroup', group)),

    groupedTrackLists:
      query.groupedTracks
        .map(tracks => relation('generateTrackList', tracks)),

    ungroupedTrackList:
      (empty(query.ungroupedTracks)
        ? null
        : relation('generateTrackList', query.ungroupedTracks)),
  }),

  data: (query) => ({
    groupNames:
      query.groups
        .map(group => group.name),
  }),

  slots: {
    headingString: {
      type: 'string',
    },
  },

  generate: (data, relations, slots, {html, language}) =>
    relations.flatList ??
    html.tag('dl', [
      stitchArrays({
        groupName: data.groupNames,
        groupLink: relations.groupLinks,
        trackList: relations.groupedTrackLists,
      }).map(({
          groupName,
          groupLink,
          trackList,
        }) => [
          (slots.headingString
            ? relations.contentHeading.clone().slots({
                tag: 'dt',

                title:
                  language.$('trackList.fromGroup', {
                    group: groupLink
                  }),

                stickyTitle:
                  language.$(slots.headingString, 'sticky', 'fromGroup', {
                    group: groupName,
                  }),
              })
            : html.tag('dt',
                language.$('trackList.fromGroup', {
                  group: groupLink
                }))),

          html.tag('dd', trackList),
        ]),

      relations.ungroupedTrackList && [
        (slots.headingString
          ? relations.contentHeading.clone().slots({
              tag: 'dt',

              title:
                language.$('trackList.fromOther'),

              stickyTitle:
                language.$(slots.headingString, 'sticky', 'fromOther'),
            })
          : html.tag('dt',
              language.$('trackList.fromOther'))),

        html.tag('dd', relations.ungroupedTrackList),
      ],
    ]),
};
