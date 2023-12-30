import {empty} from '#sugar';

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

    relations.albumGalleryLink =
      relation('linkAlbumGallery', album);

    if (album.commentary || album.tracks.some(t => t.commentary)) {
      relations.albumCommentaryLink =
        relation('linkAlbumCommentary', album);
    }

    return relations;
  },

  data(album, track) {
    return {
      hasMultipleTracks: album.tracks.length > 1,
      galleryIsStub: album.tracks.every(t => !t.hasUniqueCoverArt),
      isTrackPage: !!track,
    };
  },

  slots: {
    showTrackNavigation: {type: 'boolean', default: false},
    showExtraLinks: {type: 'boolean', default: false},

    currentExtra: {
      validate: v => v.is('gallery', 'commentary'),
    },
  },

  generate(data, relations, slots, {html, language}) {
    const {content: extraLinks = []} =
      slots.showExtraLinks &&
        {content: [
          (!data.galleryIsStub || slots.currentExtra === 'gallery') &&
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
          {id: 'random-button'},
          {href: '#', 'data-random': 'track-in-sidebar'},

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

    return `(${language.formatUnitList(allLinks)})`;
  },
};
