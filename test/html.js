import test from 'tape';

import * as html from '../src/util/html.js';
const {Tag, Attributes, Template, Slot} = html;

test(`html.tag`, t => {
  t.plan(16);

  const tag1 =
    html.tag('div',
      {[html.onlyIfContent]: true, foo: 'bar'},
      'child');

  // 1-5: basic behavior when passing attributes
  t.ok(tag1 instanceof Tag);
  t.ok(tag1.onlyIfContent);
  t.is(tag1.attributes.get('foo'), 'bar');
  t.is(tag1.content.length, 1);
  t.is(tag1.content[0], 'child');

  const tag2 = html.tag('div', ['two', 'children']);

  // 6-8: basic behavior when not passing attributes
  t.is(tag2.content.length, 2);
  t.is(tag2.content[0], 'two');
  t.is(tag2.content[1], 'children');

  const genericTag = html.tag('div');
  let genericSlot;
  const genericTemplate = html.template(slot => {
    genericSlot = slot('title');
    return [];
  });

  // 9-10: tag treated as content, not attributes
  const tag3 = html.tag('div', genericTag);
  t.is(tag3.content.length, 1);
  t.is(tag3.content[0], genericTag);

  // 11-12: template treated as content, not attributes
  const tag4 = html.tag('div', genericTemplate);
  t.is(tag4.content.length, 1);
  t.is(tag4.content[0], genericTemplate);

  // 13-14: slot treated as content, not attributes
  const tag5 = html.tag('div', genericSlot);
  t.is(tag5.content.length, 1);
  t.is(tag5.content[0], genericSlot);

  // 15-16: deep flattening support
  const tag6 =
    html.tag('div', [
      true &&
        [[[[[[
          true &&
            [[[[[`That's deep.`]]]]],
        ]]]]]],
    ]);
  t.is(tag6.content.length, 1);
  t.is(tag6.content[0], `That's deep.`);
});

test(`Tag (basic interface)`, t => {
  t.plan(11);

  const tag1 = new Tag();

  // 1-5: essential properties & no arguments provided
  t.is(tag1.tagName, '');
  t.ok(Array.isArray(tag1.content));
  t.is(tag1.content.length, 0);
  t.ok(tag1.attributes instanceof Attributes);
  t.is(tag1.attributes.toString(), '');

  const tag2 = new Tag('div', {id: 'banana'}, ['one', 'two', tag1]);

  // 6-11: properties on basic usage
  t.is(tag2.tagName, 'div');
  t.is(tag2.content.length, 3);
  t.is(tag2.content[0], 'one');
  t.is(tag2.content[1], 'two');
  t.is(tag2.content[2], tag1);
  t.is(tag2.attributes.get('id'), 'banana');
});

test(`Tag (self-closing)`, t => {
  t.plan(10);

  const tag1 = new Tag('br');
  const tag2 = new Tag('div');
  const tag3 = new Tag('div');
  tag3.tagName = 'br';

  // 1-3: selfClosing depends on tagName
  t.ok(tag1.selfClosing);
  t.notOk(tag2.selfClosing);
  t.ok(tag3.selfClosing);

  // 4: constructing self-closing tag with content throws
  t.throws(() => new Tag('br', null, 'bananas'), /self-closing/);

  // 5: setting content on self-closing tag throws
  t.throws(() => { tag1.content = ['suspicious']; }, /self-closing/);

  // 6-9: setting empty content on self-closing tag doesn't throw
  t.doesNotThrow(() => { tag1.content = null; });
  t.doesNotThrow(() => { tag1.content = undefined; });
  t.doesNotThrow(() => { tag1.content = ''; });
  t.doesNotThrow(() => { tag1.content = [null, '', false]; });

  const tag4 = new Tag('div', null, 'bananas');

  // 10: changing tagName to self-closing when tag has content throws
  t.throws(() => { tag4.tagName = 'br'; }, /self-closing/);
});

test(`Tag (properties from attributes - from constructor)`, t => {
  t.plan(6);

  const tag = new Tag('div', {
    [html.onlyIfContent]: true,
    [html.noEdgeWhitespace]: true,
    [html.joinChildren]: '<br>',
  });

  // 1-3: basic exposed properties from attributes in constructor
  t.ok(tag.onlyIfContent);
  t.ok(tag.noEdgeWhitespace);
  t.is(tag.joinChildren, '<br>');

  // 4-6: property values stored on attributes with public symbols
  t.is(tag.attributes.get(html.onlyIfContent), true);
  t.is(tag.attributes.get(html.noEdgeWhitespace), true);
  t.is(tag.attributes.get(html.joinChildren), '<br>');
});

