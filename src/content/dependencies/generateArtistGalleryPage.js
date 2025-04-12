import {sortArtworksChronologically} from '#sort';

export default {
  contentDependencies: [
    'generateArtistNavLinks',
    'generateCoverGrid',
    'generatePageLayout',
    'image',
    'linkAnythingMan',
  ],

  extraDependencies: ['html', 'language'],

  query: (artist) => ({
    artworks:
      sortArtworksChronologically(
        ([
          artist.albumCoverArtistContributions,
          artist.trackCoverArtistContributions,
        ]).flat()
          .filter(contrib => !contrib.annotation?.startsWith(`edits for wiki`))
          .map(contrib => contrib.thing),
        {latestFirst: true}),
  }),

  relations: (relation, query, artist) => ({
    layout:
      relation('generatePageLayout'),

    artistNavLinks:
      relation('generateArtistNavLinks', artist),

    coverGrid:
      relation('generateCoverGrid'),

    links:
      query.artworks
        .map(artwork => relation('linkAnythingMan', artwork.thing)),

    images:
      query.artworks
        .map(artwork => relation('image', artwork)),
  }),

  data: (query, artist) => ({
    name:
      artist.name,

    numArtworks:
      query.artworks.length,

    names:
      query.artworks
        .map(artwork => artwork.thing.name),

    otherCoverArtists:
      query.artworks
        .map(artwork => artwork.artistContribs
          .filter(contrib => contrib.artist !== artist)
          .map(contrib => contrib.artist.name)),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('artistGalleryPage', pageCapsule =>
      relations.layout.slots({
        title:
          language.$(pageCapsule, 'title', {
            artist: data.name,
          }),

        headingMode: 'static',

        mainClasses: ['top-index'],
        mainContent: [
          html.tag('p', {class: 'quick-info'},
            language.$(pageCapsule, 'infoLine', {
              coverArts:
                language.countArtworks(data.numArtworks, {
                  unit: true,
                }),
            })),

          relations.coverGrid
            .slots({
              links: relations.links,
              names: data.names,
              images: relations.images,

              info:
                data.otherCoverArtists.map(names =>
                  language.$('misc.coverGrid.details.otherCoverArtists', {
                    [language.onlyIfOptions]: ['artists'],

                    artists: language.formatUnitList(names),
                  })),
            }),
        ],

        navLinkStyle: 'hierarchical',
        navLinks:
          relations.artistNavLinks
            .slots({
              showExtraLinks: true,
              currentExtra: 'gallery',
            })
            .content,
      })),
}
