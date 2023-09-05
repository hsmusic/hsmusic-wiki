/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/snapshot/generatePreviousNextLinks.js TAP generatePreviousNextLinks (snapshot) > basic behavior 1`] = `
previous: { tooltip: true, color: false, attributes: { id: 'previous-button' }, content: 'Previous' }
next: { tooltip: true, color: false, attributes: { id: 'next-button' }, content: 'Next' }
`

exports[`test/snapshot/generatePreviousNextLinks.js TAP generatePreviousNextLinks (snapshot) > disable id 1`] = `
previous: { tooltip: true, color: false, attributes: { id: false }, content: 'Previous' }
next: { tooltip: true, color: false, attributes: { id: false }, content: 'Next' }
`

exports[`test/snapshot/generatePreviousNextLinks.js TAP generatePreviousNextLinks (snapshot) > neither link present 1`] = `

`

exports[`test/snapshot/generatePreviousNextLinks.js TAP generatePreviousNextLinks (snapshot) > next missing 1`] = `
previous: { tooltip: true, color: false, attributes: { id: 'previous-button' }, content: 'Previous' }
`

exports[`test/snapshot/generatePreviousNextLinks.js TAP generatePreviousNextLinks (snapshot) > previous missing 1`] = `
next: { tooltip: true, color: false, attributes: { id: 'next-button' }, content: 'Next' }
`
