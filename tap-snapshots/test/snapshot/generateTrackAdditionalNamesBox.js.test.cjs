/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/snapshot/generateTrackAdditionalNamesBox.js > TAP > generateTrackAdditionalNamesBox (snapshot) > inferred additional names only 1`] = `
[mocked: generateAdditionalNamesBox
 args: [
   [
     { name: 'Baz Baz', from: [ { directory: 'the-pyrenees' } ] }
   ]
 ]
 slots: {}]
`

exports[`test/snapshot/generateTrackAdditionalNamesBox.js > TAP > generateTrackAdditionalNamesBox (snapshot) > multiple own 1`] = `
[mocked: generateAdditionalNamesBox
 args: [
   [
     { name: 'Apple Time!' },
     { name: 'Pterodactyl Time!' },
     { name: 'Banana Time!' }
   ]
 ]
 slots: {}]
`

exports[`test/snapshot/generateTrackAdditionalNamesBox.js > TAP > generateTrackAdditionalNamesBox (snapshot) > no additional names 1`] = `

`

exports[`test/snapshot/generateTrackAdditionalNamesBox.js > TAP > generateTrackAdditionalNamesBox (snapshot) > own additional names only 1`] = `
[mocked: generateAdditionalNamesBox
 args: [ [ { name: 'Foo Bar', annotation: 'the Alps' } ] ]
 slots: {}]
`

exports[`test/snapshot/generateTrackAdditionalNamesBox.js > TAP > generateTrackAdditionalNamesBox (snapshot) > own and inferred, some overlap 1`] = `
[mocked: generateAdditionalNamesBox
 args: [
   [
     { name: 'Ke$halo Strike Back', annotation: 'own annotation' },
     { name: 'Ironic Mania', annotation: 'own annotation' },
     {
       name: 'ANARCHY::MEGASTRIFE',
       from: [ { directory: 'inferred-from' } ]
     }
   ]
 ]
 slots: {}]
`

exports[`test/snapshot/generateTrackAdditionalNamesBox.js > TAP > generateTrackAdditionalNamesBox (snapshot) > own and shared and inferred, various overlap 1`] = `
[mocked: generateAdditionalNamesBox
 args: [
   [
     { name: 'Own!', annotation: 'own annotation' },
     { name: 'Own! Shared!', annotation: 'own annotation' },
     { name: 'Own! Inferred!', annotation: 'own annotation' },
     { name: 'Own! Shared! Inferred!', annotation: 'own annotation' },
     { name: 'Shared!', annotation: 'shared annotation' },
     { name: 'Shared! Inferred!', annotation: 'shared annotation' },
     { name: 'Inferred!', from: [ { directory: 'inferred-from' } ] }
   ]
 ]
 slots: {}]
`

exports[`test/snapshot/generateTrackAdditionalNamesBox.js > TAP > generateTrackAdditionalNamesBox (snapshot) > own and shared, some overlap 1`] = `
[mocked: generateAdditionalNamesBox
 args: [
   [
     { name: 'weed dreams..', annotation: 'own annotation' },
     { name: '夜間のＭＯＯＮ汗', annotation: 'own annotation' },
     { name: 'ＧＡＭＩＮＧブラザー９６', annotation: 'shared annotation' }
   ]
 ]
 slots: {}]
`

exports[`test/snapshot/generateTrackAdditionalNamesBox.js > TAP > generateTrackAdditionalNamesBox (snapshot) > shared additional names only 1`] = `
[mocked: generateAdditionalNamesBox
 args: [ [ { name: 'Bar Foo', annotation: 'the Rockies' } ] ]
 slots: {}]
`

exports[`test/snapshot/generateTrackAdditionalNamesBox.js > TAP > generateTrackAdditionalNamesBox (snapshot) > shared and inferred, some overlap 1`] = `
[mocked: generateAdditionalNamesBox
 args: [
   [
     { name: 'Coruscate', annotation: 'shared annotation' },
     { name: 'Arbroath', annotation: 'shared annotation' },
     { name: 'Prana Ferox', from: [ { directory: 'inferred-from' } ] }
   ]
 ]
 slots: {}]
`
