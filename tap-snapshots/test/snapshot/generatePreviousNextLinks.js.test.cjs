/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/snapshot/generatePreviousNextLinks.js > TAP > generatePreviousNextLinks (snapshot) > basic behavior 1`] = `
previous: { tooltipStyle: 'browser', color: false, attributes: { id: 'previous-button' }, content: Tag (no name, 1 items) }
next: { tooltipStyle: 'browser', color: false, attributes: { id: 'next-button' }, content: Tag (no name, 1 items) }
`

exports[`test/snapshot/generatePreviousNextLinks.js > TAP > generatePreviousNextLinks (snapshot) > disable id 1`] = `
previous: { tooltipStyle: 'browser', color: false, attributes: { id: false }, content: Tag (no name, 1 items) }
next: { tooltipStyle: 'browser', color: false, attributes: { id: false }, content: Tag (no name, 1 items) }
`

exports[`test/snapshot/generatePreviousNextLinks.js > TAP > generatePreviousNextLinks (snapshot) > neither link present 1`] = `

`

exports[`test/snapshot/generatePreviousNextLinks.js > TAP > generatePreviousNextLinks (snapshot) > next missing 1`] = `
previous: { tooltipStyle: 'browser', color: false, attributes: { id: 'previous-button' }, content: Tag (no name, 1 items) }
`

exports[`test/snapshot/generatePreviousNextLinks.js > TAP > generatePreviousNextLinks (snapshot) > previous missing 1`] = `
next: { tooltipStyle: 'browser', color: false, attributes: { id: 'next-button' }, content: Tag (no name, 1 items) }
`
