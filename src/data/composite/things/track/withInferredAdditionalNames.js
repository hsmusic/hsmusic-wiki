// Infers additional name entries from other releases that were titled
// differently, linking to the respective release via annotation.

import {input, templateCompositeFrom} from '#composite';
import {stitchArrays} from '#sugar';

import {raiseOutputWithoutDependency} from '#composite/control-flow';
import {withPropertiesFromList, withPropertyFromList} from '#composite/data';

import withOtherReleases from './withOtherReleases.js';

export default templateCompositeFrom({
  annotation: `withInferredAdditionalNames`,

  outputs: ['#inferredAdditionalNames'],

  steps: () => [
    withOtherReleases(),

    raiseOutputWithoutDependency({
      dependency: '#otherReleases',
      mode: input.value('empty'),
      output: input.value({'#inferredAdditionalNames': []}),
    }),

    {
      dependencies: ['#otherReleases', 'name'],
      compute: (continuation, {
        ['#otherReleases']: otherReleases,
        ['name']: name,
      }) => continuation({
        ['#differentlyNamedReleases']:
          otherReleases.filter(release => release.name !== name),
      }),
    },

    withPropertiesFromList({
      list: '#differentlyNamedReleases',
      properties: input.value(['name', 'directory', 'album']),
    }),

    withPropertyFromList({
      list: '#differentlyNamedReleases.album',
      property: input.value('name'),
    }),

    {
      dependencies: [
        '#differentlyNamedReleases.directory',
        '#differentlyNamedReleases.album.name',
      ],

      compute: (continuation, {
        ['#differentlyNamedReleases.directory']: trackDirectories,
        ['#differentlyNamedReleases.album.name']: albumNames,
      }) => continuation({
        ['#annotations']:
          stitchArrays({
            trackDirectory: trackDirectories,
            albumName: albumNames,
          }).map(({trackDirectory, albumName}) =>
              `[[track:${trackDirectory}|on ${albumName}]]`)
      })
    },

    {
      dependencies: ['#differentlyNamedReleases.name', '#annotations'],
      compute: (continuation, {
        ['#differentlyNamedReleases.name']: names,
        ['#annotations']: annotations,
      }) => continuation({
        ['#inferredAdditionalNames']:
          stitchArrays({
            name: names,
            annotation: annotations,
          }),
      }),
    },
  ],
});
