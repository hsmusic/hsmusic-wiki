export default {
  relations: (relation, connection, _context) => ({
    trackLink:
      relation('linkTrack', connection.track),

    motifLink:
      relation('linkMotif', connection.motif),
  }),

  data: (connection, context) => ({
    context:
      context.isTrack ? 'track' : 'motif',

    contextText:
      connection.context,

    trackDuration:
      connection.track.duration,

    startTime:
      connection.startTime,

    endTime:
      connection.endTime,
  }),

  generate: (data, relations, {html, language}) =>
    html.tag('li',
      language.encapsulate('motifConnectionList.item', workingCapsule => {
        const workingOptions = {};

        if (data.context === 'motif') {
          workingCapsule += '.track';
          workingOptions.track = relations.trackLink;
        } else {
          workingCapsule += '.motif';
          workingOptions.motif = relations.motifLink;
        }

        if (
          typeof data.startTime === 'number' &&
          typeof data.endTime === 'number'
        ) {
          workingCapsule += '.withTimeRange';
          workingOptions.timeRange =
            language.formatTimeIntoDurationRange(
              data.startTime,
              data.endTime,
              data.trackDuration);
        }

        if (data.contextText) {
          workingCapsule += '.withContext';
          workingOptions.context = data.contextText
        }

        return language.$(workingCapsule, workingOptions);
      })),
};

