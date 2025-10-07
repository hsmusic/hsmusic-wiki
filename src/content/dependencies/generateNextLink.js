export default {
  relations: (relation) => ({
    link:
      relation('generatePreviousNextLink'),
  }),

  generate: (relations) =>
    relations.link.slots({
      direction: 'next',
    }),
};
