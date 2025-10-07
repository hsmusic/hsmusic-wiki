export default {
  generate: ({html, language}) =>
    html.tag('p', {class: 'quick-info'},
      language.$('albumGalleryPage.noTrackArtworksLine')),
};
