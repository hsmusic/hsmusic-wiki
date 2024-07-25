import {input, templateCompositeFrom} from '#composite';
import {stitchArrays} from '#sugar';
import {isContentString, isString, looseArrayOf} from '#validators';

import {fillMissingListItems} from '#composite/data';

// Important note: These two kinds of inputs have the exact same shape!!
// This isn't on purpose (besides that they *are* both supposed to be strings).
// They just don't have any more particular validation, yet.

const inputDateList = defaultDependency =>
  input({
    validate: looseArrayOf(isString),
    defaultDependency,
  });

const inputKindList = defaultDependency =>
  input.staticDependency({
    validate: looseArrayOf(isString),
    defaultDependency: defaultDependency,
  });

export default templateCompositeFrom({
  annotation: `processContentEntryDates`,

  inputs: {
    annotations: input({
      validate: looseArrayOf(isContentString),
      defaultDependency: '#entries.annotation',
    }),

    dates: inputDateList('#entries.date'),
    secondDates: inputDateList('#entries.secondDate'),
    accessDates: inputDateList('#entries.accessDate'),

    dateKinds: inputKindList('#entries.dateKind'),
    accessKinds: inputKindList('#entries.accessKind'),
  },

  outputs: ({
    [input.staticDependency('dates')]: dates,
    [input.staticDependency('secondDates')]: secondDates,
    [input.staticDependency('accessDates')]: accessDates,
    [input.staticDependency('dateKinds')]: dateKinds,
    [input.staticDependency('accessKinds')]: accessKinds,
  }) => [
    dates ?? '#processedContentEntryDates',
    secondDates ?? '#processedContentEntrySecondDates',
    accessDates ?? '#processedContentEntryAccessDates',
    dateKinds ?? '#processedContentEntryDateKinds',
    accessKinds ?? '#processedContentEntryAccessKinds',
  ],

  steps: () => [
    {
      dependencies: [input('annotations')],
      compute: (continuation, {
        [input('annotations')]: annotations,
      }) => continuation({
        ['#webArchiveDates']:
          annotations
            .map(text => text?.match(/https?:\/\/web.archive.org\/web\/([0-9]{8,8})[0-9]*\//))
            .map(match => match?.[1])
            .map(dateText =>
              (dateText
                ? dateText.slice(0, 4) + '/' +
                  dateText.slice(4, 6) + '/' +
                  dateText.slice(6, 8)
                : null)),
      }),
    },

    {
      dependencies: [input('dates')],
      compute: (continuation, {
        [input('dates')]: dates,
      }) => continuation({
        ['#processedContentEntryDates']:
          dates
            .map(date => date ? new Date(date) : null),
      }),
    },

    {
      dependencies: [input('secondDates')],
      compute: (continuation, {
        [input('secondDates')]: secondDates,
      }) => continuation({
        ['#processedContentEntrySecondDates']:
          secondDates
            .map(date => date ? new Date(date) : null),
      }),
    },

    fillMissingListItems({
      list: input('dateKinds'),
      fill: input.value(null),
    }).outputs({
      '#list': '#processedContentEntryDateKinds',
    }),

    {
      dependencies: [input('accessDates'), '#webArchiveDates'],
      compute: (continuation, {
        [input('accessDates')]: accessDates,
        ['#webArchiveDates']: webArchiveDates,
      }) => continuation({
        ['#processedContentEntryAccessDates']:
          stitchArrays({
            accessDate: accessDates,
            webArchiveDate: webArchiveDates
          }).map(({accessDate, webArchiveDate}) =>
              accessDate ??
              webArchiveDate ??
              null)
            .map(date => date ? new Date(date) : date),
      }),
    },

    {
      dependencies: [input('accessKinds'), '#webArchiveDates'],
      compute: (continuation, {
        [input('accessKinds')]: accessKinds,
        ['#webArchiveDates']: webArchiveDates,
      }) => continuation({
        ['#processedContentEntryAccessKinds']:
          stitchArrays({
            accessKind: accessKinds,
            webArchiveDate: webArchiveDates,
          }).map(({accessKind, webArchiveDate}) =>
              accessKind ??
              (webArchiveDate && 'captured') ??
              null),
      }),
    },

    // TODO: Annoying conversion step for outputs, would be nice to avoid.
    {
      dependencies: [
        '#processedContentEntryDates',
        '#processedContentEntrySecondDates',
        '#processedContentEntryAccessDates',
        '#processedContentEntryDateKinds',
        '#processedContentEntryAccessKinds',
        input.staticDependency('dates'),
        input.staticDependency('secondDates'),
        input.staticDependency('accessDates'),
        input.staticDependency('dateKinds'),
        input.staticDependency('accessKinds'),
      ],

      compute: (continuation, {
        ['#processedContentEntryDates']: processedContentEntryDates,
        ['#processedContentEntrySecondDates']: processedContentEntrySecondDates,
        ['#processedContentEntryAccessDates']: processedContentEntryAccessDates,
        ['#processedContentEntryDateKinds']: processedContentEntryDateKinds,
        ['#processedContentEntryAccessKinds']: processedContentEntryAccessKinds,
        [input.staticDependency('dates')]: dates,
        [input.staticDependency('secondDates')]: secondDates,
        [input.staticDependency('accessDates')]: accessDates,
        [input.staticDependency('dateKinds')]: dateKinds,
        [input.staticDependency('accessKinds')]: accessKinds,
      }) => continuation({
        [dates ?? '#processedContentEntryDates']:
          processedContentEntryDates,

        [secondDates ?? '#processedContentEntrySecondDates']:
          processedContentEntrySecondDates,

        [accessDates ?? '#processedContentEntryAccessDates']:
          processedContentEntryAccessDates,

        [dateKinds ?? '#processedContentEntryDateKinds']:
          processedContentEntryDateKinds,

        [accessKinds ?? '#processedContentEntryAccessKinds']:
          processedContentEntryAccessKinds,
      }),
    },
  ],
});
