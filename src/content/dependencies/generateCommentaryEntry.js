import {empty} from '#sugar';

export default {
  contentDependencies: [
    'generateColorStyleAttribute',
    'generateTextWithTooltip',
    'generateTooltip',
    'linkArtist',
    'transformContent',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, entry) => ({
    artistLinks:
      (!empty(entry.artists) && !entry.artistDisplayText
        ? entry.artists
            .map(artist => relation('linkArtist', artist))
        : null),

    artistsContent:
      (entry.artistDisplayText
        ? relation('transformContent', entry.artistDisplayText)
        : null),

    annotationContent:
      (entry.annotation
        ? relation('transformContent', entry.annotation)
        : null),

    bodyContent:
      (entry.body
        ? relation('transformContent', entry.body)
        : null),

    colorStyle:
      relation('generateColorStyleAttribute'),

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

  slots: {
    color: {validate: v => v.isColor},
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('misc.artistCommentary.entry', entryCapsule =>
      html.tags([
        html.tag('p', {class: 'commentary-entry-heading'},
          slots.color &&
            relations.colorStyle.clone()
              .slot('color', slots.color),

          language.encapsulate(entryCapsule, 'title', titleCapsule => [
            html.tag('span', {class: 'commentary-entry-heading-text'},
              language.encapsulate(titleCapsule, workingCapsule => {
                const workingOptions = {};

                workingOptions.artists =
                  html.tag('span', {class: 'commentary-entry-artists'},
                    (relations.artistsContent
                      ? relations.artistsContent.slot('mode', 'inline')
                   : relations.artistLinks
                      ? language.formatConjunctionList(relations.artistLinks)
                      : language.$(titleCapsule, 'noArtists')));

                const accent =
                  html.tag('span', {class: 'commentary-entry-accent'},
                    {[html.onlyIfContent]: true},

                    language.encapsulate(titleCapsule, 'accent', accentCapsule =>
                      language.encapsulate(accentCapsule, workingCapsule => {
                        const workingOptions = {};

                        if (relations.annotationContent) {
                          workingCapsule += '.withAnnotation';
                          workingOptions.annotation =
                            relations.annotationContent.slot('mode', 'inline');
                        }

                        if (workingCapsule === accentCapsule) {
                          return html.blank();
                        } else {
                          return language.$(workingCapsule, workingOptions);
                        }
                      })));

                if (!html.isBlank(accent)) {
                  workingCapsule += '.withAccent';
                  workingOptions.accent = accent;
                }

                return language.$(workingCapsule, workingOptions);
              })),

            relations.textWithTooltip.slots({
              attributes: {class: 'commentary-date'},

              customInteractionCue: true,

              text:
                html.tag('time',
                  {class: 'text-with-tooltip-interaction-cue'},
                  {[html.onlyIfContent]: true},

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
                  })),

              tooltip:
                data.accessKind &&
                  relations.tooltip.slots({
                    attributes: {class: 'commentary-date-tooltip'},

                    content:
                      language.$(titleCapsule, 'date', data.accessKind, {
                        date:
                          language.formatDate(data.accessDate),
                      }),
                  }),
            }),
          ])),

        html.tag('blockquote', {class: 'commentary-entry-body'},
          slots.color &&
            relations.colorStyle.clone()
              .slot('color', slots.color),

          relations.bodyContent.slot('mode', 'multiline')),
      ])),
};
