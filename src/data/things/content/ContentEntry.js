import {input, V} from '#composite';
import {transposeArrays} from '#sugar';
import Thing from '#thing';
import {is, isDate, validateReferenceList} from '#validators';
import {parseDate} from '#yaml';

import {withFilteredList, withMappedList, withPropertyFromList}
  from '#composite/data';
import {withResolvedReferenceList} from '#composite/wiki-data';
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
  withAnnotationPartNodeLists,
  withExpressedOrImplicitArtistReferences,
  withWebArchiveDate,
} from '#composite/things/content';

export class ContentEntry extends Thing {
  static [Thing.friendlyName] = `Content Entry`;

  static [Thing.getPropertyDescriptors] = () => ({
    // Update & expose

    thing: thing(),

    artists: [
      withExpressedOrImplicitArtistReferences({
        from: input.updateValue({
          validate: validateReferenceList('artist'),
        }),
      }),

      exitWithoutDependency('#artistReferences', V([])),

      withResolvedReferenceList({
        list: '#artistReferences',
        find: soupyFind.input('artist'),
      }),

      exposeDependency('#resolvedReferenceList'),
    ],

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
      exitWithoutDependency('accessDate'),

      exposeUpdateValueOrContinue({
        validate: input.value(
          is(...[
            'captured',
            'accessed',
          ])),
      }),

      withWebArchiveDate(),

      withResultOfAvailabilityCheck({from: '#webArchiveDate'}),

      {
        dependencies: ['#availability'],
        compute: (continuation, {['#availability']: availability}) =>
          (availability
            ? continuation.exit('captured')
            : continuation()),
      },

      exposeConstant(V('accessed')),
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

      exposeConstant(V(null)),
    ],

    body: contentString(),

    // Update only

    find: soupyFind(),

    // Expose only

    isContentEntry: exposeConstant(V(true)),

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

      withPropertyFromList('#firstNodes', V('i'))
        .outputs({'#firstNodes.i': '#startIndices'}),

      withPropertyFromList('#lastNodes', V('iEnd'))
        .outputs({'#lastNodes.iEnd': '#endIndices'}),

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

      exitWithoutDependency('#firstPartWithExternalLink'),

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

      exitWithoutDependency('#firstPartWithExternalLink', V([])),

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

      exposeDependency('#mappedList'),
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
