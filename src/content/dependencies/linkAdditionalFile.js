export default {
  query: (file, filename) => ({
    index:
      file.filenames.indexOf(filename),
  }),

  relations: (relation, _query, _file, _filename) => ({
    linkTemplate:
      relation('linkTemplate'),
  }),

  data: (query, file, filename) => ({
    filename,

    // Kinda jank, but eh.
    path:
      (query.index >= 0
        ? file.paths.at(query.index)
        : null),
  }),

  generate: (data, relations) =>
    relations.linkTemplate.slots({
      path: data.path,
      content: data.filename,
    }),
};
