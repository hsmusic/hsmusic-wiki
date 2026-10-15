import {empty} from '#sugar';

export default {
  relations: (relation) => ({
    colorAttribute:
      relation('generateColorStyleAttribute'),
  }),

  slots: {
    mode: {
      validate: v => v.is('main', 'sub'),
      default: 'main',
    },

    path: {
      validate: v => v.validateArrayItems(v.isString),
    },

    dimensions: {
      validate: v => v.isDimensions,
    },

    color: {
      validate: v => v.isColor,
    },

    alt: {
      type: 'string',
    },

    attributes: {
      type: 'attributes',
      mutable: false,
    },
  },

  generate(relations, slots, {html, to}) {
    if (empty(slots.path)) {
      return html.blank();
    }

    return html.tag('div', {id: 'banner'},
      slots.attributes,

      slots.mode === 'sub' && [
        {class: ['dim', 'short']},

        slots.color &&
          relations.colorAttribute.slots({
            color: slots.color,
            context: 'banner',
          }),
      ],

      html.tag('img',
        {src: to(...slots.path)},

        (slots.dimensions
          ? {width: slots.dimensions[0]}
          : {width: 1100}),

        (slots.dimensions
          ? {height: slots.dimensions[1]}
          : {height: 200}),

        slots.alt &&
          {alt: slots.alt}));
  },
};
