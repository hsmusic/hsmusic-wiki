export default {
  // Returns an array with the slotted previous and next links, prepared
  // for inclusion in a page's navigation bar. Include with other links
  // in the nav bar and then join them all as a unit list, for example.

  extraDependencies: ['html', 'language'],

  generate({html, language}) {
    return html.template({
      annotation: `generatePreviousNextLinks`,

      slots: {
        previousLink: {type: 'html'},
        nextLink: {type: 'html'},
      },

      content(slots) {
        return [
          !html.isBlank(slots.previousLink) &&
            slots.previousLink.slots({
              tooltip: true,
              attributes: {id: 'previous-button'},
              content: language.$('misc.nav.previous'),
            }),

          !html.isBlank(slots.nextLink) &&
            slots.nextLink?.slots({
              tooltip: true,
              attributes: {id: 'next-button'},
              content: language.$('misc.nav.next'),
            }),
        ].filter(Boolean);
      },
    });
  },
};
