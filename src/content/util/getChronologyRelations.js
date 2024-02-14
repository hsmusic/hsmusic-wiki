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

    // Don't show a line if this contribution isn't part of the artist's
    // chronology at all (usually because this thing isn't dated).
    const index = things.indexOf(thing);
    if (index === -1) {
      return;
    }

    // Don't show a line if this contribution is the *only* item in the
    // artist's chronology (since there's nothing to navigate there).
    const previous = things[index - 1];
    const next = things[index + 1];
    if (!previous && !next) {
      return;
    }

    return {
      index: index + 1,
      artistLink: linkArtist(who),
      previousLink: previous ? linkThing(previous) : null,
      nextLink: next ? linkThing(next) : null,
    };
  }).filter(Boolean);
}
