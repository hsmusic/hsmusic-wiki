import {input} from '#composite';
import {transposeArrays} from '#sugar';
import Thing from '#thing';
import {is, isDate} from '#validators';
import {parseDate} from '#yaml';

import {withFilteredList, withMappedList, withPropertyFromList}
  from '#composite/data';
import {contentString, simpleDate, soupyFind, thing}
  from '#composite/wiki-properties';

import {
  exitWithoutDependency,
  exposeConstant,
  exposeDependency,
  exposeDependencyOrContinue,
  exposeUpdateValueOrContinue,
  withResultOfAvailabilityCheck,
} from '#composite/control-flow';

import {
  contentArtists,
  hasAnnotationPart,
  withAnnotationPartNodeLists,
  withWebArchiveDate,
} from '#composite/things/content';

export class ContentEntry extends Thing {
  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    thing: thing(),

    artists: contentArtists(),

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
      exitWithoutDependency({
        dependency: '_accessDate',
      }),

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
        value: input.value('accessed'),
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

    isContentEntry: [
      exposeConstant({
        value: input.value(true),
      }),
    ],

    annotationParts: [
      withAnnotationPartNodeLists(),

      {
        dependencies: ['#annotationPartNodeLists'],
        compute: (continuation, {
          ['#annotationPartNodeLists']: nodeLists,
        }) => continuation({
          ['#firstNodes']:
            nodeLists.map(list => list.at(0)),

          ['#lastNodes']:
            nodeLists.map(list => list.at(-1)),
        }),
      },

      withPropertyFromList({
        list: '#firstNodes',
        property: input.value('i'),
      }).outputs({
        '#firstNodes.i': '#startIndices',
      }),

      withPropertyFromList({
        list: '#lastNodes',
        property: input.value('iEnd'),
      }).outputs({
        '#lastNodes.iEnd': '#endIndices',
      }),

      {
        dependencies: [
          'annotation',
          '#startIndices',
          '#endIndices',
        ],

        compute: ({
          ['annotation']: annotation,
          ['#startIndices']: startIndices,
          ['#endIndices']: endIndices,
        }) =>
          transposeArrays([startIndices, endIndices])
            .map(([start, end]) =>
              annotation.slice(start, end)),
      },
    ],

    sourceText: [
      withAnnotationPartNodeLists(),

      {
        dependencies: ['#annotationPartNodeLists'],
        compute: (continuation, {
          ['#annotationPartNodeLists']: nodeLists,
        }) => continuation({
          ['#firstPartWithExternalLink']:
            nodeLists
              .find(nodes => nodes
                .some(node => node.type === 'external-link')) ??
            null,
        }),
      },

      exitWithoutDependency({
        dependency: '#firstPartWithExternalLink',
      }),

      {
        dependencies: ['annotation', '#firstPartWithExternalLink'],
        compute: ({
          ['annotation']: annotation,
          ['#firstPartWithExternalLink']: nodes,
        }) =>
          annotation.slice(
            nodes.at(0).i,
            nodes.at(-1).iEnd),
      },
    ],

    sourceURLs: [
      withAnnotationPartNodeLists(),

      {
        dependencies: ['#annotationPartNodeLists'],
        compute: (continuation, {
          ['#annotationPartNodeLists']: nodeLists,
        }) => continuation({
          ['#firstPartWithExternalLink']:
            nodeLists
              .find(nodes => nodes
                .some(node => node.type === 'external-link')) ??
            null,
        }),
      },

      exitWithoutDependency({
        dependency: '#firstPartWithExternalLink',
        value: input.value([]),
      }),

      withMappedList({
        list: '#firstPartWithExternalLink',
        map: input.value(node => node.type === 'external-link'),
      }).outputs({
        '#mappedList': '#externalLinkFilter',
      }),

      withFilteredList({
        list: '#firstPartWithExternalLink',
        filter: '#externalLinkFilter',
      }),

      withMappedList({
        list: '#filteredList',
        map: input.value(node => node.data.href),
      }),

      exposeDependency({
        dependency: '#mappedList',
      }),
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
  static [Thing.wikiData] = 'commentaryData';

  static [Thing.getPropertyDescriptors] = () => ({
    // Expose only

    isCommentaryEntry: [
      exposeConstant({
        value: input.value(true),
      }),
    ],

    isWikiEditorCommentary: hasAnnotationPart({
      part: input.value('wiki editor'),
    }),
  });
}

export class LyricsEntry extends ContentEntry {
  static [Thing.wikiData] = 'lyricsData';

  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    originDetails: contentString(),

    // Expose only

    isLyricsEntry: [
      exposeConstant({
        value: input.value(true),
      }),
    ],

    isWikiLyrics: hasAnnotationPart({
      part: input.value('wiki lyrics'),
    }),

    helpNeeded: hasAnnotationPart({
      part: input.value('help needed'),
    }),

    hasSquareBracketAnnotations: [
      exitWithoutDependency({
        dependency: 'isWikiLyrics',
        mode: input.value('falsy'),
        value: input.value(false),
      }),

      exitWithoutDependency({
        dependency: 'body',
        value: input.value(false),
      }),

      {
        dependencies: ['body'],
        compute: ({body}) =>
          /\[.*\]/m.test(body),
      },
    ],
  });

  static [Thing.yamlDocumentSpec] = Thing.extendDocumentSpec(ContentEntry, {
    fields: {
      'Origin Details': {property: 'originDetails'},
    },
  });
}

export class CreditingSourcesEntry extends ContentEntry {
  static [Thing.wikiData] = 'creditingSourceData';

  static [Thing.getPropertyDescriptors] = () => ({
    // Expose only

    isCreditingSourcesEntry: [
      exposeConstant({
        value: input.value(true),
      }),
    ],
  });
}

export class ReferencingSourcesEntry extends ContentEntry {
  static [Thing.wikiData] = 'referencingSourceData';

  static [Thing.getPropertyDescriptors] = () => ({
    // Expose only

    isReferencingSourceEntry: [
      exposeConstant({
        value: input.value(true),
      }),
    ],
  });
}
