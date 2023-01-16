// See also replacer.js, which covers the actual syntax parser and node
// interpreter. This file works with replacer.js to provide higher-level
// interfaces for converting various content found in wiki data to HTML for
// display on the site.

import * as html from './html.js';
export {transformInline} from './replacer.js';

export const replacerSpec = {
  album: {
    find: 'album',
    link: 'album',
  },
  'album-commentary': {
    find: 'album',
    link: 'albumCommentary',
  },
  'album-gallery': {
    find: 'album',
    link: 'albumGallery',
  },
  artist: {
    find: 'artist',
    link: 'artist',
  },
  'artist-gallery': {
    find: 'artist',
    link: 'artistGallery',
  },
  'commentary-index': {
    find: null,
    link: 'commentaryIndex',
  },
  date: {
    find: null,
    value: (ref) => new Date(ref),
    html: (date, {language}) =>
      html.tag('time',
        {datetime: date.toString()},
        language.formatDate(date)),
  },
  'flash-index': {
    find: null,
    link: 'flashIndex',
  },
  flash: {
    find: 'flash',
    link: 'flash',
    transformName(name, node, input) {
      const nextCharacter = input[node.iEnd];
      const lastCharacter = name[name.length - 1];
      if (![' ', '\n', '<'].includes(nextCharacter) && lastCharacter === '.') {
        return name.slice(0, -1);
      } else {
        return name;
      }
    },
  },
  group: {
    find: 'group',
    link: 'groupInfo',
  },
  'group-gallery': {
    find: 'group',
    link: 'groupGallery',
  },
  home: {
    find: null,
    link: 'home',
  },
  'listing-index': {
    find: null,
    link: 'listingIndex',
  },
  listing: {
    find: 'listing',
    link: 'listing',
  },
  media: {
    find: null,
    link: 'media',
  },
  'news-index': {
    find: null,
    link: 'newsIndex',
  },
  'news-entry': {
    find: 'newsEntry',
    link: 'newsEntry',
  },
  root: {
    find: null,
    link: 'root',
  },
  site: {
    find: null,
    link: 'site',
  },
  static: {
    find: 'staticPage',
    link: 'staticPage',
  },
  string: {
    find: null,
    value: (ref) => ref,
    html: (ref, {language, args}) => language.$(ref, args),
  },
  tag: {
    find: 'artTag',
    link: 'tag',
  },
  track: {
    find: 'track',
    link: 'track',
  },
};

function splitLines(text) {
  return text.split(/\r\n|\r|\n/);
}

function joinLineBreaks(sourceLines) {
  const outLines = [];

  let lineSoFar = '';
  for (let i = 0; i < sourceLines.length; i++) {
    const line = sourceLines[i];
    lineSoFar += line;
    if (!line.endsWith('<br>')) {
      outLines.push(lineSoFar);
      lineSoFar = '';
    }
  }

  if (lineSoFar) {
    outLines.push(lineSoFar);
  }

  return outLines;
}

function parseAttributes(string, {to}) {
  const attributes = Object.create(null);
  const skipWhitespace = (i) => {
    const ws = /\s/;
    if (ws.test(string[i])) {
      const match = string.slice(i).match(/[^\s]/);
      if (match) {
        return i + match.index;
      } else {
        return string.length;
      }
    } else {
      return i;
    }
  };

  for (let i = 0; i < string.length; ) {
    i = skipWhitespace(i);
    const aStart = i;
    const aEnd = i + string.slice(i).match(/[\s=]|$/).index;
    const attribute = string.slice(aStart, aEnd);
    i = skipWhitespace(aEnd);
    if (string[i] === '=') {
      i = skipWhitespace(i + 1);
      let end, endOffset;
      if (string[i] === '"' || string[i] === "'") {
        end = string[i];
        endOffset = 1;
        i++;
      } else {
        end = '\\s';
        endOffset = 0;
      }
      const vStart = i;
      const vEnd = i + string.slice(i).match(new RegExp(`${end}|$`)).index;
      const value = string.slice(vStart, vEnd);
      i = vEnd + endOffset;
      if (attribute === 'src' && value.startsWith('media/')) {
        attributes[attribute] = to('media.path', value.slice('media/'.length));
      } else {
        attributes[attribute] = value;
      }
    } else {
      attributes[attribute] = attribute;
    }
  }
  return Object.fromEntries(
    Object.entries(attributes).map(([key, val]) => [
      key,
      val === 'true'
        ? true
        : val === 'false'
        ? false
        : val === key
        ? true
        : val,
    ])
  );
}

