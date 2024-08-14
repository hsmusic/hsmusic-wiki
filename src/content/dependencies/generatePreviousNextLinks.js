export default {
  // Returns an array with the slotted previous and next links, prepared
  // for inclusion in a page's navigation bar. Include with other links
  // in the nav bar and then join them all as a unit list, for example.

  contentDependencies: ['generateNextLink', 'generatePreviousLink'],
  extraDependencies: ['html', 'language'],

  relations: (relation) => ({
    previousLink:
      relation('generatePreviousLink'),

    nextLink:
      relation('generateNextLink'),
  }),

  slots: {
    previousLink: {
      type: 'html',
      mutable: true,
    },

    nextLink: {
      type: 'html',
      mutable: true,
    },

    id: {
      type: 'boolean',
      default: true,
    },
  },

  generate(relations, slots, {html, language}) {
    const previousNext = [];

    relations.previousLink.setSlots({
      link: slots.previousLink,
      id: slots.id,
    });

    relations.nextLink.setSlots({
      link: slots.nextLink,
      id: slots.id,
    });

    if (!html.isBlank(slots.previousLink)) {
      previousNext.push(relations.previousLink);
    }

    if (!html.isBlank(slots.nextLink)) {
      previousNext.push(relations.nextLink);
    }

    return previousNext;
  },
};
