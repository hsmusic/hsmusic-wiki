// Compiles additional names directly provided by other releases.

import {input, templateCompositeFrom} from '#composite';

import {exitWithoutDependency, exposeDependency}
  from '#composite/control-flow';
import {withFlattenedList, withPropertyFromList} from '#composite/data';

import withOtherReleases from './withOtherReleases.js';

export default templateCompositeFrom({
  annotation: `sharedAdditionalNameList`,

  compose: false,

  steps: () => [
    withOtherReleases(),

    exitWithoutDependency({
      dependency: '#otherReleases',
      mode: input.value('empty'),
      value: input.value([]),
    }),

    withPropertyFromList({
      list: '#otherReleases',
      property: input.value('additionalNames'),
    }),

    withFlattenedList({
      list: '#otherReleases.additionalNames',
    }),

    exposeDependency({
      dependency: '#flattenedList',
    }),
  ],
});
