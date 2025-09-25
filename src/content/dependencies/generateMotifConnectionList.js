export default {
  relations: (relation, connections, context) => ({
    items:
      connections.map(connection =>
        relation('generateMotifConnectionListItem', connection, context)),
  }),

  generate: (relations, {html}) =>
    html.tag('ul',
      {[html.onlyIfContent]: true},

      relations.items),
};
