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

    data.trackDirectories =
      trackSection.tracks
        .map(track => track.directory);

    data.tracksAreMissingCommentary =
      trackSection.tracks
        .map(track => !track.commentary);

    return data;
  },

  slots: {
    anchor: {type: 'boolean'},
    open: {type: 'boolean'},

    mode: {
      validate: v => v.is('info', 'commentary'),
      default: 'info',
    },
  },

  generate(data, relations, slots, {getColors, html, language}) {
    const sectionName =
      html.tag('span', {class: 'group-name'},
        (data.isDefaultTrackSection
          ? language.$('albumSidebar.trackList.fallbackSectionName')
          : data.name));

    let colorStyle;
    if (data.color) {
      const {primary} = getColors(data.color);
      colorStyle = {style: `--primary-color: ${primary}`};
    }

    const trackListItems =
      relations.trackLinks.map((trackLink, index) =>
        html.tag('li',
          data.includesCurrentTrack &&
          index === data.currentTrackIndex &&
            {class: 'current'},

          slots.mode === 'commentary' &&
          data.tracksAreMissingCommentary[index] &&
            {class: 'no-commentary'},

          language.$('albumSidebar.trackList.item', {
            track:
              (slots.mode === 'commentary' && data.tracksAreMissingCommentary[index]
                ? trackLink.slots({
                    linkless: true,
                  })
             : slots.anchor
                ? trackLink.slots({
                    anchor: true,
                    hash: data.trackDirectories[index],
                  })
                : trackLink),
          })));

    return html.tag('details',
      data.includesCurrentTrack &&
        {class: 'current'},

      // Allow forcing open via a template slot.
      // This isn't exactly janky, but the rest of this function
      // kind of is when you contextualize it in a template...
      slots.open &&
        {open: true},

      // Leave sidebar track sections collapsed on album info page,
      // since there's already a view of the full track listing
      // in the main content area.
      data.isTrackPage &&

      // Only expand the track section which includes the track
      // currently being viewed by default.
      data.includesCurrentTrack &&
        {open: true},

      [
        html.tag('summary',
          colorStyle,

          html.tag('span',
            (data.hasTrackNumbers
              ? language.$('albumSidebar.trackList.group.withRange', {
                  group: sectionName,
                  range: `${data.firstTrackNumber}–${data.lastTrackNumber}`
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
