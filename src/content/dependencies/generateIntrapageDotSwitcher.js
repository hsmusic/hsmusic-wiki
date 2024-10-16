import {stitchArrays} from '#sugar';

export default {
  contentDependencies: ['generateDotSwitcherTemplate'],
  extraDependencies: ['html', 'language'],

  relations: (relation) => ({
    template:
      relation('generateDotSwitcherTemplate'),
  }),

  slots: {
    attributes: {
      type: 'attributes',
      mutable: false,
    },

    initialOptionIndex: {type: 'number'},

    titles: {
      validate: v => v.strictArrayOf(v.isHTML),
    },

    targetIDs: {
      validate: v => v.strictArrayOf(v.isString),
    },
  },

  generate: (relations, slots, {html, language}) =>
    relations.template.slots({
      attributes: [
        {class: 'intrapage'},
        slots.attributes,
      ],

      initialOptionIndex: slots.initialOptionIndex,

      options:
        stitchArrays({
          title: slots.titles,
          targetID: slots.targetIDs,
        }).map(({title, targetID}) =>
            html.tag('a', {href: '#'},
              {'data-target-id': targetID},
              language.sanitize(title))),
    }),
};