function unbound_transformMultiline(text, {
  img,
  to,
  transformInline,

  thumb = null,
}) {
  // Heck yes, HTML magics.

  text = transformInline(text.trim());

  const outLines = [];

  const indentString = ' '.repeat(4);

  let levelIndents = [];
  const openLevel = (indent) => {
    // opening a sublist is a pain: to be semantically *and* visually
    // correct, we have to append the <ul> at the end of the existing
    // previous <li>
    const previousLine = outLines[outLines.length - 1];
    if (previousLine?.endsWith('</li>')) {
      // we will re-close the <li> later
      outLines[outLines.length - 1] = previousLine.slice(0, -5) + ' <ul>';
    } else {
      // if the previous line isn't a list item, this is the opening of
      // the first list level, so no need for indent
      outLines.push('<ul>');
    }
    levelIndents.push(indent);
  };
  const closeLevel = () => {
    levelIndents.pop();
    if (levelIndents.length) {
      // closing a sublist, so close the list item containing it too
      outLines.push(indentString.repeat(levelIndents.length) + '</ul></li>');
    } else {
      // closing the final list level! no need for indent here
      outLines.push('</ul>');
    }
  };

  // okay yes we should support nested formatting, more than one blockquote
  // layer, etc, but hear me out here: making all that work would basically
  // be the same as implementing an entire markdown converter, which im not
  // interested in doing lol. sorry!!!
  let inBlockquote = false;

  let lines = splitLines(text);
  lines = joinLineBreaks(lines);
  for (let line of lines) {
    const imageLine = line.startsWith('<img');
    line = line.replace(/<img (.*?)>/g, (match, attributes) =>
      img({
        lazy: true,
        link: true,
        thumb,
        ...parseAttributes(attributes, {to}),
      })
    );

    let indentThisLine = 0;
    let lineContent = line;
    let lineTag = 'p';

    const listMatch = line.match(/^( *)- *(.*)$/);
    if (listMatch) {
      // is a list item!
      if (!levelIndents.length) {
        // first level is always indent = 0, regardless of actual line
        // content (this is to avoid going to a lesser indent than the
        // initial level)
        openLevel(0);
      } else {
        // find level corresponding to indent
        const indent = listMatch[1].length;
        let i;
        for (i = levelIndents.length - 1; i >= 0; i--) {
          if (levelIndents[i] <= indent) break;
        }
        // note: i cannot equal -1 because the first indentation level
        // is always 0, and the minimum indentation is also 0
        if (levelIndents[i] === indent) {
          // same indent! return to that level
          while (levelIndents.length - 1 > i) closeLevel();
          // (if this is already the current level, the above loop
          // will do nothing)
        } else if (levelIndents[i] < indent) {
          // lesser indent! branch based on index
          if (i === levelIndents.length - 1) {
            // top level is lesser: add a new level
            openLevel(indent);
          } else {
            // lower level is lesser: return to that level
            while (levelIndents.length - 1 > i) closeLevel();
          }
        }
      }
      // finally, set variables for appending content line
      indentThisLine = levelIndents.length;
      lineContent = listMatch[2];
      lineTag = 'li';
    } else {
      // not a list item! close any existing list levels
      while (levelIndents.length) closeLevel();

      // like i said, no nested shenanigans - quotes only appear outside
      // of lists. sorry!
      const quoteMatch = line.match(/^> *(.*)$/);
      if (quoteMatch) {
        // is a quote! open a blockquote tag if it doesnt already exist
        if (!inBlockquote) {
          inBlockquote = true;
          outLines.push('<blockquote>');
        }
        indentThisLine = 1;
        lineContent = quoteMatch[1];
      } else if (inBlockquote) {
        // not a quote! close a blockquote tag if it exists
        inBlockquote = false;
        outLines.push('</blockquote>');
      }

      // let some escaped symbols display as the normal symbol, since the
      // point of escaping them is just to avoid having them be treated as
      // syntax markers!
      if (lineContent.match(/( *)\\-/)) {
        lineContent = lineContent.replace('\\-', '-');
      } else if (lineContent.match(/( *)\\>/)) {
        lineContent = lineContent.replace('\\>', '>');
      }
    }

    if (lineTag === 'p') {
      // certain inline element tags should still be postioned within a
      // paragraph; other elements (e.g. headings) should be added as-is
      const elementMatch = line.match(/^<(.*?)[ >]/);
      if (
        elementMatch &&
        !imageLine &&
        ![
          'a',
          'abbr',
          'b',
          'bdo',
          'br',
          'cite',
          'code',
          'data',
          'datalist',
          'del',
          'dfn',
          'em',
          'i',
          'img',
          'ins',
          'kbd',
          'mark',
          'output',
          'picture',
          'q',
          'ruby',
          'samp',
          'small',
          'span',
          'strong',
          'sub',
          'sup',
          'svg',
          'time',
          'var',
          'wbr',
        ].includes(elementMatch[1])
      ) {
        lineTag = '';
      }

      // for sticky headings!
      if (elementMatch && elementMatch[1] === 'h2') {
        lineContent = lineContent.replace(/<h2(.*?)>/g, (match, attributes) => {
          const parsedAttributes = parseAttributes(attributes, {to});
          return `<h2 ${html.attributes({
            ...parsedAttributes,
            class: [...parsedAttributes.class?.split(' ') ?? [], 'content-heading'],
          })}>`;
        });
      }
    }

    let pushString = indentString.repeat(indentThisLine);
    if (lineTag) {
      pushString += `<${lineTag}>${lineContent}</${lineTag}>`;
    } else {
      pushString += lineContent;
    }
    outLines.push(pushString);
  }

  // after processing all lines...

  // if still in a list, close all levels
  while (levelIndents.length) closeLevel();

  // if still in a blockquote, close its tag
  if (inBlockquote) {
    inBlockquote = false;
    outLines.push('</blockquote>');
  }

  return outLines.join('\n');
}

function unbound_transformLyrics(text, {
  transformInline,
  transformMultiline,
}) {
  // Different from transformMultiline 'cuz it joins multiple lines together
  // with line 8reaks (<br>); transformMultiline treats each line as its own
  // complete paragraph (or list, etc).

  // If it looks like old data, then like, oh god.
  // Use the normal transformMultiline tool.
  if (text.includes('<br')) {
    return transformMultiline(text);
  }

  text = transformInline(text.trim());

  let buildLine = '';
  const addLine = () => outLines.push(`<p>${buildLine}</p>`);
  const outLines = [];
  for (const line of text.split('\n')) {
    if (line.length) {
      if (buildLine.length) {
        buildLine += '<br>';
      }
      buildLine += line;
    } else if (buildLine.length) {
      addLine();
      buildLine = '';
    }
  }
  if (buildLine.length) {
    addLine();
  }
  return outLines.join('\n');
}

export {
  unbound_transformLyrics as transformLyrics,
  unbound_transformMultiline as transformMultiline
}