test(`Tag (properties from attributes - mutating)`, t => {
  t.plan(12);

  // 1-3: exposed properties reflect reasonable attribute values

  const tag1 = new Tag('div', {
    [html.onlyIfContent]: true,
    [html.noEdgeWhitespace]: true,
    [html.joinChildren]: '<br>',
  });

  tag1.attributes.set(html.onlyIfContent, false);
  tag1.attributes.remove(html.noEdgeWhitespace);
  tag1.attributes.set(html.joinChildren, '🍇');

  t.is(tag1.onlyIfContent, false);
  t.is(tag1.noEdgeWhitespace, false);
  t.is(tag1.joinChildren, '🍇');

  // 4-6: exposed properties reflect unreasonable attribute values

  const tag2 = new Tag('div', {
    [html.onlyIfContent]: true,
    [html.noEdgeWhitespace]: true,
    [html.joinChildren]: '<br>',
  });

  tag2.attributes.set(html.onlyIfContent, '');
  tag2.attributes.set(html.noEdgeWhitespace, 12345);
  tag2.attributes.set(html.joinChildren, 0.0001);

  t.is(tag2.onlyIfContent, false);
  t.is(tag2.noEdgeWhitespace, true);
  t.is(tag2.joinChildren, '0.0001');

  // 7-9: attribute values reflect reasonable mutated properties

  const tag3 = new Tag('div', null, {
    [html.onlyIfContent]: false,
    [html.noEdgeWhitespace]: true,
    [html.joinChildren]: '🍜',
  })

  tag3.onlyIfContent = true;
  tag3.noEdgeWhitespace = false;
  tag3.joinChildren = '🦑';

  t.is(tag3.attributes.get(html.onlyIfContent), true);
  t.is(tag3.attributes.get(html.noEdgeWhitespace), undefined);
  t.is(tag3.joinChildren, '🦑');

  // 10-12: attribute values reflect unreasonable mutated properties

  const tag4 = new Tag('div', null, {
    [html.onlyIfContent]: false,
    [html.noEdgeWhitespace]: true,
    [html.joinChildren]: '🍜',
  });

  tag4.onlyIfContent = 'armadillo';
  tag4.noEdgeWhitespace = 0;
  tag4.joinChildren = Infinity;

  t.is(tag4.attributes.get(html.onlyIfContent), true);
  t.is(tag4.attributes.get(html.noEdgeWhitespace), undefined);
  t.is(tag4.attributes.get(html.joinChildren), 'Infinity');
});

test(`Tag.toString`, t => {
  t.plan(7);

  // 1: basic behavior

  const tag1 =
    html.tag('div', 'Content');

  t.is(tag1.toString(),
    `<div>Content</div>`);

  // 2: stringifies nested element

  const tag2 =
    html.tag('div', html.tag('p', 'Content'));

  t.is(tag2.toString(),
    `<div><p>Content</p></div>`);

  // 3: stringifies attributes

  const tag3 =
    html.tag('div',
      {
        id: 'banana',
        class: ['foo', 'bar'],
        contenteditable: true,
        biggerthanabreadbox: false,
        saying: `"To light a candle is to cast a shadow..."`,
        tabindex: 413,
      },
      'Content');

  t.is(tag3.toString(),
    `<div id="banana" class="foo bar" contenteditable ` +
    `saying="&quot;To light a candle is to cast a shadow...&quot;" ` +
    `tabindex="413">Content</div>`);

  // 4: attributes match input order

  const tag4 =
    html.tag('div',
      {class: ['foo', 'bar'], id: 'banana'},
      'Content');

  t.is(tag4.toString(),
    `<div class="foo bar" id="banana">Content</div>`);

  // 5: multiline contented indented

  const tag5 =
    html.tag('div', 'foo\nbar');

  t.is(tag5.toString(),
    `<div>\n` +
    `    foo\n` +
    `    bar\n` +
    `</div>`);

  // 6: nested multiline content double-indented

  const tag6 =
    html.tag('div', [
      html.tag('p',
        'foo\nbar'),
      html.tag('span', `I'm on one line!`),
    ]);

  t.is(tag6.toString(),
    `<div>\n` +
    `    <p>\n` +
    `        foo\n` +
    `        bar\n` +
    `    </p>\n` +
    `    <span>I'm on one line!</span>\n` +
    `</div>`);

  // 7: self-closing (with attributes)

  const tag7 =
    html.tag('article', [
      html.tag('h1', `Title`),
      html.tag('hr', {style: `color: magenta`}),
      html.tag('p', `Shenanigans!`),
    ]);

  t.is(tag7.toString(),
    `<article>\n` +
    `    <h1>Title</h1>\n` +
    `    <hr style="color: magenta">\n` +
    `    <p>Shenanigans!</p>\n` +
    `</article>`);
});

