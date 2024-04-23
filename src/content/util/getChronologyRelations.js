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

  contributions = contributions.filter(({artist}) => {
    if (artistsSoFar.has(artist)) {
      return false;
    } else {
      artistsSoFar.add(artist);
      return true;
    }
  });

  return contributions.map(({artist}) => {
    const things = Array.from(new Set(getThings(artist)));

    // Don't show a line if this contribution isn't part of the artist's
    // chronology at all (usually because this thing isn't dated).
    const index = things.indexOf(thing);
    if (index === -1) {
      return;
    }

    const previous = things[index - 1];
    const next = things[index + 1];

    return {
      index: index + 1,
      artistLink: linkArtist(artist),
      previousLink: previous ? linkThing(previous) : null,
      nextLink: next ? linkThing(next) : null,
    };
  }).filter(Boolean);
}
