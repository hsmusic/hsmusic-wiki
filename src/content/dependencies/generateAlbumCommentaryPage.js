import {stitchArrays} from '../../util/sugar.js';

export default {
  contentDependencies: [
    'generateAlbumNavAccent',
    'generateAlbumStyleRules',
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
            : relation('generateColorStyleVariables')));

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

    data.trackCommentaryColors =
      tracksWithCommentary
        .map(track =>
          (track.color === album.color
            ? null
            : track.color));

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

        color: data.color,
        styleRules: [relations.albumStyleRules],

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

          stitchArrays({
            heading: relations.trackCommentaryHeadings,
            link: relations.trackCommentaryLinks,
            directory: data.trackCommentaryDirectories,
            content: relations.trackCommentaryContent,
            colorVariables: relations.trackCommentaryColorVariables,
            color: data.trackCommentaryColors,
          }).map(({heading, link, directory, content, colorVariables, color}) => [
              heading.slots({
                tag: 'h3',
                id: directory,
                title: link,
              }),
              html.tag('blockquote',
                (color
                  ? {style: colorVariables.slot('color', color).content}
                  : {}),
                content),
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
