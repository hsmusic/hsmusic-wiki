// Controls how find.track works - it'll never be matched by a reference
// just to the track's name, which means you don't have to always reference
// some *other* (much more commonly referenced) track by directory instead
// of more naturally by name.

import {input, templateCompositeFrom} from '#composite';
import {isBoolean} from '#validators';
import {getKebabCase} from '#wiki-data';

import {withPropertyFromObject} from '#composite/data';

import {
  exitWithoutDependency,
  exposeDependencyOrContinue,
  exposeUpdateValueOrContinue,
} from '#composite/control-flow';

import withMainReleaseTrack from './withMainReleaseTrack.js';
import withPropertyFromAlbum from './withPropertyFromAlbum.js';

export default templateCompositeFrom({
  annotation: `alwaysReferenceByDirectory`,

  compose: false,

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

    exitWithoutDependency({
      dependency: 'mainRelease',
      value: input.value(false),
    }),

    withMainReleaseTrack(),

    exitWithoutDependency({
      dependency: '#mainReleaseTrack',
      value: input.value(false),
    }),

    withPropertyFromObject({
      object: '#mainReleaseTrack',
      property: input.value('name'),
    }),

    {
      dependencies: ['name', '#mainReleaseTrack.name'],
      compute: ({
        ['name']: name,
        ['#mainReleaseTrack.name']: mainReleaseName,
      }) =>
        getKebabCase(name) ===
        getKebabCase(mainReleaseName),
    },
  ],
});
