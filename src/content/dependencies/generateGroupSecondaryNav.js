export default {
  relations: (relation, group) => ({
    secondaryNav:
      relation('generateSecondaryNav'),

    categoryPart:
      relation('generateGroupSecondaryNavCategoryPart', group.category, group),
  }),

  generate: (relations) =>
    relations.secondaryNav.slots({
      attributes: {class: 'nav-links-groups'},
      content: relations.categoryPart,
    }),
};
