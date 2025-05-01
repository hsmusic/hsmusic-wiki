import {input} from '#composite';
import find from '#find';
import Thing from '#thing';
import {is, isDate} from '#validators';
import {parseDate} from '#yaml';

import {contentString, referenceList, simpleDate, soupyFind, thing}
  from '#composite/wiki-properties';

import {
  exposeConstant,
  exposeDependency,
  exposeDependencyOrContinue,
  exposeUpdateValueOrContinue,
  withResultOfAvailabilityCheck,
} from '#composite/control-flow';

import {
  hasAnnotationPart,
  withAnnotationParts,
  withSourceText,
  withSourceURLs,
  withWebArchiveDate,
} from '#composite/things/content';

export class ContentEntry extends Thing {
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

    // Expose only

    annotationParts: [
      withAnnotationParts({
        mode: input.value('strings'),
      }),

      exposeDependency({dependency: '#annotationParts'}),
    ],

    sourceText: [
      withSourceText(),
      exposeDependency({dependency: '#sourceText'}),
    ],

    sourceURLs: [
      withSourceURLs(),
      exposeDependency({dependency: '#sourceURLs'}),
    ],
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

export class CommentaryEntry extends ContentEntry {
  static [Thing.getPropertyDescriptors] = () => ({
    // Expose only

    isWikiEditorCommentary: hasAnnotationPart({
      part: input.value('wiki editor'),
    }),
  });
}

export class LyricsEntry extends ContentEntry {
  static [Thing.getPropertyDescriptors] = () => ({
    // Expose only

    isWikiLyrics: hasAnnotationPart({
      part: input.value('wiki lyrics'),
    }),
  });
}

export class CreditingSourcesEntry extends ContentEntry {}
