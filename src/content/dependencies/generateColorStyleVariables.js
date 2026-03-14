export default {
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
        'banner',
        'primary-only'),

      default: 'any-content',
    },

    mode: {
      validate: v => v.is('style', 'declarations'),
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
      abyss,
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
      `--abyss-color: ${abyss}`,
      `--light-ghost-color: ${lightGhost}`,
      `--bg-color: ${bg}`,
      `--bg-black-color: ${bgBlack}`,
      `--shadow-color: ${shadow}`,
    ];

    let selectedDeclarations = [];

    switch (slots.context) {
      case 'any-content':
        selectedDeclarations = anyContent;
        break;

      case 'image-box':
        selectedDeclarations = [
          `--primary-color: ${primary}`,
          `--dim-color: ${dim}`,
          `--deep-color: ${deep}`,
          `--bg-black-color: ${bgBlack}`,
        ];
        break;

      case 'page-root':
        selectedDeclarations = [
          ...anyContent,
          `--page-primary-color: ${primary}`,
        ];
        break;

      case 'primary-only':
        selectedDeclarations = [
          `--primary-color: ${primary}`,
        ];
        break;

      case 'banner':
        selectedDeclarations = [
          `--abyss-color: ${abyss}`,
        ];
        break;
    }

    switch (slots.mode) {
      case 'style':
        return selectedDeclarations.join('; ');

      case 'declarations':
        return selectedDeclarations.map(declaration => declaration + ';');
    }
  },
};
