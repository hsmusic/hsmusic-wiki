import {empty, stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateAlbumCommentarySidebar',
    'generateAlbumCoverArtwork',
    'generateAlbumNavAccent',
    'generateAlbumSecondaryNav',
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

  query(album) {
    const query = {};

    query.tracksWithCommentary =
      album.tracks
        .filter(({commentary}) => !empty(commentary));

    query.thingsWithCommentary =
      (empty(album.commentary)
        ? query.tracksWithCommentary
        : [album, ...query.tracksWithCommentary]);

    return query;
  },

  relations(relation, query, album) {
    const relations = {};

    relations.layout =
      relation('generatePageLayout');

    relations.secondaryNav =
      relation('generateAlbumSecondaryNav', album);

    relations.sidebar =
      relation('generateAlbumCommentarySidebar', album);

    relations.albumStyleRules =
      relation('generateAlbumStyleRules', album, null);

    relations.albumLink =
      relation('linkAlbum', album);

    relations.albumNavAccent =
      relation('generateAlbumNavAccent', album, null);

    if (!empty(album.commentary)) {
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

    relations.trackCommentaryHeadings =
      query.tracksWithCommentary
        .map(() => relation('generateContentHeading'));

    relations.trackCommentaryLinks =
      query.tracksWithCommentary
        .map(track => relation('linkTrack', track));

    relations.trackCommentaryListeningLinks =
      query.tracksWithCommentary
        .map(track =>
          track.urls.map(url => relation('linkExternal', url)));

    relations.trackCommentaryCovers =
      query.tracksWithCommentary
        .map(track =>
          (track.hasUniqueCoverArt
            ? relation('generateTrackCoverArtwork', track)
            : null));

    relations.trackCommentaryEntries =
      query.tracksWithCommentary
        .map(track =>
          track.commentary
            .map(entry => relation('generateCommentaryEntry', entry)));

    return relations;
  },

  data(query, album) {
    const data = {};

    data.name = album.name;
    data.color = album.color;
    data.date = album.date;

    data.entryCount =
      query.thingsWithCommentary
        .flatMap(({commentary}) => commentary)
        .length;

    data.wordCount =
      query.thingsWithCommentary
        .flatMap(({commentary}) => commentary)
        .map(({body}) => body)
        .join(' ')
        .split(' ')
        .length;

    data.trackCommentaryTrackDates =
      query.tracksWithCommentary
        .map(track => track.dateFirstReleased);

    data.trackCommentaryDirectories =
      query.tracksWithCommentary
        .map(track => track.directory);

    data.trackCommentaryColors =
      query.tracksWithCommentary
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
            {[html.joinChildren]: html.tag('br')},

            [
              data.date &&
              data.entryCount >= 1 &&
                language.$('releaseInfo.albumReleased', {
                  date:
                    html.tag('b',
                      language.formatDate(data.date)),
                }),

              language.encapsulate(pageCapsule, 'infoLine', workingCapsule => {
                const workingOptions = {};

                if (data.entryCount >= 1) {
                  workingOptions.words =
                    html.tag('b',
                      language.formatWordCount(data.wordCount, {unit: true}));

                  workingOptions.entries =
                    html.tag('b',
                      language.countCommentaryEntries(data.entryCount, {unit: true}));
                }

                if (data.entryCount === 0) {
                  workingCapsule += '.withoutCommentary';
                }

                return language.$(workingCapsule, workingOptions);
              })
            ]),

          relations.albumCommentaryEntries &&
            language.encapsulate(pageCapsule, 'entry', entryCapsule => [
              language.encapsulate(entryCapsule, 'title.albumCommentary', titleCapsule =>
                relations.albumCommentaryHeading.slots({
                  tag: 'h3',
                  attributes: {id: 'album-commentary'},
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
            trackDate: data.trackCommentaryTrackDates,
          }).map(({
              heading,
              link,
              listeningLinks,
              directory,
              cover,
              entries,
              color,
              trackDate,
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

              trackDate &&
              trackDate !== data.date &&
                html.tag('p', {class: 'track-info'},
                  language.$('releaseInfo.trackReleased', {
                    date: language.formatDate(trackDate),
                  })),

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

        secondaryNav:
          relations.secondaryNav.slots({
            alwaysVisible: true,
          }),

        leftSidebar: relations.sidebar,
      })),
};
