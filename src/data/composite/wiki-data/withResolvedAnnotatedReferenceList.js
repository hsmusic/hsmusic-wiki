import {input, templateCompositeFrom} from '#composite';
import {stitchArrays} from '#sugar';
import {isObject, validateArrayItems} from '#validators';

import {withPropertyFromList} from '#composite/data';

import {raiseOutputWithoutDependency, withAvailabilityFilter}
  from '#composite/control-flow';

import inputSoupyFind from './inputSoupyFind.js';
import inputNotFoundMode from './inputNotFoundMode.js';
import inputWikiData from './inputWikiData.js';
import raiseResolvedReferenceList from './raiseResolvedReferenceList.js';
import withResolvedReferenceList from './withResolvedReferenceList.js';

export default templateCompositeFrom({
  annotation: `withResolvedAnnotatedReferenceList`,

  inputs: {
    list: input({
      validate: validateArrayItems(isObject),
      acceptsNull: true,
    }),

    reference: input({type: 'string', defaultValue: 'reference'}),
    annotation: input({type: 'string', defaultValue: 'annotation'}),
    thing: input({type: 'string', defaultValue: 'thing'}),

    data: inputWikiData({allowMixedTypes: true}),
    find: inputSoupyFind(),

    notFoundMode: inputNotFoundMode(),
  },

  outputs: ['#resolvedAnnotatedReferenceList'],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: input('list'),
      mode: input.value('empty'),
      output: input.value({
        ['#resolvedAnnotatedReferenceList']: [],
      }),
    }),

    withPropertyFromList({
      list: input('list'),
      property: input('reference'),
    }).outputs({
      ['#values']: '#references',
    }),

    withPropertyFromList({
      list: input('list'),
      property: input('annotation'),
    }).outputs({
      ['#values']: '#annotations',
    }),

    withResolvedReferenceList({
      list: '#references',
      data: input('data'),
      find: input('find'),
      notFoundMode: input.value('null'),
    }),

    {
      dependencies: [
        input('thing'),
        input('annotation'),
        '#resolvedReferenceList',
        '#annotations',
      ],

      compute: (continuation, {
        [input('thing')]: thingProperty,
        [input('annotation')]: annotationProperty,
        ['#resolvedReferenceList']: things,
        ['#annotations']: annotations,
      }) => continuation({
        ['#matches']:
          stitchArrays({
            [thingProperty]: things,
            [annotationProperty]: annotations,
          }),
      }),
    },

    withAvailabilityFilter({
      from: '#resolvedReferenceList',
    }),

    raiseResolvedReferenceList({
      notFoundMode: input('notFoundMode'),
      results: '#matches',
      filter: '#availabilityFilter',
      outputs: input.value('#resolvedAnnotatedReferenceList'),
    }),
  ],
})
