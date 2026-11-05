export default {
  relations: (relation, category) => ({
    link:
      relation('linkGroup', category.groups[0]),
  }),

  data: (category) => ({
    name: category.name,
    color: category.color,
  }),

  generate: (data, relations, {language}) =>
    relations.link.slots({
      content: language.sanitize(data.name),
      color: data.color,
    }),
};
