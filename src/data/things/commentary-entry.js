import {input} from '#composite';
import find from '#find';
import Thing from '#thing';
import {is, isDate} from '#validators';
import {parseDate} from '#yaml';

import {contentString, referenceList, simpleDate, soupyFind, thing}
  from '#composite/wiki-properties';

import {
  exposeConstant,
  exposeDependencyOrContinue,
  exposeUpdateValueOrContinue,
  withResultOfAvailabilityCheck,
} from '#composite/control-flow';

import {withWebArchiveDate} from '#composite/things/commentary-entry';

export class CommentaryEntry extends Thing {
  static [Thing.getPropertyDescriptors] = ({Artist}) => ({
    // Update & expose

    thing: thing(),

    artists: referenceList({
      class: input.value(Artist),
      find: soupyFind.input('artist'),
    }),

    artistText: contentString(),

    annotation: contentString(),

    dateKind: {
      flags: {update: true, expose: true},

      update: {
        validate: is(...[
          'sometime',
          'throughout',
          'around',
        ]),
      },
    },

    accessKind: [
      exposeUpdateValueOrContinue({
        validate: input.value(
          is(...[
            'captured',
            'accessed',
          ])),
      }),

      withWebArchiveDate(),

      withResultOfAvailabilityCheck({
        from: '#webArchiveDate',
      }),

      {
        dependencies: ['#availability'],
        compute: (continuation, {['#availability']: availability}) =>
          (availability
            ? continuation.exit('captured')
            : continuation()),
      },

      exposeConstant({
        value: input.value(null),
      }),
    ],

    date: simpleDate(),

    secondDate: simpleDate(),

    accessDate: [
      exposeUpdateValueOrContinue({
        validate: input.value(isDate),
      }),

      withWebArchiveDate(),

      exposeDependencyOrContinue({
        dependency: '#webArchiveDate',
      }),

      exposeConstant({
        value: input.value(null),
      }),
    ],

    body: contentString(),

    // Update only

    find: soupyFind(),
  });

  static [Thing.yamlDocumentSpec] = {
    fields: {
      'Artists': {property: 'artists'},
      'Artist Text': {property: 'artistText'},

      'Annotation': {property: 'annotation'},

      'Date Kind': {property: 'dateKind'},
      'Access Kind': {property: 'accessKind'},

      'Date': {property: 'date', transform: parseDate},
      'Second Date': {property: 'secondDate', transform: parseDate},
      'Access Date': {property: 'accessDate', transform: parseDate},

      'Body': {property: 'body'},
    },
  };
}
