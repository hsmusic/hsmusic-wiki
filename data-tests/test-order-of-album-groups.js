import {inspect} from 'node:util';

export default function({
  albumData,
  groupCategoryData,
}) {
  const groupSchemaTemplate = [
    ['Projects beyond Homestuck', 'Fandom projects'],
    ['Solo musicians', 'Fan-musician groups'],
    ['HSMusic'],
  ];

  const groupSchema =
    groupSchemaTemplate.map(names => names.flatMap(
      name => groupCategoryData
        .find(gc => gc.name === name)
        .groups));

  const badAlbums = albumData.filter(album => {
    const groups = album.groups.slice();
    const disallowed = [];
    for (const allowed of groupSchema) {
      while (groups.length) {
        if (disallowed.includes(groups[0]))
          return true;
        else if (allowed.includes(groups[0]))
          groups.shift();
        else break;
      }
      disallowed.push(...allowed);
    }
    return false;
  });

  if (!badAlbums.length) return true;

  console.log(`Some albums don't list their groups in the right order:`);
  for (const album of badAlbums) {
    console.log('-', album);
    for (const group of album.groups) {
      console.log(`  - ${inspect(group)}`)
    }
  }

  console.log(`Here's the group schema they should be updated to match:`);
  for (const section of groupSchemaTemplate) {
    if (section.length > 1) {
      console.log(`- Groups from any of: ${section.join(', ')}`);
    } else {
      console.log(`- Groups from: ${section}`);
    }
  }

  return false;
}
