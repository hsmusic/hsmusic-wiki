import * as marked from 'marked';

import {input, templateCompositeFrom} from '#composite';
import {matchMarkdownLinks} from '#wiki-data';

import {raiseOutputWithoutDependency} from '#composite/control-flow';

export default templateCompositeFrom({
  annotation: `withSourceText`,

  outputs: ['#sourceText'],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: 'annotation',
      output: input.value({'#sourceText': null}),
    }),

    {
      dependencies: ['annotation'],
      compute: (continuation, {
        ['annotation']: annotation,
      }) => continuation({
        ['#matches']:
          Array.from(matchMarkdownLinks(annotation, {marked})),
      }),
    },

    raiseOutputWithoutDependency({
      dependency: '#matches',
      output: input.value({'#sourceText': null}),
      mode: input.value('empty'),
    }),

    {
      dependencies: ['#matches'],
      compute: (continuation, {
        ['#matches']: matches,
      }) =>
        continuation({
          ['#startIndex']:
            matches.at(0).index,

          ['#endIndex']:
            matches.at(-1).index +
            matches.at(-1).length,
        }),
    },

    {
      dependencies: ['annotation', '#endIndex'],
      compute: (continuation, {
        ['annotation']: annotation,
        ['#endIndex']: endIndex,
      }) => continuation({
        ['#rest']:
          annotation.slice(endIndex)
            .match(/^[^,]*(?=,|$)/),
      }),
    },

    {
      dependencies: ['annotation', '#startIndex', '#endIndex', '#rest'],
      compute: (continuation, {
        ['annotation']: annotation,
        ['#startIndex']: startIndex,
        ['#endIndex']: endIndex,
        ['#rest']: rest,
      }) => continuation({
        ['#sourceText']:
          annotation.slice(startIndex, startIndex + endIndex) +
          rest,
      }),
    },
  ],
});
