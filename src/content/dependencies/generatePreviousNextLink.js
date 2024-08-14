export default {
  extraDependencies: ['html', 'language'],

  slots: {
    link: {
      type: 'html',
      mutable: true,
    },

    direction: {
      validate: v => v.is('previous', 'next'),
    },

    id: {
      type: 'boolean',
      default: true,
    },
  },

  generate: (slots, {html, language}) =>
    (html.isBlank(slots.link) || !slots.direction
      ? html.blank()
      : slots.link.slots({
          tooltipStyle: 'browser',
          color: false,

          attributes:
            (slots.id
              ? {id: `${slots.direction}-button`}
              : null),

          content:
            language.$('misc.nav', slots.direction),
        })),
};
