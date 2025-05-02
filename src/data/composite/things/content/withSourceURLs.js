import {input, templateCompositeFrom} from '#composite';
import {parseContentNodes} from '#replacer';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withFilteredList, withMappedList} from '#composite/data';

import withAnnotationParts from './withAnnotationParts.js';

export default templateCompositeFrom({
  annotation: `withSourceURLs`,

  outputs: ['#sourceURLs'],

  steps: () => [
    withAnnotationParts({
      mode: input.value('nodes'),
    }),

    raiseOutputWithoutDependency({
      dependency: '#annotationParts',
      output: input.value({'#sourceURLs': []}),
    }),

    {
      dependencies: ['#annotationParts'],
      compute: (continuation, {
        ['#annotationParts']: annotationParts,
      }) => continuation({
        ['#firstPartWithExternalLink']:
          annotationParts
            .find(nodes => nodes
              .some(node => node.type === 'external-link')),
      }),
    },

    raiseOutputWithoutDependency({
      dependency: '#firstPartWithExternalLink',
      output: input.value({'#sourceURLs': []}),
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
    }).outputs({
      '#filteredList': '#externalLinks',
    }),

    withMappedList({
      list: '#externalLinks',
      map: input.value(node => node.data.href),
    }).outputs({
      '#mappedList': '#sourceURLs',
    }),
  ],
});
