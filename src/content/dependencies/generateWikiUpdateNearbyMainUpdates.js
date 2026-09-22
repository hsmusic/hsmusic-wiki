export default {
  relations: (relation, update) => ({
    previousUpdateRow:
      (update.previousMainUpdate
        ? relation('generateWikiUpdateNearbyMainUpdateRow',
            update.previousMainUpdate,
            update)
        : null),

    nextUpdateRow:
      (update.nextMainUpdate
        ? relation('generateWikiUpdateNearbyMainUpdateRow',
            update.nextMainUpdate,
            update)
        : null),
  }),

  generate: (relations, {html}) =>
    html.tag('ul', {class: 'nearby-main-updates'},
      {class: 'offset-tooltips'},

      relations.nextUpdateRow?.slot('string', 'next'),
      relations.previousUpdateRow?.slot('string', 'previous')),
};
