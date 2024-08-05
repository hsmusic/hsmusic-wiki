import t from 'tap';

import thingConstructors from '#things';

t.test(`ArtTag.nameShort`, t => {
  const {ArtTag} = thingConstructors;

  t.plan(3);

  const artTag = new ArtTag();

  artTag.name = `Dave Strider`;

  t.equal(artTag.nameShort, `Dave Strider`,
    `ArtTag #1: defaults to name`);

  artTag.name = `Dave Strider (Homestuck)`;

  t.equal(artTag.nameShort, `Dave Strider`,
    `ArtTag #2: trims parenthical part at end`);

  artTag.name = `This (And) That (Then)`;

  t.equal(artTag.nameShort, `This (And) That`,
    `ArtTag #2: doesn't trim midlde parenthical part`);
});
