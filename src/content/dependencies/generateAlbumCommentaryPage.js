import {stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateAlbumCommentarySidebar',
    'generateAlbumCoverArtwork',
    'generateAlbumNavAccent',
    'generateAlbumStyleRules',
    'generateCommentaryEntry',
    'generateContentHeading',
    'generateTrackCoverArtwork',
    'generatePageLayout',
    'linkAlbum',
    'linkExternal',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language'],

  relations(relation, album) {
    const relations = {};

    relations.layout =
      relation('generatePageLayout');

    relations.sidebar =
      relation('generateAlbumCommentarySidebar', album);

    relations.albumStyleRules =
      relation('generateAlbumStyleRules', album, null);

    relations.albumLink =
      relation('linkAlbum', album);

    relations.albumNavAccent =
      relation('generateAlbumNavAccent', album, null);

    if (album.commentary) {
      relations.albumCommentaryHeading =
        relation('generateContentHeading');

      relations.albumCommentaryLink =
        relation('linkAlbum', album);

      relations.albumCommentaryListeningLinks =
        album.urls.map(url => relation('linkExternal', url));

      if (album.hasCoverArt) {
        relations.albumCommentaryCover =
          relation('generateAlbumCoverArtwork', album);
      }

      relations.albumCommentaryEntries =
        album.commentary
          .map(entry => relation('generateCommentaryEntry', entry));
    }

    const tracksWithCommentary =
      album.tracks
        .filter(({commentary}) => commentary);

    relations.trackCommentaryHeadings =
      tracksWithCommentary
        .map(() => relation('generateContentHeading'));

    relations.trackCommentaryLinks =
      tracksWithCommentary
        .map(track => relation('linkTrack', track));

    relations.trackCommentaryListeningLinks =
      tracksWithCommentary
        .map(track =>
          track.urls.map(url => relation('linkExternal', url)));

    relations.trackCommentaryCovers =
      tracksWithCommentary
        .map(track =>
          (track.hasUniqueCoverArt
            ? relation('generateTrackCoverArtwork', track)
            : null));

    relations.trackCommentaryEntries =
      tracksWithCommentary
        .map(track =>
          track.commentary
            .map(entry => relation('generateCommentaryEntry', entry)));

    return relations;
  },

  data(album) {
    const data = {};

    data.name = album.name;
    data.color = album.color;

    const tracksWithCommentary =
      album.tracks
        .filter(({commentary}) => commentary);

    const thingsWithCommentary =
      (album.commentary
        ? [album, ...tracksWithCommentary]
        : tracksWithCommentary);

    data.entryCount =
      thingsWithCommentary
        .flatMap(({commentary}) => commentary)
        .length;

    data.wordCount =
      thingsWithCommentary
        .flatMap(({commentary}) => commentary)
        .map(({body}) => body)
        .join(' ')
        .split(' ')
        .length;

    data.trackCommentaryDirectories =
      tracksWithCommentary
        .map(track => track.directory);

    data.trackCommentaryColors =
      tracksWithCommentary
        .map(track =>
          (track.color === album.color
            ? null
            : track.color));

    return data;
  },

  generate: (data, relations, {html, language}) =>
    language.encapsulate('albumCommentaryPage', pageCapsule =>
      relations.layout.slots({
        title:
          language.$(pageCapsule, 'title', {
            album: data.name,
          }),

        headingMode: 'sticky',

        color: data.color,
        styleRules: [relations.albumStyleRules],

        mainClasses: ['long-content'],
        mainContent: [
          html.tag('p',
            language.$(pageCapsule, 'infoLine', {
              words:
                html.tag('b',
                  language.formatWordCount(data.wordCount, {unit: true})),

              entries:
                html.tag('b',
                  language.countCommentaryEntries(data.entryCount, {unit: true})),
            })),

          relations.albumCommentaryEntries &&
            language.encapsulate(pageCapsule, 'entry', entryCapsule => [
              language.encapsulate(entryCapsule, 'title.albumCommentary', titleCapsule =>
                relations.albumCommentaryHeading.slots({
                  tag: 'h3',
                  color: data.color,

                  title:
                    language.$(titleCapsule, {
                      album: relations.albumCommentaryLink,
                    }),

                  stickyTitle:
                    language.$(titleCapsule, 'sticky', {
                      album: data.name,
                    }),

                  accent:
                    language.$(titleCapsule, 'accent', {
                      [language.onlyIfOptions]: ['listeningLinks'],
                      listeningLinks:
                        language.formatUnitList(
                          relations.albumCommentaryListeningLinks
                            .map(link => link.slots({
                              context: 'album',
                              tab: 'separate',
                            }))),
                    }),
                })),

              relations.albumCommentaryCover
                ?.slots({mode: 'commentary'}),

              relations.albumCommentaryEntries,
            ]),

          stitchArrays({
            heading: relations.trackCommentaryHeadings,
            link: relations.trackCommentaryLinks,
            listeningLinks: relations.trackCommentaryListeningLinks,
            directory: data.trackCommentaryDirectories,
            cover: relations.trackCommentaryCovers,
            entries: relations.trackCommentaryEntries,
            color: data.trackCommentaryColors,
          }).map(({
              heading,
              link,
              listeningLinks,
              directory,
              cover,
              entries,
              color,
            }) =>
              language.encapsulate(pageCapsule, 'entry', entryCapsule => [
                language.encapsulate(entryCapsule, 'title.trackCommentary', titleCapsule =>
                  heading.slots({
                    tag: 'h3',
                    attributes: {id: directory},
                    color,

                    title:
                      language.$(titleCapsule, {
                        track: link,
                      }),

                    accent:
                      language.$(titleCapsule, 'accent', {
                        [language.onlyIfOptions]: ['listeningLinks'],
                        listeningLinks:
                          language.formatUnitList(
                            listeningLinks.map(link =>
                              link.slot('tab', 'separate'))),
                      }),
                  })),

              cover?.slots({mode: 'commentary'}),

              entries.map(entry => entry.slot('color', color)),
            ])),
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
                currentExtra: 'commentary',
              }),
          },
        ],

        leftSidebar: relations.sidebar,
      })),
};
