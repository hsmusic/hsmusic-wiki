export default {
  extraDependencies: ['html', 'language'],

  generate: ({html, language}) =>
    html.tag('p', {class: 'quick-info'},
      language.$('albumGalleryPage.noTrackArtworksLine')),
};
