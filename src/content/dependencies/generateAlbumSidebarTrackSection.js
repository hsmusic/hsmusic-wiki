export default {
  contentDependencies: ['linkTrack'],
  extraDependencies: ['getColors', 'html', 'language'],

  relations(relation, album, track, trackSection) {
    const relations = {};

    relations.trackLinks =
      trackSection.tracks.map(track =>
        relation('linkTrack', track));

    return relations;
  },

  data(album, track, trackSection) {
    const data = {};

    data.hasTrackNumbers = album.hasTrackNumbers;
    data.isTrackPage = !!track;

    data.name = trackSection.name;
    data.color = trackSection.color;
    data.isDefaultTrackSection = trackSection.isDefaultTrackSection;

    data.firstTrackNumber = trackSection.startIndex + 1;
    data.lastTrackNumber = trackSection.startIndex + trackSection.tracks.length;

    if (track) {
      const index = trackSection.tracks.indexOf(track);
      if (index !== -1) {
        data.includesCurrentTrack = true;
        data.currentTrackIndex = index;
      }
    }

    return data;
  },

  generate(data, relations, {getColors, html, language}) {
    const sectionName =
      html.tag('span', {class: 'group-name'},
        (data.isDefaultTrackSection
          ? language.$('albumSidebar.trackList.fallbackSectionName')
          : data.name));

    let style;
    if (data.color) {
      const {primary} = getColors(data.color);
      style = `--primary-color: ${primary}`;
    }

    const trackListItems =
      relations.trackLinks.map((trackLink, index) =>
        html.tag('li',
          {
            class:
              data.includesCurrentTrack &&
              index === data.currentTrackIndex &&
              'current',
          },
          language.$('albumSidebar.trackList.item', {
            track: trackLink,
          })));

    return html.tag('details',
      {
        class: data.includesCurrentTrack && 'current',

        open: (
          // Leave sidebar track sections collapsed on album info page,
          // since there's already a view of the full track listing
          // in the main content area.
          data.isTrackPage &&

          // Only expand the track section which includes the track
          // currently being viewed by default.
          data.includesCurrentTrack),
      },
      [
        html.tag('summary', {style},
          html.tag('span',
            (data.hasTrackNumbers
              ? language.$('albumSidebar.trackList.group.withRange', {
                  group: sectionName,
                  range: `${data.firstTrackNumber}&ndash;${data.lastTrackNumber}`
                })
              : language.$('albumSidebar.trackList.group', {
                  group: sectionName,
                })))),

        (data.hasTrackNumbers
          ? html.tag('ol',
              {start: data.firstTrackNumber},
              trackListItems)
          : html.tag('ul', trackListItems)),
      ]);
  },
};
