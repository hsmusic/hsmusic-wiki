import {input, templateCompositeFrom} from '#composite';

export default templateCompositeFrom({
  annotation: `hasAnnotationPart`,

  compose: false,

  inputs: {
    part: input({type: 'string'}),
  },

  steps: () => [
    {
      dependencies: [input('part'), 'annotationParts'],

      compute: ({
        [input('part')]: search,
        ['annotationParts']: parts,
      }) =>
          parts.some(part =>
            part.toLowerCase() ===
            search.toLowerCase()),
    },
  ],
});
