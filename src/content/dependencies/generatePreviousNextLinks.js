export default {
  // Returns an array with the slotted previous and next links, prepared
  // for inclusion in a page's navigation bar. Include with other links
  // in the nav bar and then join them all as a unit list, for example.

  extraDependencies: ['html', 'language'],

  slots: {
    previousLink: {type: 'html'},
    nextLink: {type: 'html'},
    id: {type: 'boolean', default: true},
  },

  generate(slots, {html, language}) {
    const previousNext = [];

    if (!html.isBlank(slots.previousLink)) {
      previousNext.push(
        slots.previousLink.slots({
          tooltip: true,
          color: false,
          attributes: {id: slots.id && 'previous-button'},
          content: language.$('misc.nav.previous'),
        }));
    }

    if (!html.isBlank(slots.nextLink)) {
      previousNext.push(
        slots.nextLink.slots({
          tooltip: true,
          color: false,
          attributes: {id: slots.id && 'next-button'},
          content: language.$('misc.nav.next'),
        }));
    }

    return previousNext;
  },
};
