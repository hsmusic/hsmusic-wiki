// Controls how find.track works - it'll never be matched by a reference
// just to the track's name, which means you don't have to always reference
// some *other* (much more commonly referenced) track by directory instead
// of more naturally by name.

import {input, templateCompositeFrom} from '#composite';
import {isBoolean} from '#validators';

import {exitWithoutDependency, exposeUpdateValueOrContinue}
  from '#composite/control-flow';
import {excludeFromList, withPropertyFromObject} from '#composite/data';

import withOriginalRelease from './withOriginalRelease.js';

export default templateCompositeFrom({
  annotation: `withAlwaysReferenceByDirectory`,

  outputs: ['#alwaysReferenceByDirectory'],

  steps: () => [
    exposeUpdateValueOrContinue({
      validate: input.value(isBoolean),
    }),

    excludeFromList({
      list: 'trackData',
      item: input.myself(),
    }),

    withOriginalRelease({
      data: '#trackData',
    }),

    exitWithoutDependency({
      dependency: '#originalRelease',
      value: input.value(false),
    }),

    withPropertyFromObject({
      object: '#originalRelease',
      property: input.value('name'),
    }),

    {
      dependencies: ['name', '#originalRelease.name'],
      compute: (continuation, {
        name,
        ['#originalRelease.name']: originalName,
      }) => continuation({
        ['#alwaysReferenceByDirectory']: name === originalName,
      }),
    },
  ],
});
