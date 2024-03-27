// Index structures shared by client and server.

export function makeSearchIndexes(FlexSearch) {
  const indexes = {
    albums: new FlexSearch.Document({
      id: "reference",
      index: ["name", "groups"],
    }),

    tracks: new FlexSearch.Document({
      id: "reference",
      index: ["name", "album", "artists", "additionalNames"],
    }),

    artists: new FlexSearch.Document({
      id: "reference",
      index: ["names"],
    }),
  };

  return indexes;
}
