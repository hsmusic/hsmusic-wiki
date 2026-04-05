import {empty, filterMultipleArrays, runs, stitchArrays, unique} from '#sugar';
import {TupleMapForBabies} from '#wiki-data';

export default {
  sprawl: ({wikiInfo}) => ({
    divideTrackListsByGroups:
      wikiInfo.divideTrackListsByGroups,
  }),

  query(sprawl, tracks, contextTrack) {
    const wikiDividingGroups = sprawl.divideTrackListsByGroups;

    const contextDividingGroups =
      contextTrack.groups
        .filter(group => !wikiDividingGroups.includes(group))
        .filter(group => group.useForDividingReferenceLists);

    const contextGroupRuns =
      Array.from(runs(contextDividingGroups));

    const groupings = new TupleMapForBabies('strong');
    const ungroupedTracks = [];

    const order = [
      ...contextGroupRuns,
      ...wikiDividingGroups.map(group => [group]),
    ];

    for (const track of tracks) {
      let run;
      getRun: {
        run =
          contextDividingGroups
            .filter(group => track.groups.includes(group));

        if (!empty(run)) {
          break getRun;
        }

        const wikiGroup =
          wikiDividingGroups.find(group => track.groups.includes(group));

        if (wikiGroup) {
          run = [wikiGroup];
          break getRun;
        }

        ungroupedTracks.push(track);
        continue;
      }

      if (groupings.has(...run)) {
        groupings.get(...run).push(track);
      } else {
        groupings.set(...run, [track]);
      }
    }

    let groupingGroups = order.slice();
    const groupedTracks = order.map(run => groupings.get(...run) ?? []);

    filterMultipleArrays(
      groupingGroups,
      groupedTracks,
      (_groups, tracks) => !empty(tracks));

    const presentContextDividingGroups =
      unique(groupingGroups.flat())
        .filter(group => contextDividingGroups.includes(group));

    const uninformativeGroups =
      presentContextDividingGroups.filter((group, index) =>
        presentContextDividingGroups
          .slice(0, index)
          .some(earlier =>
            groupingGroups.every(run =>
              run.includes(earlier) && run.includes(group) ||
             !run.includes(earlier) && !run.includes(group))));

    groupingGroups =
      groupingGroups.map(groups =>
        groups.filter(group =>
          !uninformativeGroups.includes(group)));

    return {groupingGroups, groupedTracks, ungroupedTracks};
  },

  relations: (relation, query, sprawl, tracks, contextTrack) => ({
    flatList:
      (empty(sprawl.divideTrackListsByGroups)
        ? relation('generateNearbyTrackList', tracks, contextTrack, [])
        : null),

    contentHeading:
      relation('generateContentHeading'),

    groupLinks:
      query.groupingGroups
        .map(groups => groups
          .map(group => relation('linkGroup', group))),

    groupedTrackLists:
      query.groupedTracks
        .map(tracks => relation('generateNearbyTrackList', tracks, contextTrack, [])),

    ungroupedTrackList:
      (empty(query.ungroupedTracks)
        ? null
        : relation('generateNearbyTrackList', query.ungroupedTracks, contextTrack, [])),
  }),

  data: (query, _sprawl, _tracks) => ({
    groupNames:
      query.groupingGroups
        .map(groups => groups
          .map(group => group.name)),
  }),

  slots: {
    headingString: {
      type: 'string',
    },
  },

  generate: (data, relations, slots, {html, language}) =>
    relations.flatList ??

    html.tag('dl', {class: 'division-list'},
      {[html.onlyIfContent]: true},

      language.encapsulate('trackList', listCapsule => [
        stitchArrays({
          groupNames: data.groupNames,
          groupLinks: relations.groupLinks,
          trackList: relations.groupedTrackLists,
        }).map(({
            groupNames,
            groupLinks,
            trackList,
          }) => [
            language.encapsulate(listCapsule, 'fromGroup', capsule => {
              const title =
                language.$(capsule, {
                  group:
                    language.formatConjunctionList(
                      groupLinks.map(link => link.slot('color', false))),
                });

              if (slots.headingString) {
                return relations.contentHeading.clone().slots({
                  tag: 'dt',
                  title,
                  stickyTitle:
                    language.$(slots.headingString, 'sticky', 'fromGroup', {
                      group:
                        language.formatConjunctionList(groupNames),
                    }),
                });
              } else {
                return html.tag('dt', title);
              }
            }),

            html.tag('dd', trackList),
          ]),

        relations.ungroupedTrackList && [
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

          html.tag('dd', relations.ungroupedTrackList),
        ],
      ])),
};
