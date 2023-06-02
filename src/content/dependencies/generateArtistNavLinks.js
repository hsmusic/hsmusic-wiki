import {empty} from '../../util/sugar.js';

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

  generate(data, relations, {html, language}) {
    return html.template({
      annotation: `generateArtistNav`,
      slots: {
        showExtraLinks: {type: 'boolean', default: false},

        currentExtra: {
          validate: v => v.is('gallery'),
        },
      },

      content(slots) {
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
          data.enableListings &&
            {
              path: ['localized.listingIndex'],
              title: language.$('listingIndex.title'),
            },
          {auto: 'current', accent},
        ];
      },
    });
  },
};
