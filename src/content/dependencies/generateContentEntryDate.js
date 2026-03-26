import {sameDayAs} from '#wiki-data';

export default {
  relations: (relation, _entry) => ({
    textWithTooltip:
      relation('generateTextWithTooltip'),

    tooltip:
      relation('generateTooltip'),
  }),

  data: (entry) => ({
    isWikiEditorCommentary: entry.isWikiEditorCommentary,

    date: entry.date,
    secondDate: entry.secondDate,
    dateKind: entry.dateKind,

    accessDate: entry.accessDate,
    accessKind: entry.accessKind,

    sameDayAs:
      (entry.secondDate
        ? null
        : sameDayAs(entry.date, entry.thing)),

    thingDate: entry.thing.date,

    thingType:
      (entry.thing.isAlbum &&
       entry.thing.style === 'single'
        ? 'single'

     : entry.thing.isAlbum ? 'album'

     : entry.thing.isTrack &&
       entry.thing.date === entry.thing.album.date &&
       entry.thing.style === 'single'
        ? 'single'

     : entry.thing.isTrack &&
       entry.thing.date === entry.thing.album.date
        ? 'album'

     : entry.thing.isTrack ? 'track'

     : entry.thing.isFlash ? 'flash'

     : null),
  }),

  generate(data, relations, {html, language}) {
    const titleCapsule = language.encapsulate('misc.artistCommentary.entry.title');
    const dateCapsule = language.encapsulate(titleCapsule, 'date');
    const tooltip = relations.tooltip;

    tooltip.setSlots({
      attributes: {class: 'commentary-date-tooltip'},
      contentAttributes: [
        {[html.joinChildren]: html.tag('span', {class: 'cute-break'})},
      ],

      content: [
        data.sameDayAs === 'album' &&
          language.$(dateCapsule, 'sameDayAsAlbum'),

        data.sameDayAs === 'single' &&
          language.$(dateCapsule, 'sameDayAsSingle'),

        data.sameDayAs === 'track' &&
          language.$(dateCapsule, 'sameDayAsTrack'),

        data.sameDayAs === 'flash' &&
          language.$(dateCapsule, 'sameDayAsFlash'),

        data.sameDayAs === null &&
        data.date &&
        data.thingDate &&
        !data.secondDate &&
        !data.isWikiEditorCommentary &&
          html.tags([
            data.thingType &&
              html.tag('span', {class: 'relative-to'},
                language.$(dateCapsule, 'relativeTo', {
                  thing:
                    language.$(dateCapsule, 'relativeTo', data.thingType),
                })),

            html.tag('br'),

            language.formatRelativeDate(data.date, data.thingDate, {
              considerRoundingDays: true,
              approximate: true,
              absolute: false,
            }),
          ]),

        data.accessKind &&
        data.accessDate &&
          language.$(dateCapsule, data.accessKind, {
            date:
              language.formatDate(data.accessDate),
          }),
      ],
    });

    const willDisplayTooltip =
      !html.isBlank(tooltip);

    const topAttributes =
      {class: 'commentary-date'};

    const time =
      html.tag('time',
        {[html.onlyIfContent]: true},

        (willDisplayTooltip
          ? [
              {class: 'text-with-tooltip-interaction-cue'},
              {tabindex: '0'},
            ]
          : topAttributes),

        language.encapsulate(dateCapsule, workingCapsule => {
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

        tooltip: relations.tooltip,
      });
    } else {
      return time;
    }
  },
}
