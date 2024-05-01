export default {
  extraDependencies: ['html', 'getColors'],

  slots: {
    color: {
      validate: v => v.isColor,
    },

    context: {
      validate: v => v.is(
        'any-content',
        'image-box',
        'page-root',
        'image-box',
        'primary-only'),

      default: 'any-content',
    },

    mode: {
      validate: v => v.is('style', 'property-list'),
      default: 'style',
    },
  },

  generate(slots, {getColors}) {
    if (!slots.color) return [];

    const {
      primary,
      dark,
      dim,
      deep,
      deepGhost,
      lightGhost,
      bg,
      bgBlack,
      shadow,
    } = getColors(slots.color);

    let anyContent = [
      `--primary-color: ${primary}`,
      `--dark-color: ${dark}`,
      `--dim-color: ${dim}`,
      `--deep-color: ${deep}`,
      `--deep-ghost-color: ${deepGhost}`,
      `--light-ghost-color: ${lightGhost}`,
      `--bg-color: ${bg}`,
      `--bg-black-color: ${bgBlack}`,
      `--shadow-color: ${shadow}`,
    ];

    let selectedProperties;

    switch (slots.context) {
      case 'any-content':
        selectedProperties = anyContent;
        break;

      case 'image-box':
        selectedProperties = [
          `--primary-color: ${primary}`,
          `--dim-color: ${dim}`,
          `--deep-color: ${deep}`,
          `--bg-black-color: ${bgBlack}`,
        ];
        break;

      case 'page-root':
        selectedProperties = [
          ...anyContent,
          `--page-primary-color: ${primary}`,
        ];
        break;

      case 'primary-only':
        selectedProperties = [
          `--primary-color: ${primary}`,
        ];
        break;
    }

    switch (slots.mode) {
      case 'style':
        return selectedProperties.join('; ');

      case 'property-list':
        return selectedProperties;
    }
  },
};
