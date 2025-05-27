export default {
  extraDependencies: ['html', 'to', 'wikiData'],

  sprawl: ({wikiInfo}) => ({
    wikiWallpaperFileExtension: wikiInfo.wikiWallpaperFileExtension,
  }),

  data: (sprawl) => ({
    path: [
      'media.path',
      'bg.' + sprawl.wikiWallpaperFileExtension,
    ],
  }),

  generate: (data, {html, to}) =>
    html.tag('style', {class: 'wiki-wallpaper-style'},
      `body::before {\n` +
      `    background-image: url("${to(...data.path)}");\n` +
      `}`),
};
