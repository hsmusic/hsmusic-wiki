export default {
  data: (album) => ({
    style:
      album.style,

    nameDetail:
      album.nameDetail,
  }),

  slots: {
    navString: {type: 'string', default: 'albumPage.nav'},
  },

  generate: (data, slots, {html, language}) =>
    language.encapsulate(slots.navString, 'albumAccent', capsule => {
      let workingCapsule = capsule;
      let workingOptions = {};

      let any = false;

      if (data.nameDetail) {
        workingCapsule += '.withNameDetail';
        workingOptions.nameDetail = data.nameDetail;
        any = true;
      }

      const type =
        (data.style === 'single'
          ? language.$(capsule, 'type.single')
       : data.style === 'in-game vgm'
          ? language.$(capsule, 'type.vgm')
          : html.blank());

      if (!html.isBlank(type)) {
        workingCapsule += '.withType';
        workingOptions.type = type;
        any = true;
      }

      if (any) {
        return language.$(workingCapsule, workingOptions);
      } else {
        return html.blank();
      }
    }),
};
