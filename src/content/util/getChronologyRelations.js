export default function getChronologyRelations(thing, {
  contributions,
  linkArtist,
  linkThing,
  getThings,
}) {
  // One call to getChronologyRelations is considered "lumping" together all
  // contributions as carrying equivalent meaning (for example, "artist"
  // contributions and "contributor" contributions are bunched together in
  // one call to getChronologyRelations, while "cover artist" contributions
  // are a separate call). getChronologyRelations prevents duplicates that
  // carry the same meaning by only using the first instance of each artist
  // in the contributions array passed to it. It's expected that the string
  // identifying which kind of contribution ("track" or "cover art") is
  // shared and applied to all contributions, as providing them together
  // in one call to getChronologyRelations implies they carry the same
  // meaning.

  const artistsSoFar = new Set();

  contributions = contributions.filter(({who}) => {
    if (artistsSoFar.has(who)) {
      return false;
    } else {
      artistsSoFar.add(who);
      return true;
    }
  });

  return contributions.map(({who}) => {
    const things = Array.from(new Set(getThings(who)));
    if (things.length === 1) {
      return;
    }

    const index = things.indexOf(thing);
    const previous = things[index - 1];
    const next = things[index + 1];
    return {
      index: index + 1,
      artistLink: linkArtist(who),
      previousLink: previous ? linkThing(previous) : null,
      nextLink: next ? linkThing(next) : null,
    };
  }).filter(Boolean);
}
