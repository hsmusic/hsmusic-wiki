// Clones all the things in a list. If the 'assign' input is provided,
// all new things are assigned the same specified properties. If the
// 'assignEach' input is provided, each new thing is assigned the
// corresponding properties.

import {input, templateCompositeFrom} from '#composite';
import Thing from '#thing';
import {isObject, isThingClass, sparseArrayOf} from '#validators';

import {withMappedList} from '#composite/data';

export default templateCompositeFrom({
  annotation: `withClonedThings`,

  inputs: {
    things: input({type: 'array'}),

    reclass: input({
      validate: isThingClass,
      defaultValue: null,
    }),

    reclassUnder: input({
      validate: isThingClass,
      defaultValue: null,
    }),

    assign: input({
      type: 'object',
      defaultValue: null,
    }),

    assignEach: input({
      validate: sparseArrayOf(isObject),
      defaultValue: null,
    }),
  },

  outputs: ['#clonedThings'],

  steps: () => [
    {
      dependencies: [input('assign'), input('assignEach')],
      compute: (continuation, {
        [input('assign')]: assign,
        [input('assignEach')]: assignEach,
      }) => continuation({
        ['#assignmentMap']:
          (index) =>
            (assign && assignEach
              ? {...assignEach[index] ?? {}, ...assign}
           : assignEach
              ? assignEach[index] ?? {}
              : assign ?? {}),
      }),
    },

    {
      dependencies: [input('reclass'), input('reclassUnder')],
      compute: (continuation, {
        [input('reclass')]: reclass,
        [input('reclassUnder')]: reclassUnder,
      }) => continuation({
        ['#cloneOperation']:
          (reclassUnder && reclass
            ? source => reclassUnder.clone(source, {as: reclass})
         : reclass
            ? source => Thing.clone(source, {as: reclass})
            : source => Thing.clone(source)),
      }),
    },

    {
      dependencies: ['#assignmentMap', '#cloneOperation'],
      compute: (continuation, {
        ['#assignmentMap']: assignmentMap,
        ['#cloneOperation']: cloneOperation,
      }) => continuation({
        ['#cloningMap']:
          (thing, index) =>
            Object.assign(cloneOperation(thing), assignmentMap(index)),
      }),
    },

    withMappedList({
      list: input('things'),
      map: '#cloningMap',
    }).outputs({
      '#mappedList': '#clonedThings',
    }),
  ],
});
