export default {
  relations: (relation, flash) => ({
    flashActLink:
      relation('linkFlashAct', flash.act),
  }),

  generate: (relations) => [
    {auto: 'home'},
    {html: relations.flashActLink.slot('color', false)},
    {auto: 'current'},
  ],
};