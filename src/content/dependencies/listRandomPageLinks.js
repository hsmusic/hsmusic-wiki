export default {
  contentDependencies: ['generateListingPage'],
  extraDependencies: ['html', 'wikiData'],

  sprawl() {
    return {};
  },

  query(sprawl, spec) {
    return {
      spec,
    };
  },

  relations(relation, query) {
    return {
      page: relation('generateListingPage', query.spec),
    };
  },

  generate(relations, {html}) {
    return relations.page.slots({
      type: 'custom',
      content:
        html.tag('p', `Alright alright, this is a stub page! Coming soon!`),
    });
  },
};
