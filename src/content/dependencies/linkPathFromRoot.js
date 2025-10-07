export default {
  relations: (relation) =>
    ({link: relation('linkTemplate')}),

  data: (path) =>
    ({path}),

  generate: (data, relations) =>
    relations.link
      .slot('path', ['shared.path', data.path]),
};
