import {stitchArrays} from '#sugar';

export default {
  query: (album) => ({
    stemTrackSections:
      album.trackSections.filter(section =>
        !section.isTrackSectionContinuation &&
        !section.isAsideTrackSection),
  }),

  relations: (relation, _query, album, currentTrack) => ({
    trackSectionTitles:
      album.trackSections
        .map(section => relation('generateTrackSectionTitle', section)),

    trackSectionTrackLists:
      album.trackSections
        .map(section =>
          relation('generateAlbumSidebarTrackSectionTrackList', section, currentTrack)),

    trackSectionColorStyles:
      album.trackSections
        .map(section => relation('generateColorStyleAttribute', section.color)),
  }),

  data: (query, album, currentTrack) => ({
    isTrackPage:
      !!currentTrack,

    albumStyle:
      album.style,

    albumNumTracks:
      album.tracks.length,

    showTrackCounts:
      query.stemTrackSections.length > 1 &&
      query.stemTrackSections.every(section => section.firstTrackNumber === 1),

    hasTrackNumbers:
      album.hasTrackNumbers,

    skipAnnotatingTrackNumbers:
      album.trackSections.every(section =>
        // Empty track sections report null for both of these properties,
        // so they satisfy this condition too.
        section.firstTrackNumber === section.lastTrackNumber),

    trackSectionsAreAsideSections:
      album.trackSections.map(section => section.isAsideTrackSection),

    trackSectionsStartRuns:
      album.trackSections.map(section => section.startsRun),

    trackSectionsIncludeCurrentTrack:
      (currentTrack
        ? album.trackSections
            .map(section => section.tracks.includes(currentTrack))
        : album.trackSections.map(() => null)),

    trackSectionRunsIncludeCurrentTrack:
      (currentTrack
        ? album.trackSections
            .map(section => section.tracksAcrossRun.includes(currentTrack))
        : album.trackSections.map(() => null)),
  }),

  slots: {
    mode: {
      validate: v => v.is('info', 'commentary'),
      default: 'info',
    },
  },

  generate(data, relations, slots, {html}) {
    if (data.albumStyle === 'single' && data.albumNumTracks <= 1) {
      return html.blank();
    }

    const summaries =
      stitchArrays({
        title: relations.trackSectionTitles,
        colorStyle: relations.trackSectionColorStyles,
      }).map(({title, colorStyle}) =>
          html.tag('summary',
            colorStyle.slot('context', 'primary-only'),

            html.tag('span',
              title.slots({
                mode: 'sidebar',

                detail:
                  (data.showTrackCounts
                    ? 'count'
                 : data.hasTrackNumbers &&
                   !data.skipAnnotatingTrackNumbers
                    ? 'range'
                    : null),
              }))));

    const trackLists =
      relations.trackSectionTrackLists
        .map(list => list.slot('mode', slots.mode));

    const detailses =
      stitchArrays({
        summary: summaries,
        trackList: trackLists,

        isAsideTrackSection: data.trackSectionsAreAsideSections,
        startsRun: data.trackSectionsStartRuns,
        includesCurrentTrack: data.trackSectionsIncludeCurrentTrack,
        runIncludesCurrentTrack: data.trackSectionRunsIncludeCurrentTrack,
      }).map(({
          summary,
          trackList,

          isAsideTrackSection,
          startsRun,
          includesCurrentTrack,
          runIncludesCurrentTrack,
        }) =>
          html.tag('details',
            includesCurrentTrack &&
              {class: 'current'},

            startsRun &&
              {class: 'starts-run'},

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
              includesCurrentTrack &&
                {open: true},

              // Also expand sections in a "run" of consecutive, connecting track
              // sections (and one those includes the current track), but only
              // the ones that are regular track sections - not aside sections.
              runIncludesCurrentTrack &&
              !isAsideTrackSection &&
                {open: true},
            ],

            [summary, trackList]));

    return html.tags(detailses);
  },
};
