import {stitchArrays} from '#sugar';

export default {
  contentDependencies: ['transformContent'],
  extraDependencies: ['html', 'language'],

  relations: (relation, additionalNames) => ({
    names:
      additionalNames.map(({name}) =>
        relation('transformContent', name)),

    annotations:
      additionalNames.map(({annotation}) =>
        (annotation
          ? relation('transformContent', annotation)
          : null)),
  }),

  generate: (relations, {html, language}) => {
    const names =
      relations.names.map(name =>
        html.tag('span', {class: 'additional-name'},
          name.slot('mode', 'inline')));

    const annotations =
      relations.annotations.map(annotation =>
        (annotation
          ? html.tag('span', {class: 'annotation'},
              language.$('misc.additionalNames.item.annotation', {
                annotation:
                  annotation.slot('mode', 'inline'),
              }))
          : null));

    return html.tag('div', {id: 'additional-names-box'}, [
      html.tag('p',
        language.$('misc.additionalNames.title')),

      html.tag('ul',
        stitchArrays({name: names, annotation: annotations})
          .map(({name, annotation}) =>
            html.tag('li',
              (annotation
                ? language.$('misc.additionalNames.item.withAnnotation', {name, annotation})
                : language.$('misc.additionalNames.item', {name}))))),
    ]);
  },
};