test(`Tag.toString (onlyIfContent)`, t => {
  t.plan(4);

  // 1-2: basic behavior

  const tag1 =
    html.tag('div',
      {[html.onlyIfContent]: true},
      `Hello!`);

  t.is(tag1.toString(),
    `<div>Hello!</div>`);

  const tag2 =
    html.tag('div',
      {[html.onlyIfContent]: true},
      '');

  t.is(tag2.toString(),
    '');

  // 3-4: nested onlyIfContent with "more" content

  const tag3 =
    html.tag('div',
      {[html.onlyIfContent]: true},
      [
        '',
        0,
        html.tag('h1',
          {[html.onlyIfContent]: true},
          html.tag('strong',
            {[html.onlyIfContent]: true})),
        null,
        false,
      ]);

  t.is(tag3.toString(),
    '');

  const tag4 =
    html.tag('div',
      {[html.onlyIfContent]: true},
      [
        '',
        0,
        html.tag('h1',
          {[html.onlyIfContent]: true},
          html.tag('strong')),
        null,
        false,
      ]);

  t.is(tag4.toString(),
    `<div><h1><strong></strong></h1></div>`);
});

test(`Tag.toString (joinChildren, noEdgeWhitespace)`, t => {
  t.plan(6);

  // 1: joinChildren: default (\n), noEdgeWhitespace: true

  const tag1 =
    html.tag('div',
      {[html.noEdgeWhitespace]: true},
      [
        'Foo',
        'Bar',
        'Baz',
      ]);

  t.is(tag1.toString(),
    `<div>Foo\n` +
    `    Bar\n` +
    `    Baz</div>`);

  // 2: joinChildren: one-line string, noEdgeWhitespace: default (false)

  const tag2 =
    html.tag('div',
      {
        [html.joinChildren]:
          html.tag('br', {location: '🍍'}),
      },
      [
        'Foo',
        'Bar',
        'Baz',
      ]);

  t.is(tag2.toString(),
    `<div>\n` +
    `    Foo\n` +
    `    <br location="🍍">\n` +
    `    Bar\n` +
    `    <br location="🍍">\n` +
    `    Baz\n` +
    `</div>`);

  // 3-4: joinChildren: blank string, noEdgeWhitespace: default (false)

  const tag3 =
    html.tag('div',
      {[html.joinChildren]: ''},
      [
        'Foo',
        'Bar',
        'Baz',
      ]);

  t.is(tag3.toString(),
    `<div>FooBarBaz</div>`);

  const tag4 =
    html.tag('div',
      {[html.joinChildren]: ''},
      [
        `Ain't I\na cute one?`,
        `~`
      ]);

  t.is(tag4.toString(),
    `<div>\n` +
    `    Ain't I\n` +
    `    a cute one?~\n` +
    `</div>`);

  // 5: joinChildren: one-line string, noEdgeWhitespace: true

  const tag5 =
    html.tag('div',
      {
        [html.joinChildren]: html.tag('br'),
        [html.noEdgeWhitespace]: true,
      },
      [
        'Foo',
        'Bar',
        'Baz',
      ]);

  t.is(tag5.toString(),
    `<div>Foo\n` +
    `    <br>\n` +
    `    Bar\n` +
    `    <br>\n` +
    `    Baz</div>`);

  // 6: joinChildren: empty string, noEdgeWhitespace: true

  const tag6 =
    html.tag('span',
      {
        [html.joinChildren]: '',
        [html.noEdgeWhitespace]: true,
      },
      [
        html.tag('i', `Oh yes~ `),
        `You're a cute one`,
        html.tag('sup', `💕`),
      ]);

  t.is(tag6.toString(),
    `<span><i>Oh yes~ </i>You're a cute one<sup>💕</sup></span>`);
});

test(`Tag.toString (custom attributes)`, t => {
  t.plan(1);

  t.test(`Tag.toString (custom attribute: href)`, t => {
    t.plan(2);

    const tag1 = html.tag('a', {href: `https://hsmusic.wiki/`});
    t.is(tag1.toString(), `<a href="https://hsmusic.wiki/"></a>`);

    const tag2 = html.tag('a', {href: `https://hsmusic.wiki/media/Album Booklet.pdf`});
    t.is(tag2.toString(), `<a href="https://hsmusic.wiki/media/Album%20Booklet.pdf"></a>`);
  });
});
