import {empty} from '#sugar';

export default {
  contentDependencies: [
    'linkArtist',
    'linkArtistGallery',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({wikiInfo}) {
    return {
      enableListings: wikiInfo.enableListings,
    };
  },

  relations(relation, sprawl, artist) {
    const relations = {};

    relations.artistMainLink =
      relation('linkArtist', artist);

    relations.artistInfoLink =
      relation('linkArtist', artist);

    if (
      !empty(artist.albumsAsCoverArtist) ||
      !empty(artist.tracksAsCoverArtist)
    ) {
      relations.artistGalleryLink =
        relation('linkArtistGallery', artist);
    }

    return relations;
  },

  data(sprawl) {
    return {
      enableListings: sprawl.enableListings,
    };
  },

  slots: {
    showExtraLinks: {type: 'boolean', default: false},

    currentExtra: {
      validate: v => v.is('gallery'),
    },
  },

  generate(data, relations, slots, {html, language}) {
    const infoLink =
      relations.artistInfoLink?.slots({
        attributes: {class: slots.currentExtra === null && 'current'},
        content: language.$('misc.nav.info'),
      });

    const {content: extraLinks = []} =
      slots.showExtraLinks &&
        {content: [
          relations.artistGalleryLink?.slots({
            attributes: {class: slots.currentExtra === 'gallery' && 'current'},
            content: language.$('misc.nav.gallery'),
          }),
        ]};

    const mostAccentLinks = [
      ...extraLinks,
    ].filter(Boolean);

    // Don't show the info accent link all on its own.
    const allAccentLinks =
      (empty(mostAccentLinks)
        ? []
        : [infoLink, ...mostAccentLinks]);

    const accent =
      (empty(allAccentLinks)
        ? html.blank()
        : `(${language.formatUnitList(allAccentLinks)})`);

    return [
      {auto: 'home'},

      {
        accent,
        html:
          language.$('artistPage.nav.artist', {
            artist: relations.artistMainLink,
          }),
      },
    ];
  },
};
