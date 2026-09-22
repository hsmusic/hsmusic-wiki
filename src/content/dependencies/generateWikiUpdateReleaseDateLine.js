export default {
  data: (update) => ({
    isMainUpdate:
      update.isMainUpdate,

    date:
      update.date,
  }),

  generate: (data, {language}) =>
    language.encapsulate('wikiUpdatePage.info', workingCapsule => {
      const workingOptions = {};

      if (data.isMainUpdate) {
        workingCapsule += '.mainUpdate';
      } else {
        workingCapsule += '.regularUpdate';
      }

      if (data.date) {
        workingCapsule += '.withDate';
        workingOptions.date = language.formatDate(data.date);
      }

      return language.$(workingCapsule, workingOptions);
    }),
};
