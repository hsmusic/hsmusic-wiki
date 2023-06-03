import {empty} from '../../util/sugar.js';

export default {
  contentDependencies: [
    'generatePreviousNextLinks',
    'linkTrack',
    'linkAlbumCommentary',
    'linkAlbumGallery',
  ],

  extraDependencies: ['html', 'language'],

  relations(relation, album, track) {
    const relations = {};

    relations.previousNextLinks =
      relation('generatePreviousNextLinks');

    relations.previousTrackLink = null;
    relations.nextTrackLink = null;

    if (track) {
      const index = album.tracks.indexOf(track);

      if (index > 0) {
        relations.previousTrackLink =
          relation('linkTrack', album.tracks[index - 1]);
      }

      if (index < album.tracks.length - 1) {
        relations.nextTrackLink =
          relation('linkTrack', album.tracks[index + 1]);
      }
    }

    if (album.tracks.some(t => t.hasUniqueCoverArt)) {
      relations.albumGalleryLink =
        relation('linkAlbumGallery', album);
    }

    if (album.commentary || album.tracks.some(t => t.commentary)) {
      relations.albumCommentaryLink =
        relation('linkAlbumCommentary', album);
    }

    return relations;
  },

  data(album, track) {
    return {
      hasMultipleTracks: album.tracks.length > 1,
      isTrackPage: !!track,
    };
  },

  generate(data, relations, {html, language}) {
    return html.template({
      annotation: `generateAlbumNavAccent`,

      slots: {
        showTrackNavigation: {type: 'boolean', default: false},
        showExtraLinks: {type: 'boolean', default: false},

        currentExtra: {
          validate: v => v.is('gallery', 'commentary'),
        },
      },

      content(slots) {
        const {content: extraLinks = []} =
          slots.showExtraLinks &&
            {content: [
              relations.albumGalleryLink?.slots({
                attributes: {class: slots.currentExtra === 'gallery' && 'current'},
                content: language.$('albumPage.nav.gallery'),
              }),

              relations.albumCommentaryLink?.slots({
                attributes: {class: slots.currentExtra === 'commentary' && 'current'},
                content: language.$('albumPage.nav.commentary'),
              }),
            ]};

        const {content: previousNextLinks = []} =
          slots.showTrackNavigation &&
          data.isTrackPage &&
          data.hasMultipleTracks &&
            relations.previousNextLinks.slots({
              previousLink: relations.previousTrackLink,
              nextLink: relations.nextTrackLink,
            });

        const randomLink =
          slots.showTrackNavigation &&
          data.hasMultipleTracks &&
            html.tag('a',
              {
                href: '#',
                'data-random': 'track-in-album',
                id: 'random-button',
              },
              (data.isTrackPage
                ? language.$('trackPage.nav.random')
                : language.$('albumPage.nav.randomTrack')));

        const allLinks = [
          ...previousNextLinks,
          ...extraLinks,
          randomLink,
        ].filter(Boolean);

        if (empty(allLinks)) {
          return html.blank();
        }

        return `(${language.formatUnitList(allLinks)})`
      },
    });
  },
};