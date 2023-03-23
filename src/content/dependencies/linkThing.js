import {empty} from '../../util/sugar.js';

export default {
  contentDependencies: [
    'linkTemplate',
  ],

  extraDependencies: [
    'html',
  ],

  relations(relation) {
    return {
      linkTemplate: relation('linkTemplate'),
    };
  },

  data(pathKey, thing) {
    return {
      pathKey,

      color: thing.color,
      directory: thing.directory,

      name: thing.name,
      nameShort: thing.nameShort,
    };
  },

  generate(data, relations, {html}) {
    const path = [data.pathKey, data.directory];

    return html.template(slot =>
      slot('content', ([...content]) =>
      slot('preferShortName', ([preferShortName]) => {
        if (empty(content)) {
          content =
            (preferShortName
              ? data.nameShort ?? data.name
              : data.name);
        }

        return relations.linkTemplate
          .slot('path', path)
          .slot('color', slot('color', data.color))
          .slot('attributes', slot('attributes', {}))
          .slot('hash', slot('hash'))
          .slot('content', content);
      })));
  },
}
