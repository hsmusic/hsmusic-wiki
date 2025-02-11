export default {
  contentDependencies: ['generateGridActionLinks', 'transformContent'],

  relations: (relation, row) => ({
    template:
      relation('generateGridActionLinks'),

    links:
      row.actionLinks
        .map(content => relation('transformContent', content)),
  }),

  generate: (relations) =>
    relations.template.slots({
      actionLinks:
        relations.links
          .map(contents =>
            contents
              .slot('mode', 'single-link')
              .content),
    }),
};
