export default {
  contentDependencies: [
    'generateAlbumNavAccent',
    'generateAlbumStyleRules',
    'generateColorStyleRules',
    'generateColorStyleVariables',
    'generateContentHeading',
    'generatePageLayout',
    'linkAlbum',
    'linkTrack',
    'transformContent',
  ],

  extraDependencies: ['html', 'language'],

  relations(relation, album) {
    const relations = {};

    relations.layout =
      relation('generatePageLayout');

    relations.albumStyleRules =
      relation('generateAlbumStyleRules', album);

    relations.colorStyleRules =
      relation('generateColorStyleRules', album.color);

    relations.albumLink =
      relation('linkAlbum', album);

    relations.albumNavAccent =
      relation('generateAlbumNavAccent', album, null);

    if (album.commentary) {
      relations.albumCommentaryContent =
        relation('transformContent', album.commentary);
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

    relations.trackCommentaryContent =
      tracksWithCommentary
        .map(track => relation('transformContent', track.commentary));

    relations.trackCommentaryColorVariables =
      tracksWithCommentary
        .map(track =>
          (track.color === album.color
            ? null
            : relation('generateColorStyleVariables', track.color)));

    return relations;
  },

  data(album) {
    const data = {};

    data.name = album.name;

    const tracksWithCommentary =
      album.tracks
        .filter(({commentary}) => commentary);

    const thingsWithCommentary =
      (album.commentary
        ? [album, ...tracksWithCommentary]
        : tracksWithCommentary);

    data.entryCount = thingsWithCommentary.length;

    data.wordCount =
      thingsWithCommentary
        .map(({commentary}) => commentary)
        .join(' ')
        .split(' ')
        .length;

    data.trackCommentaryDirectories =
      tracksWithCommentary
        .map(track => track.directory);

    return data;
  },

  generate(data, relations, {html, language}) {
    return relations.layout
      .slots({
        title:
          language.$('albumCommentaryPage.title', {
            album: data.name,
          }),

        headingMode: 'sticky',

        colorStyleRules: [relations.colorStyleRules],
        additionalStyleRules: [relations.albumStyleRules],

        mainClasses: ['long-content'],
        mainContent: [
          html.tag('p',
            language.$('albumCommentaryPage.infoLine', {
              words:
                html.tag('b',
                  language.formatWordCount(data.wordCount, {unit: true})),

              entries:
                html.tag('b',
                  language.countCommentaryEntries(data.entryCount, {unit: true})),
            })),

          relations.albumCommentaryContent && [
            html.tag('h3',
              {class: ['content-heading']},
              language.$('albumCommentaryPage.entry.title.albumCommentary')),

            html.tag('blockquote',
              relations.albumCommentaryContent),
          ],

          relations.trackCommentaryContent.map((commentaryContent, i) => [
            relations.trackCommentaryHeadings[i]
              .slots({
                tag: 'h3',
                id: data.trackCommentaryDirectories[i],
                title: relations.trackCommentaryLinks[i],
              }),

            html.tag('blockquote',
              {style: relations.trackCommentaryColorVariables[i]},
              relations.trackCommentaryContent[i]),
          ]),
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
      });
  },
};
