import {empty, stitchArrays} from '#sugar';
import {chunkByDivisions, chunkByDivisionRuns} from '#wiki-data';

export default {
  sprawl: ({wikiInfo}) => ({
    divideMusicBy:
      wikiInfo.divideMusicBy,
  }),

  query(sprawl, tracks, contextTrack) {
    const wikiDivisions = sprawl.divideMusicBy;

    const contextDivisions =
      contextTrack.groups
        .filter(group => !wikiDivisions.includes(group))
        .filter(group => group.useForDividingReferenceLists);

    const contextDivisionResults =
      chunkByDivisionRuns(tracks, contextDivisions);

    const contextDivisionExtras =
      (contextDivisionResults.at(-1) &&
       empty(contextDivisionResults.at(-1).divisions)
        ? contextDivisionResults.pop().things
        : []);

    const wikiDivisionResults =
      chunkByDivisions(contextDivisionExtras, wikiDivisions);

    const wikiDivisionExtras =
      (wikiDivisionResults.at(-1) &&
       wikiDivisionResults.at(-1).division === null
        ? wikiDivisionResults.pop().things
        : []);

    const divisions = [
      ...contextDivisionResults.map(({divisions}) => divisions),
      ...wikiDivisionResults.map(({division}) => [division]),
    ];

    const dividedTracks = [
      ...contextDivisionResults.map(({things}) => things),
      ...wikiDivisionResults.map(({things}) => things),
    ];

    const undividedTracks = wikiDivisionExtras;

    return {divisions, dividedTracks, undividedTracks};
  },

  relations: (relation, query, _sprawl, tracks, contextTrack) => ({
    flatList:
      (empty(query.dividedTracks)
        ? relation('generateNearbyTrackList', tracks, contextTrack, [])
        : null),

    contentHeading:
      relation('generateContentHeading'),

    divisionLinks:
      query.divisions
        .map(divisions => divisions
          .map(division => relation('linkAnythingMan', division))),

    dividedTrackLists:
      query.dividedTracks
        .map(tracks => relation('generateNearbyTrackList', tracks, contextTrack, [])),

    undividedTrackList:
      (empty(query.undividedTracks)
        ? null
        : relation('generateNearbyTrackList', query.undividedTracks, contextTrack, [])),
  }),

  data: (query, _sprawl, _tracks) => ({
    divisionNames:
      query.divisions
        .map(divisions => divisions
          .map(division => division.name)),
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
          divisionNames: data.divisionNames,
          divisionLinks: relations.divisionLinks,
          trackList: relations.dividedTrackLists,
        }).map(({
            divisionNames,
            divisionLinks,
            trackList,
          }) => [
            language.encapsulate(listCapsule, 'fromDivision', capsule => {
              const title =
                language.$(capsule, {
                  division:
                    language.formatConjunctionList(
                      divisionLinks.map(link => link.slot('color', false))),
                });

              if (slots.headingString) {
                return relations.contentHeading.cloneWithSlots({
                  tag: 'dt',
                  title,
                  stickyTitle:
                    language.$(slots.headingString, 'sticky.fromDivision', {
                      division:
                        language.formatConjunctionList(divisionNames),
                    }),
                });
              } else {
                return html.tag('dt', title);
              }
            }),

            html.tag('dd', trackList),
          ]),

        html.tags([
          language.encapsulate(listCapsule, 'notFromDivision', capsule =>
            (slots.headingString
              ? relations.contentHeading.cloneWithSlots({
                  tag: 'dt',

                  title:
                    language.$(capsule),

                  stickyTitle:
                    language.$(slots.headingString, 'sticky.notFromDivision'),
                })

              : html.tag('dt', {[html.onlyIfSiblings]: true},
                  language.$(capsule)))),

          html.tag('dd', {[html.onlyIfContent]: true},
            relations.undividedTrackList),
        ]),
      ])),
};
