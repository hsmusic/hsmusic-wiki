export default {
  contentDependencies: ['generatePreviousNextLink'],

  relations: (relation) => ({
    link:
      relation('generatePreviousNextLink'),
  }),

  generate: (relations) =>
    relations.link.slots({
      direction: 'previous',
    }),
};
