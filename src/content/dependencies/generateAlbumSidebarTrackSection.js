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
    data.isAsideTrackSection = !!trackSection.isAsideTrackSection;
    data.hasSiblingSections = album.trackSections.length > 1;

    data.numTracks =
      trackSection.tracks.length;

    data.firstTrackNumber =
      (data.hasTrackNumbers
        ? trackSection.tracks.at(0).trackNumber
        : null);

    data.lastTrackNumber =
      (data.hasTrackNumbers
        ? trackSection.tracks.at(-1).trackNumber
        : null);

    const stemTrackSections =
      album.trackSections.filter(section =>
        !section.isTrackSectionContinuation &&
        !section.isAsideTrackSection);

    data.showTrackCount =
      stemTrackSections.length > 1 &&
      stemTrackSections
        .every(section => section.tracks.at(0).trackNumber === 1);

    data.trackDirectories =
      trackSection.tracks
        .map(track => track.directory);

    data.trackNameDetails =
      trackSection.tracks
        .map(track =>
          (album.style === 'meta'
            ? track.nameDetailWithinAlbum
            : null));

    data.trackNumbers =
      trackSection.tracks
        .map(track => track.trackNumber);

    data.tracksAreMissingCommentary =
      trackSection.tracks
        .map(track => empty(track.commentary));

    data.tracksAreCurrentTrack =
      (track
        ? trackSection.tracks.map(t2 => t2 === track)
        : trackSection.tracks.map(() => false));

    data.includesCurrentTrack =
      (track
        ? trackSection.tracks.includes(track)
        : null);

    data.runIncludesCurrentTrack =
      (track
        ? trackSection.tracksAcrossRun.includes(track)
        : null);

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
        nameDetail: data.trackNameDetails,
        trackNumber: data.trackNumbers,
        isCurrentTrack: data.tracksAreCurrentTrack,
        missingCommentary: data.tracksAreMissingCommentary,
      }).map(({
          trackLink,
          directory,
          nameDetail,
          trackNumber,
          isCurrentTrack,
          missingCommentary,
        }, index) =>
          html.tag('li',
            index >= 1 &&
            trackNumber !== data.trackNumbers[index - 1] + 1 &&
              {value: trackNumber},

            data.includesCurrentTrack &&
            isCurrentTrack &&
              {class: 'current'},

            slots.mode === 'commentary' &&
            missingCommentary &&
              {class: 'no-commentary'},

            language.encapsulate(capsule, 'item', workingCapsule => {
              const workingOptions = {track: trackLink};

              if (slots.mode === 'commentary' && missingCommentary) {
                trackLink.setSlots({linkless: true});
              } else if (slots.anchor) {
                trackLink.setSlots({anchor: true, hash: directory});
              }

              if (nameDetail) {
                workingCapsule += '.withDetail';
                workingOptions.detailAccent =
                  html.tag('span', {class: 'name-detail'},
                    language.$(capsule, 'item.withDetail.accent', {
                      detail: language.sanitize(nameDetail),
                    }));
              }

              return language.$(workingCapsule, workingOptions);
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

      // Force open for singles. They don't have a corresponding "main" page
      // to show all the sections in full, so never collapse for singles.
      data.albumStyle === 'single' &&
        {open: true},

      // Leave sidebar track sections collapsed on album info page,
      // since there's already a view of the full track listing
      // in the main content area.
      data.isTrackPage && [
        // Expand the track section which includes the track
        // currently being viewed.
        data.includesCurrentTrack &&
          {open: true},

        // Also expand sections in a "run" of consecutive, connecting track
        // sections (and one those includes the current track), but only
        // the ones that are regular track sections - not aside sections.
        data.runIncludesCurrentTrack &&
        !data.isAsideTrackSection &&
          {open: true},
      ],

      html.tag('summary',
        colorStyle,

        html.tag('span',
          language.encapsulate(capsule, 'section', sectionCapsule =>
            language.encapsulate(sectionCapsule, workingCapsule => {
              const workingOptions = {section: sectionName};

              if (data.showTrackCount) {
                workingCapsule += '.withCount';
                workingOptions.countAccent =
                  html.tag('span', {class: 'track-section-accent'},
                    language.$(sectionCapsule, 'withCount.accent', {
                      count:
                        language.countTracks(data.numTracks),
                    }));
              } else if (data.hasTrackNumbers) {
                workingCapsule += '.withRange';
                workingOptions.rangeAccent =
                  html.tag('span', {class: 'track-section-accent'},
                    language.$(sectionCapsule, 'withRange.accent', {
                      range:
                        (data.firstTrackNumber === data.lastTrackNumber
                          ? language.$(sectionCapsule, 'withRange.one', {
                              number: data.firstTrackNumber,
                            })
                          : language.$(sectionCapsule, 'withRange.range', {
                              start: data.firstTrackNumber,
                              end: data.lastTrackNumber,
                            })),
                    }));
              }

              return language.$(workingCapsule, workingOptions);
            })))),

      list);
  },
};
