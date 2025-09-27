export default {
  relations: (relation, connection, _context) => ({
    trackLink:
      relation('linkTrack', connection.track),

    motifLink:
      relation('linkMotif', connection.motif),

    textWithTooltip:
      relation('generateTextWithTooltip'),

    tooltip:
      relation('generateTooltip'),
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

    abcNotation:
      connection.motif.abcNotation
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

        if (data.context !== 'motif' && data.abcNotation) {
          workingOptions.motif = relations.textWithTooltip.slots({
            text:
              workingOptions.motif.slots({
                attributes: {class: 'text-with-tooltip-interaction-cue'},
              }),

            tooltip:
              relations.tooltip.slots({
                attributes: {class: 'motif-preview-tooltip'},

                content:
                  html.tag('div', [
                    html.tag('span',
                      {class: 'motif-context'},
                      {[html.onlyIfContent]: true},
                      data.contextText
                    ),
                    html.tag('div', {class: 'abc-tip', 'data-notation': JSON.stringify(data.abcNotation)},
                      html.tag('div', {class: 'motif-sheet'})),
                  ])
              }),
          })
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

        return language.$(workingCapsule, workingOptions);
      })),
};

