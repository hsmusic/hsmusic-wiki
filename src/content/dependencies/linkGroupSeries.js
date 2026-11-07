export default {
  relations: (relation, series) => ({
    link:
      relation('linkGroup', series.group),
  }),

  data: (series) => ({
    name: series.name,
  }),

  generate: (data, relations, {language}) =>
    relations.link.slots({
      attributes: {class: 'series'},
      content: language.sanitize(data.name),
    }),
};
