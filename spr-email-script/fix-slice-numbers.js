/**
 * WIP to fix numbers in the spreadsheet without having to re-enter everything.
 * 
 * Really janky at present.
 * Probably don't use it.
 */


// unify build scripts
// const builder = require( './src/Builder' );
const rl = require('readline-sync');
const fs = require('fs');
const _ = require('lodash');
var path = require('path');
const { exit } = require('process');
// const JSZip = require('jszip');
// const open = require('open');

const rootDir = __dirname; // directory where this file is located
const cwd = process.cwd(); // directory where we invoked this file
const srcPath = `${__dirname}/src`; // why not?


var folderName = "";
var spreadSheetName = "";
var action = "";
// slug used in front of _AUTO and _CUSTOM when writing output
var outputSlug = '';

// need to pick/identify the folder before pulling in the config file...
// if the script is being invoked from the root directory of the project 
if ( rootDir == cwd ) {
  console.error( 'this is intended to be invoked in a project folder.' );
  process.exit();
}

// need to specify what slice number to start the incrementing
else if ( !process.argv[2] || isNaN( process.argv[2] ) ) {
  console.error( 'you must specify the starting number to begin incrementing.' );
  process.exit();
}
else {
  console.log( process.argv );
  let data = getNumbers();
  console.log( `data: \n${data}` );
  let start = parseInt( process.argv[2] );
  console.log( `start: ${start}`);
  // console.log( `typeof start: ${typeof start}` );
  let fixedData = fixNumbers( data, start );
  console.log( `fixedData:\n${fixedData}` );
  fs.writeFileSync( `${cwd}/fixed.txt`, fixedData );
}

function getNumbers() {
  // had to make this synchronous as well for some reason...
  let file = `${cwd}/slices.txt`;
  try {
    let data = fs.readFileSync( `${cwd}/slices.txt` ).toString();
    // console.log( `data is a %s`, typeof data );
    return data;
  }
  catch (err) {
    console.error( `Error reading ${file}` );
    throw err;
  }
}

function fixNumbers( data, start ) {
  let lines = data.split( '\n' );
  let fixedLines = lines.map( line => {
    let nums = line.split( /\D+/ );
    return nums.map( num => {
      if ( num > start ) {
        // console.log( `${ num } >= ${start} ? ${ num >= start}` );
        num++;
      }
      // assume it's the same row
      else if ( num == start ) {
        num = `${num} ${++num}`;
      }
      return num;
    }).join( ' ' );
  });
  return fixedLines.join( '\n' );
}



