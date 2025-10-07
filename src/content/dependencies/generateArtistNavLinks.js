import {empty} from '#sugar';

export default {
  sprawl: ({wikiInfo}) => ({
    enableListings:
      wikiInfo.enableListings,
  }),

  query: (_sprawl, artist) => ({
    hasGallery:
      !empty(artist.albumCoverArtistContributions) ||
      !empty(artist.trackCoverArtistContributions),
  }),

  relations: (relation, query, _sprawl, artist) => ({
    switcher:
      relation('generateInterpageDotSwitcher'),

    artistMainLink:
      relation('linkArtist', artist),

    artistInfoLink:
      relation('linkArtist', artist),

    artistGalleryLink:
      (query.hasGallery
        ? relation('linkArtistGallery', artist)
        : null),

    artistRollingWindowLink:
      relation('linkArtistRollingWindow', artist),
  }),

  data: (_query, sprawl) => ({
    enableListings:
      sprawl.enableListings,
  }),

  slots: {
    showExtraLinks: {type: 'boolean', default: false},

    currentExtra: {
      validate: v => v.is('gallery', 'rolling-window'),
    },
  },

  generate: (data, relations, slots, {html, language}) => [
    {auto: 'home'},

    data.enableListings &&
      {
        path: ['localized.listingIndex'],
        title: language.$('listingIndex.title'),
      },

    {
      html:
        language.$('artistPage.nav.artist', {
          artist: relations.artistMainLink,
        }),

      accent:
        relations.switcher.slots({
          links: [
            relations.artistInfoLink.slots({
              attributes: [
                slots.currentExtra === null &&
                  {class: 'current'},

                {[html.onlyIfSiblings]: true},
              ],

              content: language.$('misc.nav.info'),
            }),

            slots.showExtraLinks &&
            slots.currentExtra !== 'rolling-window' &&
              relations.artistGalleryLink?.slots({
                attributes: [
                  slots.currentExtra === 'gallery' &&
                    {class: 'current'},
                ],

                content: language.$('misc.nav.gallery'),
              }),

            slots.currentExtra === 'rolling-window' &&
              relations.artistRollingWindowLink.slots({
                attributes: {class: 'current'},
                content: language.$('misc.nav.rollingWindow'),
              }),
          ],
        }),
    },
  ],
};
