export default {
  contentDependencies: [
    'generateSecondaryNav',
    'generateGroupSecondaryNavCategoryPart',
  ],

  relations: (relation, group) => ({
    secondaryNav:
      relation('generateSecondaryNav'),

    categoryPart:
      relation('generateGroupSecondaryNavCategoryPart', group.category, group),
  }),

  generate: (relations) =>
    relations.secondaryNav.slots({
      class: 'nav-links-groups',
      content: relations.categoryPart,
    }),
};
