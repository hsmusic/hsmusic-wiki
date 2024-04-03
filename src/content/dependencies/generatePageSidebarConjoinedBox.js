// This component is kind of unfortunately magical. It reads the content of
// various boxes and joins them together, discarding the boxes' attributes.
// Since it requires access to the actual box *templates* (rather than those
// templates' resolved content), take care when slotting into this.

export default {
  contentDependencies: ['generatePageSidebarBox'],
  extraDependencies: ['html'],

  relations: (relation) => ({
    box:
      relation('generatePageSidebarBox'),
  }),

  slots: {
    attributes: {
      type: 'attributes',
      mutable: false,
    },

    boxes: {
      validate: v => v.looseArrayOf(v.isTemplate),
    },
  },

  generate: (relations, slots, {html}) =>
    relations.box.slots({
      attributes: slots.attributes,
      content:
        slots.boxes.slice()
          .map(box => box.getSlotValue('content'))
          .map((content, index, {length}) => [
            content,
            index < length - 1 &&
              html.tag('hr', {
                style:
                  `border-color: var(--primary-color); ` +
                  `border-style: none none dotted none`,
              }),
          ]),
    }),
};
