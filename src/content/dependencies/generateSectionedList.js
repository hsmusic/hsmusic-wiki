import {stitchArrays} from '#sugar';

export default {
  extraDependencies: ['html'],

  slots: {
    class: {validate: v => v.oneOf(v.isString, v.sparseArrayOf(v.isString))},
    sectionTitles: {validate: v => v.strictArrayOf(v.isHTML)},
    sectionItems: {validate: v => v.strictArrayOf(v.isHTML)},

    collapseSections: {
      validate: v => v.is('bar', 'invisible'),
    },
  },

  generate: (slots, {html}) =>
    (slots.collapseSections === 'bar'
      ? html.tag('ul', {class: slots.class},
          slots.sectionItems.map((items, index, {length}) => [
            items
              .map(item => html.tag('li', item)),

            index < length - 1 &&
              html.tag('li', {role: 'separator'},
                html.tag('hr')),
          ]))
   : slots.collapseSections === 'invisible'
      ? html.tag('ul', {class: slots.class},
          slots.sectionItems
            .flat()
            .map(item => html.tag('li', item)))
      : html.tag('dl', {class: slots.class},
          stitchArrays({
            title: slots.sectionTitles,
            items: slots.sectionItems,
          }).map(({title, items}) => [
              html.tag('dt', title),
              html.tag('dd',
                html.tag('ul',
                  items.map(item => html.tag('li', item)))),
            ]))),
};
