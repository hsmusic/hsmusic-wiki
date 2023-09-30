// node-tap test -> src coverage map
// https://node-tap.org/coverage/

export default function map(F) {
  let match;

  // unit/content/...

  match = F.match(/^test\/unit\/content\/(.*)$/);
  if (match) {
    const f = match[1];

    match = f.match(/^dependencies\/(.*)\.js$/);
    if (match) {
      return `src/content/dependencies/${match[1]}.js`;
    }
  }

  // unit/data/...

  match = F.match(/^test\/unit\/data\/(.*)$/);
  if (match) {
    const f = match[1];

    match = f.match(/^things\/(.*)\.js$/);
    if (match) {
      return `src/data/things/${match[1]}.js`;
    }
  }

  // unit/util/...

  match = F.match(/^test\/unit\/util\/(.*)$/);
  if (match) {
    const f = match[1];

    switch (f) {
      case 'html.js':
        return 'src/util/html.js';
    }
  }

  // snapshot/...

  match = F.match(/^test\/snapshot\/(.*)$/);
  if (match) {
    const f = match[1];

    match = f.match(/^(.*)\.js$/);
    if (match) {
      return `src/content/dependencies/${match[1]}.js`;
    }
  }

  return null;
}
