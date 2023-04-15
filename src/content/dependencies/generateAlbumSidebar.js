import {empty} from '../../util/sugar.js';

function groupRelationships(album) {
  return album.groups.map(group => {
    const albums = group.albums.filter(album => album.date);
    const index = albums.indexOf(album);

    const previousAlbum = (index > 0) && albums[index - 1];
    const nextAlbum = (index < albums.length - 1) && albums[index + 1];

    return {group, previousAlbum, nextAlbum};
  });
}

export default {
  contentDependencies: [
    'linkAlbum',
    'linkExternal',
    'linkGroup',
    'linkTrack',
  ],

  extraDependencies: [
    'getColors',
    'html',
    'language',
    'transformMultiline',
  ],

  relations(relation, album, track) {
    const relations = {};

    relations.albumLink =
      relation('linkAlbum', album);

    relations.trackLinks =
      album.trackSections.map(trackSection =>
        trackSection.tracks.map(track =>
          relation('linkTrack', track)));

    relations.groupLinks =
      groupRelationships(album)
        .map(({group, previousAlbum, nextAlbum}) => ({
          groupLink:
            relation('linkGroup', group),

          externalLinks:
            group.urls.map(url =>
              relation('linkExternal', url)),

          previousAlbumLink:
            previousAlbum &&
              relation('linkAlbum', previousAlbum),

          nextAlbumLink:
            nextAlbum &&
              relation('linkAlbum', nextAlbum),
        }))

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

    data.groupInfo =
      album.groups.map(group => ({
        description: group.descriptionShort,
      }));

    return data;
  },

  generate(data, relations, {
    getColors,
    html,
    language,
    transformMultiline,
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

    const groupParts = data.groupInfo.map(
      ({description}, index) => {
        const links = relations.groupLinks[index];

        return html.tags([
          html.tag('h1',
            language.$('albumSidebar.groupBox.title', {
              group: links.groupLink,
            })),

          isAlbumPage &&
            transformMultiline(description),

          !empty(links.externalLinks) &&
            html.tag('p',
              language.$('releaseInfo.visitOn', {
                links: language.formatDisjunctionList(links.externalLinks),
              })),

          isAlbumPage &&
          links.nextAlbumLink &&
            html.tag('p', {class: 'group-chronology-link'},
              language.$('albumSidebar.groupBox.next', {
                album: links.nextAlbumLink,
              })),

          isAlbumPage &&
          links.previousAlbumLink &&
            html.tag('p', {class: 'group-chronology-link'},
              language.$('albumSidebar.groupBox.previous', {
                album: links.previousAlbumLink,
              })),
        ]);
      });

    if (isAlbumPage) {
      return {
        // leftSidebarStickyMode: 'last',
        leftSidebarMultiple: [
          ...groupParts.map(groupPart => ({content: groupPart})),
          {content: trackListPart},
        ],
      };
    } else {
      return {
        // leftSidebarStickyMode: 'column',
        leftSidebarMultiple: [
          {content: trackListPart},
          // ...groupParts.map(groupPart => ({content: groupPart})),
          {
            content:
              groupParts
                .flatMap((part, i) => [
                  part,
                  i < groupParts.length - 1 &&
                    html.tag('hr', {
                      style: `border-color: var(--primary-color); border-style: none none dotted none`
                    })
                ])
                .filter(Boolean),
          },
        ],
      };
    }
  },
};
