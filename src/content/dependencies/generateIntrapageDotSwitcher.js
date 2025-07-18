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
        }).map(({title, targetID}) => {
            const {content} = html.smush(title);

            const customCue =
              content.find(item =>
                item?.tagName === 'span' &&
                item.attributes.has('class', 'dot-switcher-interaction-cue'));

            const cue =
              (customCue && !html.isBlank(customCue)
                ? customCue.content
                : language.sanitize(title));

            const a =
              html.tag('a', {href: '#'},
                {'data-target-id': targetID},
                {[html.onlyIfContent]: true},

                cue);

            if (customCue) {
              content.splice(content.indexOf(customCue), 1, a);
              return html.tags(content, {[html.joinChildren]: ''});
            } else {
              return a;
            }
          }),
    }),
};
