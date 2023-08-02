export default {
  extraDependencies: ['html', 'getColors'],

  slots: {
    color: {validate: v => v.isColor},
  },

  generate(slots, {getColors}) {
    if (!slots.color) return [];

    const {
      primary,
      dark,
      dim,
      dimGhost,
      bg,
      bgBlack,
      shadow,
    } = getColors(slots.color);

    return [
      `--primary-color: ${primary}`,
      `--dark-color: ${dark}`,
      `--dim-color: ${dim}`,
      `--dim-ghost-color: ${dimGhost}`,
      `--bg-color: ${bg}`,
      `--bg-black-color: ${bgBlack}`,
      `--shadow-color: ${shadow}`,
    ].join('; ');
  },
};
