export default {
  data: (section) => ({
    name: section.name,
    isDefaultTrackSection: section.isDefaultTrackSection,
    isTrackSectionContinuation: section.isTrackSectionContinuation,

    numTracks: section.tracks.length,
    firstTrackNumber: section.firstTrackNumber,
    lastTrackNumber: section.lastTrackNumber,

    duration:
      (section.hideDuration
        ? null
     : section.isTrackSectionContinuation
        ? null
        : section.durationAcrossRun),
  }),

  slots: {
    mode: {
      validate: v => v.is('content', 'sidebar'),
      default: 'content',
    },

    detail: {
      validate: v => v.is('count', 'range', 'duration'),
      default: null,
    },
  },

  generate: (data, slots, {html, language}) =>
    language.encapsulate('trackList.section', capsule => {
      let sectionText = html.blank();

      if (slots.mode === 'sidebar') {
        if (data.isTrackSectionContinuation || data.isDefaultTrackSection) {
          sectionText =
            language.$(capsule, 'inSidebar', {
              section: language.$(capsule, 'fallbackName'),
            });
        } else {
          sectionText =
            language.$(capsule, 'inSidebar', {section: data.name});
        }
      } else {
        if (data.isTrackSectionContinuation || data.isDefaultTrackSection) {
          sectionText =
            html.blank();
        } else {
          sectionText =
            language.$(capsule, 'inContent', {section: data.name});
        }
      }

      if (html.isBlank(sectionText)) {
        return html.blank();
      }

      const sectionPart =
        html.tag('span', {class: 'track-section-name'},
          sectionText);

      let detailText = html.blank();

      switch (slots.detail) {
        case 'count':
          detailText =
            language.$(capsule, 'detail.count', {
              count: language.countTracks(data.tracks),
            });

          break;

        case 'range':
          detailText =
            (data.firstTrackNumber === data.lastTrackNumber
              ? language.$(capsule, 'detail.range.one', {
                  number: data.firstTrackNumber,
                })
              : language.$(capsule, 'detail.range', {
                  start: data.firstTrackNumber,
                  end: data.lastTrackNumber,
                }));

          break;

        case 'duration':
          detailText =
            language.formatDuration(data.duration, {
              showApproximate: true,
            });

          break;
      }

      if (html.isBlank(detailText)) {
        return sectionPart;
      }

      return language.$(capsule, 'withDetail', {
        section:
          sectionPart,

        detail:
          html.tag('span', {class: 'track-section-detail'},
            language.$(capsule, 'detail', {detail: detailText})),
      });
    }),
};
