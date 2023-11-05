// Controls how find.track works - it'll never be matched by a reference
// just to the track's name, which means you don't have to always reference
// some *other* (much more commonly referenced) track by directory instead
// of more naturally by name.

import {input, templateCompositeFrom} from '#composite';
import find from '#find';
import {isBoolean} from '#validators';

import {exitWithoutDependency, exposeUpdateValueOrContinue}
  from '#composite/control-flow';
import {withPropertyFromObject} from '#composite/data';
import {withResolvedReference} from '#composite/wiki-data';

export default templateCompositeFrom({
  annotation: `withAlwaysReferenceByDirectory`,

  outputs: ['#alwaysReferenceByDirectory'],

  steps: () => [
    exposeUpdateValueOrContinue({
      validate: input.value(isBoolean),
    }),

    // Remaining code is for defaulting to true if this track is a rerelease of
    // another with the same name, so everything further depends on access to
    // trackData as well as originalReleaseTrack.

    exitWithoutDependency({
      dependency: 'trackData',
      mode: input.value('empty'),
      value: input.value(false),
    }),

    exitWithoutDependency({
      dependency: 'originalReleaseTrack',
      value: input.value(false),
    }),

    // It's necessary to use the custom trackOriginalReleasesOnly find function
    // here, so as to avoid recursion issues - the find.track() function depends
    // on accessing each track's alwaysReferenceByDirectory, which means it'll
    // hit *this track* - and thus this step - and end up recursing infinitely.
    // By definition, find.trackOriginalReleasesOnly excludes tracks which have
    // an originalReleaseTrack update value set, which means even though it does
    // still access each of tracks' `alwaysReferenceByDirectory` property, it
    // won't access that of *this* track - it will never proceed past the
    // `exitWithoutDependency` step directly above, so there's no opportunity
    // for recursion.
    withResolvedReference({
      ref: 'originalReleaseTrack',
      data: 'trackData',
      find: input.value(find.trackOriginalReleasesOnly),
    }).outputs({
      '#resolvedReference': '#originalRelease',
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
