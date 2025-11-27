import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {splitContentNodesAround, withContentNodes} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `withAnnotationPartNodeLists`,

  outputs: ['#annotationPartNodeLists'],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: 'annotation',
      output: input.value({'#annotationPartNodeLists': []}),
    }),

    withContentNodes({
      from: 'annotation',
    }),

    splitContentNodesAround({
      nodes: '#contentNodes',
      around: input.value(/, */g),
    }).outputs({
      '#contentNodeLists': '#annotationPartNodeLists',
    }),
  ],
});
