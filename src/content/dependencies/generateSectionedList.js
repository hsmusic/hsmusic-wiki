import {stitchArrays} from '#sugar';

export default {
  extraDependencies: ['html'],

  slots: {
    class: {
      validate: v =>
        v.oneOf(
          v.isString,
          v.sparseArrayOf(v.isString)),
    },

    sectionTitles: {
      validate: v =>
        v.strictArrayOf(v.isHTML),
    },

    sectionItems: {
      validate: v =>
        v.strictArrayOf(
          v.strictArrayOf(v.isHTML)),
    },

    sectionItemClasses: {
      validate: v =>
        v.strictArrayOf(
          v.strictArrayOf(
            v.optional(v.isString))),
    },

    collapseSections: {
      validate: v => v.is('bar', 'invisible'),
    },
  },

  generate(slots, {html}) {
    const listItems =
      stitchArrays({
        items: slots.sectionItems,
        itemClasses:
          slots.sectionItemClasses ??
            Array.from({length: slots.sectionItems.length}, () => null),
      }).map(({items, itemClasses}) =>
          stitchArrays({
            item: items,
            itemClass:
              itemClasses ??
                Array.from({length: items.length}, () => null),
          }).map(({item, itemClass}) =>
              html.tag('li', {class: itemClass}, item)));

    switch (slots.collapseSections) {
      case 'bar':
        return (
          html.tag('ul', {class: slots.class},
            listItems.map((items, index, {length}) => [
              items,
              index < length - 1 &&
                html.tag('li', {role: 'separator'},
                  html.tag('hr')),
            ])));

      case 'invisible':
        return (
          html.tag('ul', {class: slots.class}, listItems));

      default:
        return (
          html.tag('dl', {class: slots.class},
            stitchArrays({
              title: slots.sectionTitles,
              items: listItems,
            }).map(({title, items}) => [
                html.tag('dt', title),
                html.tag('dd',
                  html.tag('ul', items)),
              ])));
    }
  },
};
