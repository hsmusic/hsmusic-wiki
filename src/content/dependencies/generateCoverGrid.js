export default {
  extraDependencies: ['html'],

  generate({html}) {
    return html.template({
      annotation: `generateCoverGrid`,

      slots: {
        images: {validate: v => v.arrayOf(v.isHTML)},
        links: {validate: v => v.arrayOf(v.isHTML)},
        names: {validate: v => v.arrayOf(v.isString)},

        lazy: {validate: v => v.oneOf(v.isWholeNumber, v.isBoolean)},
      },

      content(slots) {
        return (
          html.tag('div', {class: 'grid-listing'},
            slots.images.map((image, i) => {
              const link = slots.links[i];
              const name = slots.names[i];
              return link.slots({
                content: [
                  image.slots({
                    thumb: 'medium',
                    lazy:
                      (typeof slots.lazy === 'number'
                        ? i >= slots.lazy
                     : typeof slots.lazy === 'boolean'
                        ? slots.lazy
                        : false),
                    square: true,
                  }),
                  html.tag('span', name),
                ],
                attributes: {
                  class: ['grid-item', 'box', /* large && 'large-grid-item' */],
                },
              });
            })));
      },
    });
  },
};
