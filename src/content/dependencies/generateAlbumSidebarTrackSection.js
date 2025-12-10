import {empty, stitchArrays} from '#sugar';

export default {
  relations(relation, album, track, trackSection) {
    const relations = {};

    relations.trackLinks =
      trackSection.tracks.map(track =>
        relation('linkTrack', track));

    return relations;
  },

  data(album, track, trackSection) {
    const data = {};

    data.hasTrackNumbers =
      trackSection.hasTrackNumbers &&
      !empty(trackSection.tracks);

    data.isTrackPage = !!track;
    data.albumStyle = album.style;

    data.name = trackSection.name;
    data.color = trackSection.color;
    data.isDefaultTrackSection = trackSection.isDefaultTrackSection;
    data.hasSiblingSections = album.trackSections.length > 1;

    data.firstTrackNumber =
      (data.hasTrackNumbers
        ? trackSection.tracks.at(0).trackNumber
        : null);

    data.lastTrackNumber =
      (data.hasTrackNumbers
        ? trackSection.tracks.at(-1).trackNumber
        : null);

    data.trackDirectories =
      trackSection.tracks
        .map(track => track.directory);

    data.tracksAreMissingCommentary =
      trackSection.tracks
        .map(track => empty(track.commentary));

    data.tracksAreCurrentTrack =
      trackSection.tracks
        .map(traaaaaaaack => traaaaaaaack === track);

    data.includesCurrentTrack =
      data.tracksAreCurrentTrack.includes(true);

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
    const capsule = language.encapsulate('albumSidebar.trackList');

    const sectionName =
      html.tag('b',
        (data.isDefaultTrackSection
          ? language.$(capsule, 'fallbackSectionName')
          : data.name));

    let colorStyle;
    if (data.color) {
      const {primary} = getColors(data.color);
      colorStyle = {style: `--primary-color: ${primary}`};
    }

    const trackListItems =
      stitchArrays({
        trackLink: relations.trackLinks,
        directory: data.trackDirectories,
        isCurrentTrack: data.tracksAreCurrentTrack,
        missingCommentary: data.tracksAreMissingCommentary,
      }).map(({
          trackLink,
          directory,
          isCurrentTrack,
          missingCommentary,
        }) =>
          html.tag('li',
            data.includesCurrentTrack &&
            isCurrentTrack &&
              {class: 'current'},

            slots.mode === 'commentary' &&
            missingCommentary &&
              {class: 'no-commentary'},

            language.$(capsule, 'item', {
              track:
                (slots.mode === 'commentary' && missingCommentary
                  ? trackLink.slots({
                      linkless: true,
                    })
               : slots.anchor
                  ? trackLink.slots({
                      anchor: true,
                      hash: directory,
                    })
                  : trackLink),
            })));

    const list =
      (data.hasTrackNumbers
        ? html.tag('ol',
            {start: data.firstTrackNumber},
            trackListItems)
        : html.tag('ul', trackListItems));

    if (data.albumStyle === 'single' && !data.hasSiblingSections) {
      if (trackListItems.length <= 1) {
        return html.blank();
      } else {
        return list;
      }
    }

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
            language.encapsulate(capsule, 'group', groupCapsule =>
              language.encapsulate(groupCapsule, workingCapsule => {
                const workingOptions = {group: sectionName};

                if (data.hasTrackNumbers) {
                  workingCapsule += '.withRange';
                  workingOptions.rangePart =
                    html.tag('span', {class: 'track-section-range'},
                      language.$(groupCapsule, 'withRange.rangePart', {
                        range:
                          `${data.firstTrackNumber}–${data.lastTrackNumber}`,
                      }));
                }

                return language.$(workingCapsule, workingOptions);
              })))),

        list,
      ]);
  },
};
