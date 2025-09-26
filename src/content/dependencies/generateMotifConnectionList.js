import {sortMotifConnectionsChronologically} from '#sort';

export default {
  relations: (relation, connections, context) => ({
    items:
      sortMotifConnectionsChronologically(connections.slice())
        .map(connection =>
          relation('generateMotifConnectionListItem', connection, context)),
  }),

  generate: (relations, {html}) =>
    html.tag('ul',
      {[html.onlyIfContent]: true},

      relations.items),
};
