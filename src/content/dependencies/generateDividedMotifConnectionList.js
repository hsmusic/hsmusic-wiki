import {empty, stitchArrays} from '#sugar';
import {sortMotifConnectionsChronologically} from '#sort';
import {chunkByDivisions} from '#wiki-data';

export default {
  slots: {
    headingString: {
      type: 'string',
    },
  },

  sprawl: ({wikiInfo}) => ({
    divideMusicBy:
      wikiInfo.divideMusicBy,
  }),

  query(sprawl, motifConnections) {
    const wikiDivisions = sprawl.divideMusicBy;

    const wikiDivisionResults =
      chunkByDivisions(motifConnections, wikiDivisions, {
        getDivisions: connection =>
          connection.track.divisions,
      });

    const undividedConnections =
      (wikiDivisionResults.at(-1) &&
       wikiDivisionResults.at(-1).division === null
        ? wikiDivisionResults.pop().things
        : []);

    const divisions =
      wikiDivisionResults.map(({division}) => division);

    const dividedConnections =
      wikiDivisionResults.map(({things}) => things);

    return {divisions, dividedConnections, undividedConnections};
  },

  relations: (relation, query, sprawl, connections, context) => ({
    items:
      sortMotifConnectionsChronologically(connections)
        .map(connection =>
          relation('generateMotifConnectionListItem', connection, context)),

    contentHeading:
      relation('generateContentHeading'),

    divisionLinks:
      query.divisions
        .map(division => relation('linkAnythingMan', division)),

    dividedConnectionLists:
      query.dividedConnections
        .map(connections =>
          relation('generateMotifConnectionList', connections, context)),

    undividedConnectionList:
      (empty(query.undividedConnections)
        ? null
        : relation('generateMotifConnectionList', query.undividedConnections, context)),
  }),

  data: (query, _sprawl, _connections, _context) => ({
    divisionNames:
      query.divisions
        .map(division => division.name),
  }),

  generate: (data, relations, slots, {html, language}) =>
    relations.flatList ??

    html.tag('dl', {class: 'division-list'},
      {[html.onlyIfContent]: true},

      language.encapsulate('trackList', listCapsule => [
        stitchArrays({
          divisionName: data.divisionNames,
          divisionLink: relations.divisionLinks,
          connectionList: relations.dividedConnectionLists,
        }).map(({
            divisionName,
            divisionLink,
            connectionList,
          }) => [
            language.encapsulate(listCapsule, 'fromDivision', capsule =>
              (slots.headingString
                ? relations.contentHeading.clone().slots({
                    tag: 'dt',

                    title:
                      language.$(capsule, {division: divisionLink}),

                    stickyTitle:
                      language.$(slots.headingString, 'sticky.fromDivision',
                        {division: divisionName}),
                  })

                : html.tag('dt',
                    language.$(capsule, {division: divisionLink})))),

            html.tag('dd', connectionList),
          ]),

        html.tags([
          language.encapsulate(listCapsule, 'notFromDivision', capsule =>
            (slots.headingString
              ? relations.contentHeading.clone().slots({
                  tag: 'dt',

                  title:
                    language.$(capsule),

                  stickyTitle:
                    language.$(slots.headingString, 'sticky.notFromDivision'),
                })

              : html.tag('dt', {[html.onlyIfSiblings]: true},
                  language.$(capsule)))),

          html.tag('dd', {[html.onlyIfContent]: true},
            relations.undividedConnectionList),
        ]),
      ]))
};
