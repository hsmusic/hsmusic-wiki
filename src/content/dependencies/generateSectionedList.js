import {stitchArrays} from '#sugar';

export default {
  extraDependencies: ['html'],

  slots: {
    class: {validate: v => v.oneOf(v.isString, v.sparseArrayOf(v.isString))},
    sectionTitles: {validate: v => v.strictArrayOf(v.isHTML)},
    sectionItems: {validate: v => v.strictArrayOf(v.isHTML)},
  },

  generate: (slots, {html}) =>
    html.tag('dl', {class: slots.class},
      stitchArrays({
        title: slots.sectionTitles,
        items: slots.sectionItems,
      }).map(({title, items}) => [
          html.tag('dt', title),
          html.tag('dd',
            html.tag('ul',
              items
                .map(item => html.tag('li', item)))),
        ])),
};
