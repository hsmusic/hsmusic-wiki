export default {
  extraDependencies: [
    'getColors',
  ],

  data(color) {
    return {color};
  },

  generate(data, {
    getColors,
  }) {
    if (!data.color) return '';

    const {
      primary,
      dark,
      dim,
      dimGhost,
      bg,
      bgBlack,
      shadow,
    } = getColors(data.color);

    const variables = [
      `--primary-color: ${primary}`,
      `--dark-color: ${dark}`,
      `--dim-color: ${dim}`,
      `--dim-ghost-color: ${dimGhost}`,
      `--bg-color: ${bg}`,
      `--bg-black-color: ${bgBlack}`,
      `--shadow-color: ${shadow}`,
    ];

    return [
      `:root {`,
      ...variables.map((line) => `    ${line};`),
      `}`,
    ].join('\n');
  },
};
