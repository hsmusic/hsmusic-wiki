// Controls how find.track works - it'll never be matched by a reference
// just to the track's name, which means you don't have to always reference
// some *other* (much more commonly referenced) track by directory instead
// of more naturally by name.

import {input, templateCompositeFrom} from '#composite';
import find from '#find';
import {isBoolean} from '#validators';

import {withPropertyFromObject} from '#composite/data';
import {withResolvedReference} from '#composite/wiki-data';
import {soupyFind} from '#composite/wiki-properties';

import {
  exitWithoutDependency,
  exposeDependencyOrContinue,
  exposeUpdateValueOrContinue,
} from '#composite/control-flow';

import withPropertyFromAlbum from './withPropertyFromAlbum.js';

export default templateCompositeFrom({
  annotation: `withAlwaysReferenceByDirectory`,

  outputs: ['#alwaysReferenceByDirectory'],

  steps: () => [
    exposeUpdateValueOrContinue({
      validate: input.value(isBoolean),
    }),

    withPropertyFromAlbum({
      property: input.value('alwaysReferenceTracksByDirectory'),
    }),

    // Falsy mode means this exposes true if the album's property is true,
    // but continues if the property is false (which is also the default).
    exposeDependencyOrContinue({
      dependency: '#album.alwaysReferenceTracksByDirectory',
      mode: input.value('falsy'),
    }),

    // Remaining code is for defaulting to true if this track is a rerelease of
    // another with the same name, so everything further depends on access to
    // trackData as well as mainReleaseTrack.

    exitWithoutDependency({
      dependency: 'trackData',
      mode: input.value('empty'),
      value: input.value(false),
    }),

    exitWithoutDependency({
      dependency: 'mainReleaseTrack',
      value: input.value(false),
    }),

    // It's necessary to use the custom trackMainReleasesOnly find function
    // here, so as to avoid recursion issues - the find.track() function depends
    // on accessing each track's alwaysReferenceByDirectory, which means it'll
    // hit *this track* - and thus this step - and end up recursing infinitely.
    // By definition, find.trackMainReleasesOnly excludes tracks which have
    // an mainReleaseTrack update value set, which means even though it does
    // still access each of tracks' `alwaysReferenceByDirectory` property, it
    // won't access that of *this* track - it will never proceed past the
    // `exitWithoutDependency` step directly above, so there's no opportunity
    // for recursion.
    withResolvedReference({
      ref: 'mainReleaseTrack',
      data: 'trackData',
      find: input.value(find.trackMainReleasesOnly),
    }).outputs({
      '#resolvedReference': '#mainRelease',
    }),

    exitWithoutDependency({
      dependency: '#mainRelease',
      value: input.value(false),
    }),

    withPropertyFromObject({
      object: '#mainRelease',
      property: input.value('name'),
    }),

    {
      dependencies: ['name', '#mainRelease.name'],
      compute: (continuation, {
        name,
        ['#mainRelease.name']: mainReleaseName,
      }) => continuation({
        ['#alwaysReferenceByDirectory']:
          name === mainReleaseName,
      }),
    },
  ],
});
