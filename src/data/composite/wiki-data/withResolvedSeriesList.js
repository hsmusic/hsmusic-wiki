import {input, templateCompositeFrom} from '#composite';
import find from '#find';
import {stitchArrays} from '#sugar';
import {isSeriesList, validateThing} from '#validators';

import {raiseOutputWithoutDependency} from '#composite/control-flow';

import {
  fillMissingListItems,
  withFlattenedList,
  withUnflattenedList,
  withPropertiesFromList,
} from '#composite/data';

import withResolvedReferenceList from './withResolvedReferenceList.js';

export default templateCompositeFrom({
  annotation: `withResolvedSeriesList`,

  inputs: {
    group: input({
      validate: validateThing({referenceType: 'group'}),
    }),

    list: input({
      validate: isSeriesList,
      acceptsNull: true,
    }),
  },

  outputs: ['#resolvedSeriesList'],

  steps: () => [
    raiseOutputWithoutDependency({
      dependency: input('list'),
      mode: input.value('empty'),
      output: input.value({
        ['#resolvedSeriesList']: [],
      }),
    }),

    withPropertiesFromList({
      list: input('list'),
      prefix: input.value('#serieses'),
      properties: input.value([
        'name',
        'description',
        'albums',

        'showAlbumArtists',
      ]),
    }),

    fillMissingListItems({
      list: '#serieses.albums',
      fill: input.value([]),
    }),

    withFlattenedList({
      list: '#serieses.albums',
    }),

    withResolvedReferenceList({
      list: '#flattenedList',
      data: 'albumData',
      find: input.value(find.album),
      notFoundMode: input.value('null'),
    }),

    withUnflattenedList({
      list: '#resolvedReferenceList',
    }).outputs({
      '#unflattenedList': '#serieses.albums',
    }),

    fillMissingListItems({
      list: '#serieses.description',
      fill: input.value(null),
    }),

    fillMissingListItems({
      list: '#serieses.showAlbumArtists',
      fill: input.value(null),
    }),

    {
      dependencies: [
        '#serieses.name',
        '#serieses.description',
        '#serieses.albums',

        '#serieses.showAlbumArtists',
      ],

      compute: (continuation, {
        ['#serieses.name']: name,
        ['#serieses.description']: description,
        ['#serieses.albums']: albums,

        ['#serieses.showAlbumArtists']: showAlbumArtists,
      }) => continuation({
        ['#seriesProperties']:
          stitchArrays({
            name,
            description,
            albums,

            showAlbumArtists,
          }).map(properties => ({
              ...properties,
              group: input
            }))
      }),
    },

    {
      dependencies: ['#seriesProperties', input('group')],
      compute: (continuation, {
        ['#seriesProperties']: seriesProperties,
        [input('group')]: group,
      }) => continuation({
        ['#resolvedSeriesList']:
          seriesProperties
            .map(properties => ({
              ...properties,
              group,
            })),
      }),
    },
  ],
});
