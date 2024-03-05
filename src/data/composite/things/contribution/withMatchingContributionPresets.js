import {input, templateCompositeFrom} from '#composite';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';

import withContributionContext from './withContributionContext.js';

export default templateCompositeFrom({
  annotation: `withMatchingContributionPresets`,

  outputs: ['#matchingContributionPresets'],

  steps: () => [
    withPropertyFromObject({
      object: 'thing',
      property: input.value('wikiInfo'),
      internal: input.value(true),
    }),

    raiseOutputWithoutDependency({
      dependency: '#thing.wikiInfo',
      output: input.value({
        '#matchingContributionPresets': null,
      }),
    }),

    withPropertyFromObject({
      object: '#thing.wikiInfo',
      property: input.value('contributionPresets'),
    }).outputs({
      '#thing.wikiInfo.contributionPresets': '#contributionPresets',
    }),

    raiseOutputWithoutDependency({
      dependency: '#contributionPresets',
      mode: input.value('empty'),
      output: input.value({
        '#matchingContributionPresets': [],
      }),
    }),

    withContributionContext(),

    {
      dependencies: [
        '#contributionPresets',
        '#contributionTarget',
        '#contributionProperty',
        'annotation',
      ],

      compute: (continuation, {
        ['#contributionPresets']: presets,
        ['#contributionTarget']: target,
        ['#contributionProperty']: property,
        ['annotation']: annotation,
      }) => continuation({
        ['#matchingContributionPresets']:
          presets
            .filter(preset =>
              preset.context[0] === target &&
              preset.context.slice(1).includes(property) &&
              // For now, only match if the annotation is a complete match.
              // Partial matches (e.g. because the contribution includes "two"
              // annotations, separated by commas) don't count.
              preset.annotation === annotation),
      })
    },
  ],
});
