import {sortFlashesChronologically} from '#sort';
import {input, templateCompositeFrom} from '#composite';

export default templateCompositeFrom({
  annotation: `featuredInFlashes`,

  compose: false,

  inputs: {
    property: input({type: 'string'}),
  },

  steps: () => [
    {
      dependencies: ['allReleases', input('property')],
      compute: (continuation, {
        ['allReleases']: allReleases,
        [input('property')]: property,
      }) => continuation({
        ['#data']:
          allReleases.flatMap(track =>
            track[property].map(flash => ({
              flash,
              track,

              // These properties are used for the upcoming sort.
              act: flash.act,
              date: flash.date,
            }))),
      }),
    },

    {
      dependencies: ['#data'],
      compute: (continuation, {'#data': data}) => continuation({
        ['#sortedData']:
          sortFlashesChronologically(data),
      }),
    },

    {
      dependencies: ['#sortedData'],
      compute: ({'#sortedData': sortedData}) =>
        sortedData.map(item => ({
          flash: item.flash,
          as: item.track,
        })),
    },
  ],
});
