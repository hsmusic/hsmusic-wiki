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

    showWithoutLink: {
      type: 'boolean',
      default: true,
    },
  },

  generate(slots, {html, language}) {
    if (!slots.direction) {
      return html.blank();
    }

    const attributes = html.attributes();

    if (slots.id) {
      attributes.set('id', `${slots.direction}-button`);
    }

    if (html.isBlank(slots.link)) {
      if (slots.showWithoutLink) {
        return (
          html.tag('a', {class: 'inert-previous-next-link'},
            attributes,
            language.$('misc.nav', slots.direction)));
      } else {
        return html.blank();
      }
    }

    return slots.link.slots({
      tooltipStyle: 'browser',
      color: false,
      attributes,

      content:
        language.$('misc.nav', slots.direction),
    });
  },
};
