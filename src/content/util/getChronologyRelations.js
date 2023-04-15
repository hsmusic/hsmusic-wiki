export default function getChronologyRelations(thing, {
  contributions,
  linkArtist,
  linkThing,
  getThings,
}) {
  return contributions.map(({who}) => {
    const things = getThings(who);
    const index = things.indexOf(thing);
    const previous = things[index - 1];
    const next = things[index + 1];
    return {
      index: index + 1,
      artistLink: linkArtist(who),
      previousLink: previous ? linkThing(previous) : null,
      nextLink: next ? linkThing(next) : null,
    };
  });
}
