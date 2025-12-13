export default {
  relations: (relation, flash) => ({
    adventureLink:
      relation('linkAdventure', flash.adventure),
  }),

  generate: (relations) => [
    {auto: 'home'},
    {html: relations.adventureLink.slot('color', false)},
    {auto: 'current'},
  ],
};