// @format

export function serializeLink(thing) {
  const ret = {};
  ret.name = thing.name;
  ret.directory = thing.directory;
  if (thing.color) ret.color = thing.color;
  return ret;
}

export function serializeContribs(contribs) {
  return contribs.map(({ who, what }) => {
    const ret = {};
    ret.artist = serializeLink(who);
    if (what) ret.contribution = what;
    return ret;
  });
}

export function serializeImagePaths(original, { thumb }) {
  return {
    original,
    medium: thumb.medium(original),
    small: thumb.small(original),
  };
}

export function serializeCover(
  thing,
  pathFunction,
  { serializeImagePaths, urls }
) {
  const coverPath = pathFunction(thing, {
    to: urls.from("media.root").to,
  });

  const { artTags } = thing;

  const cwTags = artTags.filter((tag) => tag.isContentWarning);
  const linkTags = artTags.filter((tag) => !tag.isContentWarning);

  return {
    paths: serializeImagePaths(coverPath),
    tags: linkTags.map(serializeLink),
    warnings: cwTags.map((tag) => tag.name),
  };
}

export function serializeGroupsForAlbum(album, { serializeLink }) {
  return album.groups
    .map((group) => {
      const index = group.albums.indexOf(album);
      const next = group.albums[index + 1] || null;
      const previous = group.albums[index - 1] || null;
      return { group, index, next, previous };
    })
    .map(({ group, index, next, previous }) => ({
      link: serializeLink(group),
      descriptionShort: group.descriptionShort,
      albumIndex: index,
      nextAlbum: next && serializeLink(next),
      previousAlbum: previous && serializeLink(previous),
      urls: group.urls,
    }));
}

export function serializeGroupsForTrack(track, { serializeLink }) {
  return track.album.groups.map((group) => ({
    link: serializeLink(group),
    urls: group.urls,
  }));
}
