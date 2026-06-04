import {empty, stitchArrays} from '#sugar';

export default {
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

    relations.albumStyleTags =
      relation('generateAlbumStyleTags', album, null);

    relations.albumNavLinks =
      relation('generateAlbumNavLinks', album);

    relations.totals =
      relation('getContentEntryTotals',
        ([album.commentary,
          ...album.tracks.map(t => t.commentary)])
          .flat());

    if (!empty(album.commentary)) {
      relations.albumCommentaryHeading =
        relation('generateContentHeading');

      relations.albumCommentaryLink =
        relation('linkAlbum', album);

      relations.albumCommentaryListeningLinks =
        album.urls
          .map(entry => relation('linkExternal', entry));

      if (album.hasCoverArt) {
        relations.albumCommentaryCover =
          relation('generateCoverArtwork', album.coverArtworks[0]);
      }

      relations.albumCommentaryEntries =
        album.commentary
          .map(entry => relation('generateContentEntry', entry));
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
          track.urls.map(entry => relation('linkExternal', entry)));

    relations.trackCommentaryCovers =
      query.tracksWithCommentary
        .map(track =>
          (track.hasUniqueCoverArt
            ? relation('generateCoverArtwork', track.trackArtworks[0])
            : null));

    relations.trackCommentaryEntries =
      query.tracksWithCommentary
        .map(track =>
          track.commentary
            .map(entry => relation('generateContentEntry', entry)));

    return relations;
  },

  data(query, album) {
    const data = {};

    data.name = album.name;
    data.color = album.color;
    data.date = album.date;
    data.dateStyle = album.dateStyle;

    data.trackCommentaryTrackDates =
      query.tracksWithCommentary
        .map(track =>
          (+track.date !== +album.date
            ? track.date
            : null));

    data.trackCommentaryTrackDateStyles =
      query.tracksWithCommentary
        .map(track => track.dateStyle);

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
        styleTags: relations.albumStyleTags,

        mainClasses: ['long-content'],
        mainContent: [
          html.tag('p',
            {[html.joinChildren]: html.tag('br')},

            [
              data.date &&
              relations.totals.entryCount >= 1 &&
                language.encapsulate('releaseInfo', workingCapsule => {
                  const workingOptions = {};

                  workingOptions.date =
                    html.tag('b', language.formatDate(data.date));

                  if (data.dateStyle === 'released') {
                    workingCapsule += '.albumReleased';
                  } else if (data.dateStyle === 'posted') {
                    workingCapsule += '.albumPosted';
                  } else {
                    return html.blank();
                  }

                  return language.$(workingCapsule, workingOptions);
                }),

              language.encapsulate(pageCapsule, 'infoLine', workingCapsule => {
                const workingOptions = {};

                if (relations.totals.entryCount >= 1) {
                  workingOptions.words =
                    html.tag('b',
                      language.formatWordCount(
                        relations.totals.wordCount,
                        {unit: true}));

                  workingOptions.entries =
                    html.tag('b',
                      language.countCommentaryEntries(
                        relations.totals.entryCount,
                        {unit: true}));
                } else {
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
            trackDateStyle: data.trackCommentaryTrackDateStyles,
          }).map(({
              heading,
              link,
              listeningLinks,
              directory,
              cover,
              entries,
              color,
              trackDate,
              trackDateStyle,
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

                cover?.slots({
                  mode: 'commentary',
                  color: true,
                }),

                html.tag('p', {class: 'track-info'},
                  {[html.onlyIfContent]: true},

                  language.encapsulate('releaseInfo', workingCapsule => {
                    const workingOptions = {};

                    if (!trackDate) {
                      return html.blank();
                    }

                    workingOptions.date =
                      language.formatDate(trackDate);

                    if (trackDateStyle === 'released') {
                      workingCapsule += '.trackReleased';
                    } else if (trackDateStyle === 'posted') {
                      workingCapsule += '.trackPosted';
                    } else {
                      return html.blank();
                    }

                    return language.$(workingCapsule, workingOptions);
                  })),

                entries.map(entry => entry.slot('color', color)),
              ])),
        ],

        navLinkStyle: 'hierarchical',
        navLinks:
          html.resolve(
            relations.albumNavLinks.slots({
              showTrackNavigation: false,
              showExtraLinks: true,
              currentExtra: 'commentary',
            })),

        secondaryNav:
          relations.secondaryNav.slots({
            alwaysVisible: true,
          }),

        leftSidebar: relations.sidebar,
      })),
};
