import {empty} from '#sugar';

const indent = text =>
  text
    .split('\n')
    .map(line => ' '.repeat(4) + line)
    .join('\n');

export default {
  extraDependencies: ['html'],

  slots: {
    attributes: {
      type: 'attributes',
      mutable: false,
    },

    rules: {
      validate: v =>
        v.looseArrayOf(
          v.validateProperties({
            select: v.isString,
            declare: v.looseArrayOf(v.isString),
          })),
    },
  },

  generate: (slots, {html}) =>
    html.tag('style', slots.attributes,
      {[html.onlyIfContent]: true},

      slots.rules
        .filter(Boolean)

        .map(rule => ({
          select: rule.select,
          declare: rule.declare.filter(Boolean),
        }))

        .filter(rule => !empty(rule.declare))

        .map(rule =>
          `${rule.select} {\n` +
          indent(rule.declare.join('\n')) + '\n' +
          `}`)

        .join('\n\n')),
};
