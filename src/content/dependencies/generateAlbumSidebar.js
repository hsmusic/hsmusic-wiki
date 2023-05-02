export default {
  contentDependencies: [
    'generateAlbumSidebarGroupBox',
    'linkAlbum',
    'linkTrack',
  ],

  extraDependencies: [
    'getColors',
    'html',
    'language',
  ],

  relations(relation, album, _track) {
    const relations = {};

    relations.albumLink =
      relation('linkAlbum', album);

    relations.trackLinks =
      album.trackSections.map(trackSection =>
        trackSection.tracks.map(track =>
          relation('linkTrack', track)));

    relations.groupBoxes =
      album.groups.map(group =>
        relation('generateAlbumSidebarGroupBox', album, group));

    return relations;
  },

  data(album, track) {
    const data = {};

    data.isAlbumPage = !track;
    data.isTrackPage = !!track;

    data.hasTrackNumbers = album.hasTrackNumbers;

    data.trackSectionInfo =
      album.trackSections.map(trackSection => ({
        name: trackSection.name,
        color: trackSection.color,
        isDefaultTrackSection: trackSection.isDefaultTrackSection,

        firstTrackNumber: trackSection.startIndex + 1,
        lastTrackNumber: trackSection.startIndex + trackSection.tracks.length,

        includesCurrentTrack: track && trackSection.tracks.includes(track),
        currentTrackIndex: trackSection.tracks.indexOf(track),
      }));

    return data;
  },

  generate(data, relations, {
    getColors,
    html,
    language,
  }) {
    const {isTrackPage, isAlbumPage} = data;

    const trackListPart = html.tags([
      html.tag('h1', relations.albumLink),
      data.trackSectionInfo.map(
        ({
          name,
          color,
          isDefaultTrackSection,

          firstTrackNumber,
          lastTrackNumber,

          includesCurrentTrack,
          currentTrackIndex,
        }, index) => {
          const trackLinks = relations.trackLinks[index];

          const sectionName =
            html.tag('span', {class: 'group-name'},
              (isDefaultTrackSection
                ? language.$('albumSidebar.trackList.fallbackSectionName')
                : name));

          let style;
          if (color) {
            const {primary} = getColors(color);
            style = `--primary-color: ${primary}`;
          }

          const trackListItems =
            trackLinks.map((trackLink, index) =>
              html.tag('li',
                {
                  class:
                    includesCurrentTrack &&
                    index === currentTrackIndex &&
                    'current',
                },
                language.$('albumSidebar.trackList.item', {
                  track: trackLink,
                })));

          return html.tag('details',
            {
              class: includesCurrentTrack && 'current',

              open: (
                // Leave sidebar track sections collapsed on album info page,
                // since there's already a view of the full track listing
                // in the main content area.
                isTrackPage &&

                // Only expand the track section which includes the track
                // currently being viewed by default.
                includesCurrentTrack),
            },
            [
              html.tag('summary', {style},
                html.tag('span',
                  (data.hasTrackNumbers
                    ? language.$('albumSidebar.trackList.group.withRange', {
                        group: sectionName,
                        range: `${firstTrackNumber}&ndash;${lastTrackNumber}`
                      })
                    : language.$('albumSidebar.trackList.group', {
                        group: sectionName,
                      })))),

              (data.hasTrackNumbers
                ? html.tag('ol',
                    {start: firstTrackNumber},
                    trackListItems)
                : html.tag('ul', trackListItems)),
            ]);
        }),
    ]);

    if (isAlbumPage) {
      return {
        // leftSidebarStickyMode: 'last',
        leftSidebarMultiple: [
          ...(
            relations.groupBoxes
              .map(groupBox => groupBox.slot('isAlbumPage', true))
              .map(content => ({content}))),
          {content: trackListPart},
        ],
      };
    } else {
      return {
        // leftSidebarStickyMode: 'column',
        leftSidebarMultiple: [
          {content: trackListPart},
          // ...relations.groupBoxes.map(content => ({content})),
          {
            content:
              relations.groupBoxes
                .flatMap((content, i, {length}) => [
                  content,
                  i < length - 1 &&
                    html.tag('hr', {
                      style: `border-color: var(--primary-color); border-style: none none dotted none`
                    }),
                ])
                .filter(Boolean),
          },
        ],
      };
    }
  },
};
