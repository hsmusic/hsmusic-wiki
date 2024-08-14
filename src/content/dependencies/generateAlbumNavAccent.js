import {atOffset} from '#sugar';

export default {
  contentDependencies: [
    'generateInterpageDotSwitcher',
    'generateNextLink',
    'generatePreviousLink',
    'linkTrack',
    'linkAlbumCommentary',
    'linkAlbumGallery',
  ],

  extraDependencies: ['html', 'language'],

  query(album, track) {
    const query = {};

    const index =
      (track
        ? album.tracks.indexOf(track)
        : null);

    query.previousTrack =
      (track
        ? atOffset(album.tracks, index, -1)
        : null);

    query.nextTrack =
      (track
        ? atOffset(album.tracks, index, +1)
        : null);

    query.albumHasAnyCommentary =
      !!(album.commentary ||
         album.tracks.some(t => t.commentary));

    return query;
  },

  relations: (relation, query, album, _track) => ({
    switcher:
      relation('generateInterpageDotSwitcher'),

    previousLink:
      relation('generatePreviousLink'),

    nextLink:
      relation('generateNextLink'),

    previousTrackLink:
      (query.previousTrack
        ? relation('linkTrack', query.previousTrack)
        : null),

    nextTrackLink:
      (query.nextTrack
        ? relation('linkTrack', query.nextTrack)
        : null),

    albumGalleryLink:
      relation('linkAlbumGallery', album),

    albumCommentaryLink:
      (query.albumHasAnyCommentary
        ? relation('linkAlbumCommentary', album)
        : null),
  }),

  data: (query, album, track) => ({
    hasMultipleTracks:
      album.tracks.length > 1,

    galleryIsStub:
      album.tracks.every(t => !t.hasUniqueCoverArt),

    isTrackPage:
      !!track,
  }),

  slots: {
    showTrackNavigation: {type: 'boolean', default: false},
    showExtraLinks: {type: 'boolean', default: false},

    currentExtra: {
      validate: v => v.is('gallery', 'commentary'),
    },
  },

  generate(data, relations, slots, {html, language}) {
    const albumNavCapsule = language.encapsulate('albumPage.nav');
    const trackNavCapsule = language.encapsulate('trackPage.nav');

    const previousLink =
      data.isTrackPage &&
        relations.previousLink.slot('link', relations.previousTrackLink);

    const nextLink =
      data.isTrackPage &&
        relations.nextLink.slot('link', relations.nextTrackLink);

    const galleryLink =
      (!data.galleryIsStub || slots.currentExtra === 'gallery') &&
        relations.albumGalleryLink.slots({
          attributes: {class: slots.currentExtra === 'gallery' && 'current'},
          content: language.$(albumNavCapsule, 'gallery'),
        });

    const commentaryLink =
      relations.albumCommentaryLink?.slots({
        attributes: {class: slots.currentExtra === 'commentary' && 'current'},
        content: language.$(albumNavCapsule, 'commentary'),
      });

    const randomLink =
      data.hasMultipleTracks &&
        html.tag('a',
          {id: 'random-button'},
          {href: '#', 'data-random': 'track-in-sidebar'},

          (data.isTrackPage
            ? language.$(trackNavCapsule, 'random')
            : language.$(albumNavCapsule, 'randomTrack')));

    return relations.switcher.slots({
      links: [
        slots.showTrackNavigation &&
          previousLink,

        slots.showTrackNavigation &&
          nextLink,

        slots.showExtraLinks &&
          galleryLink,

        slots.showExtraLinks &&
          commentaryLink,

        slots.showTrackNavigation &&
          randomLink,
      ],
    });
  },
};
