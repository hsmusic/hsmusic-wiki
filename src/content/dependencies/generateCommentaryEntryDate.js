export default {
  contentDependencies: ['generateTextWithTooltip', 'generateTooltip'],
  extraDependencies: ['html', 'language'],

  relations: (relation, _entry) => ({
    textWithTooltip:
      relation('generateTextWithTooltip'),

    tooltip:
      relation('generateTooltip'),
  }),

  data: (entry) => ({
    date: entry.date,
    secondDate: entry.secondDate,
    dateKind: entry.dateKind,

    accessDate: entry.accessDate,
    accessKind: entry.accessKind,
  }),

  generate(data, relations, {html, language}) {
    const titleCapsule = language.encapsulate('misc.artistCommentary.entry.title');

    const willDisplayTooltip =
      !!(data.accessKind && data.accessDate);

    const topAttributes =
      {class: 'commentary-date'};

    const time =
      html.tag('time',
        {[html.onlyIfContent]: true},

        (willDisplayTooltip
          ? {class: 'text-with-tooltip-interaction-cue'}
          : topAttributes),

        language.encapsulate(titleCapsule, 'date', workingCapsule => {
          const workingOptions = {};

          if (!data.date) {
            return html.blank();
          }

          const rangeNeeded =
            data.dateKind === 'sometime' ||
            data.dateKind === 'throughout';

          if (rangeNeeded && !data.secondDate) {
            workingOptions.date = language.formatDate(data.date);
            return language.$(workingCapsule, workingOptions);
          }

          if (data.dateKind) {
            workingCapsule += '.' + data.dateKind;
          }

          if (data.secondDate) {
            workingCapsule += '.range';
            workingOptions.dateRange =
              language.formatDateRange(data.date, data.secondDate);
          } else {
            workingOptions.date =
              language.formatDate(data.date);
          }

          return language.$(workingCapsule, workingOptions);
        }));

    if (willDisplayTooltip) {
      return relations.textWithTooltip.slots({
        customInteractionCue: true,

        attributes: topAttributes,
        text: time,

        tooltip:
          relations.tooltip.slots({
            attributes: {class: 'commentary-date-tooltip'},

            content:
              language.$(titleCapsule, 'date', data.accessKind, {
                date:
                  language.formatDate(data.accessDate),
              }),
          }),
      });
    } else {
      return time;
    }
  },
}
