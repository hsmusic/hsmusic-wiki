export default {
  contentDependencies: ['generateStyleTag'],
  extraDependencies: ['to'],

  relations: (relation) => ({
    styleTag:
      relation('generateStyleTag'),
  }),

  generate: (relations, {to}) =>
    relations.styleTag.slots({
      attributes: {class: 'static-url-style'},

      rules: [
        {
          select: '.image-media-link::after',
          declare: [
            `mask-image: url("${to('staticMisc.path', 'image.svg')}");`
          ],
        },
      ],
    }),
};
