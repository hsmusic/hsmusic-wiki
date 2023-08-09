export default {
  contentDependencies: ['linkTemplate'],

  relations: (relation) =>
    ({link: relation('linkTemplate')}),

  data: (path) =>
    ({path}),

  generate: (data, relations) =>
    relations.link
      .slot('path', ['localized.path', data.path]),
};
