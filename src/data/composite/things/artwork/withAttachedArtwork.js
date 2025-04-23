import {input, templateCompositeFrom} from '#composite';

import {flipFilter, raiseOutputWithoutDependency}
  from '#composite/control-flow';
import {withNearbyItemFromList, withPropertyFromList} from '#composite/data';

import withContainingArtworkList from './withContainingArtworkList.js';

export default templateCompositeFrom({
  annotaion: `withContribsFromMainArtwork`,

  outputs: ['#attachedArtwork'],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: 'attachAbove',
      mode: input.value('falsy'),
      output: input.value({'#attachedArtwork': null}),
    }),

    withContainingArtworkList(),

    withPropertyFromList({
      list: '#containingArtworkList',
      property: input.value('attachAbove'),
    }),

    flipFilter({
      filter: '#containingArtworkList.attachAbove',
    }).outputs({
      '#containingArtworkList.attachAbove': '#filterNotAttached',
    }),

    withNearbyItemFromList({
      list: '#containingArtworkList',
      item: input.myself(),
      offset: input.value(-1),
      filter: '#filterNotAttached',
    }).outputs({
      '#nearbyItem': '#attachedArtwork',
    }),
  ],
});
