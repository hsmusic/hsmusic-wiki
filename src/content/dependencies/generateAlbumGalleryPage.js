import {stitchArrays, unique} from '#sugar';
import {getKebabCase} from '#wiki-data';

export default {
  contentDependencies: [
    'generateAlbumGalleryAlbumGrid',
    'generateAlbumGalleryNoTrackArtworksLine',
    'generateAlbumGalleryStatsLine',
    'generateAlbumGalleryTrackGrid',
    'generateAlbumNavAccent',
    'generateAlbumSecondaryNav',
    'generateAlbumStyleRules',
    'generateIntrapageDotSwitcher',
    'generatePageLayout',
    'linkAlbum',
  ],

  extraDependencies: ['html', 'language'],

  query(album) {
    const query = {};

    const trackArtworkLabels =
      album.tracks
        .map(track => track.trackArtworks
          .map(artwork => artwork.label));

    const recurranceThreshold = 2;

    // This list may include null, if some artworks are not labelled!
    // That's expected.
    query.recurringTrackArtworkLabels =
      unique(trackArtworkLabels.flat())
        .filter(label =>
          trackArtworkLabels
            .filter(labels => labels.includes(label))
            .length >=
          (label === null
            ? 1
            : recurranceThreshold));

    return query;
  },

  relations: (relation, query, album) => ({
    layout:
      relation('generatePageLayout'),

    albumStyleRules:
      relation('generateAlbumStyleRules', album, null),

    albumLink:
      relation('linkAlbum', album),

    albumNavAccent:
      relation('generateAlbumNavAccent', album, null),

    secondaryNav:
      relation('generateAlbumSecondaryNav', album),

    statsLine:
      relation('generateAlbumGalleryStatsLine', album),

    noTrackArtworksLine:
      (album.tracks.every(track => !track.hasUniqueCoverArt)
        ? relation('generateAlbumGalleryNoTrackArtworksLine')
        : null),

    setSwitcher:
      relation('generateIntrapageDotSwitcher'),

    albumGrid:
      relation('generateAlbumGalleryAlbumGrid', album),

    trackGrids:
      query.recurringTrackArtworkLabels.map(label =>
        relation('generateAlbumGalleryTrackGrid', album, label)),
  }),

  data: (query, album) => ({
    trackGridLabels:
      query.recurringTrackArtworkLabels,

    trackGridIDs:
      query.recurringTrackArtworkLabels.map(label =>
        'track-grid-' +
          (label
            ? getKebabCase(label)
            : 'no-label')),

    name:
      album.name,

    color:
      album.color,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('albumGalleryPage', pageCapsule =>
      relations.layout.slots({
        title:
          language.$(pageCapsule, 'title', {
            album: data.name,
          }),

        headingMode: 'static',

        color: data.color,
        styleRules: [relations.albumStyleRules],

        mainClasses: ['top-index'],
        mainContent: [
          relations.statsLine,

          relations.albumGrid,

          relations.noTrackArtworksLine,

          data.trackGridIDs.length > 1 &&
            html.tag('p', {class: 'gallery-set-switcher'},
              language.encapsulate(pageCapsule, 'setSwitcher', switcherCapsule =>
                language.$(switcherCapsule, {
                  sets:
                    relations.setSwitcher.slots({
                      initialOptionIndex: 0,

                      titles:
                        data.trackGridLabels.map(label =>
                          label ??
                          language.$(switcherCapsule, 'unlabeledSet')),

                      targetIDs:
                        data.trackGridIDs,
                    }),
                }))),

          stitchArrays({
            grid: relations.trackGrids,
            id: data.trackGridIDs,
          }).map(({grid, id}, index) =>
              grid.slots({
                attributes: [
                  {id},
                  index >= 1 && {style: 'display: none'},
                ],
              })),
        ],

        navLinkStyle: 'hierarchical',
        navLinks: [
          {auto: 'home'},
          {
            html:
              relations.albumLink
                .slot('attributes', {class: 'current'}),
            accent:
              relations.albumNavAccent.slots({
                showTrackNavigation: false,
                showExtraLinks: true,
                currentExtra: 'gallery',
              }),
          },
        ],

        secondaryNav: relations.secondaryNav,
      })),
};
