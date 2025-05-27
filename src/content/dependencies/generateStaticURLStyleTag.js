export default {
  extraDependencies: ['html', 'to'],

  generate: ({html, to}) =>
    html.tag('style', {class: 'static-url-style'},
      `.image-media-link::after {\n` +
      `    mask-image: url("${to('staticMisc.path', 'image.svg')}");\n` +
      `}`),
};
