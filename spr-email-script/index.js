// unify build scripts
const builder = require( './src/Builder' );
const rl = require('readline-sync');
const fs = require('fs');
const _ = require('lodash');
var path = require('path');
const JSZip = require('jszip');
const open = require('open');

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

  // Option 2: Select all the things
  // if there were fewer than 2 arguments passed to the script
  if ( !process.argv[3] || !process.argv[2] ) {

    const filteredFolders = listFolders( rootDir );

    let folderNum = selectFolder( filteredFolders );

    const xlsxFiles = listXslxInFolder( `${rootDir}/${filteredFolders[folderNum]}` );

    let xlsxNum = selectXlsx( xlsxFiles );

    action = selectAction();

    folderName = rootDir + '/' + filteredFolders[folderNum];
    spreadSheetName = /([^.]+)/g.exec(xlsxFiles[xlsxNum])[0];

  }

  // Option 3: pass folderName, spreadsheetName and action as command line args
  else {
    folderName = rootDir + '/' + process.argv[2];
    spreadSheetName = process.argv[3];

    if ( process.argv[4] ) {
      action = process.argv[4].toLowerCase();
    }

  }

}

// Option 1: invoke from the directory you want to build
// E.g., $> node ../index.js

// if the script is invoked from a project directory
else { 
  folderName = cwd;
  const xlsxFiles = listXslxInFolder( folderName );

  // maybe it should trigger a selector if multiple Excel files are found?
  if ( 0 < xlsxFiles.length ) {
    spreadSheetName = path.basename( xlsxFiles[0], '.xlsx' );
  }
  else {
    console.error( `no spreadsheets found in directory ${folderName}` );
    process.exit(1);
  }
  
  if ( process.argv[2] ) {
    action = process.argv[2].toLowerCase();
  }

}

// now that we know where we're working, import the config file
const configPath = (fs.existsSync( `${folderName}/config.js` ) ?
    folderName : srcPath) + '/config';

// remember to destructure config!!!
const { config } = require( configPath );


outputSlug = getOutputSlug( folderName, config );

// if action not defined or auto
if ( ['', 'auto', 'both'].includes( action ) ) {

  builder.auto(folderName, spreadSheetName, outputSlug, config)
  .then( () => {
    return zipFolder( `${folderName}/${outputSlug}_AUTO` );
  })
  .then( () => {
    console.log( `Built ${outputSlug}_AUTO.` );
    console.log( `Opening ${outputSlug}_AUTO/layout1.html in the browser...` );
    return open( `${folderName}/${outputSlug}_AUTO/layout1.html` );
  })
  .catch( e => {
    console.error( `An error occurred with auto build: ${e.message}` );
  });

}
// if action not defined or custom
if ( ['', 'both', 'custom'].includes( action ) ) { // ! action || action === 'custom') {
  builder.custom(folderName, spreadSheetName, outputSlug, config)
  .then( response => {
    return zipFolder( `${folderName}/${outputSlug}_CUSTOM` );
  })
  .then( () => {
    console.log( `Built ${outputSlug}_CUSTOM.` );
    console.log( `Opening ${outputSlug}_CUSTOM/layout1.html in the browser...` );
    return open( `${folderName}/${outputSlug}_CUSTOM/layout1.html` );
  })
  .catch( e => {
    console.error( `An error occurred with custom build: ${e.message}` );
  });
  
}

function getOutputSlug( folderName, config ) {
  const slug = config.emailName ? config.emailName : path.basename( folderName );
  return slug;
}

function listFiles( dir, 
  options = {
    exclude: [],
    extensions: []
  }) {

  // read the directory contents
  const files = fs.readdirSync( `${dir}/` ).map( file => {

    // weird
    // fs.statSync requires the full path for some reason...
    const name = fs.statSync( `${dir}/${file}` );

    // only grab the files
    if ( name.isFile() ) {
      return file;
    }
    return null;
  });

  const filteredFiles = _.filter( files, (file) => {
    if ( options.extensions.includes( path.extname(file).toLowerCase() ) ) {
      return false;
    }
    if ( options.exclude.includes( file ) ) {
      return false;
    }
    return true;
  });

  return filteredFiles;
}

function listFolders( rootDir, 
  exclude = [ 'node_modules', 'src', '.git', null ] ) {

  const folders = fs.readdirSync( `${rootDir}/` ).map(file => {
      const name = fs.statSync(file);
      if (name.isDirectory()) {
        return file;
      }
      return null;
  });

  const filteredFolders = _.filter(folders, (name) => {
      if ( ! exclude.includes( name ) ) {
          return true;
      }
  });

  return filteredFolders;
}

function listXslxInFolder( folderName ) {
  const filesInFolder = fs.readdirSync( folderName ).map(file => {
    return file;
  });
  const xlsxFiles = filesInFolder.filter(function (file) {
    if ( -1 !== file.indexOf( '~' ) ) {
      return false;
    }
    return path.extname(file).toLowerCase() === '.xlsx';
  });
  return xlsxFiles;
};

function _selectAThing( things, label ) {
  return rl.keyInSelect( things, label );
}

function selectAction() {
  const actionList = ['both', 'auto', 'custom'];
  let actionNum = rl.keyInSelect(actionList, "SELECT ACTION: ");
  return actionList[ actionNum ];
};

function selectFolder( folderList ) {
  return _selectAThing( folderList, "SELECT EMAIL FOLDER: " );
  // return rl.keyInSelect(folderList, "SELECT EMAIL FOLDER: ");
}

function selectXlsx( xlsxFiles ) {
  return rl.keyInSelect(xlsxFiles, "SELECT SPREADSHEET: ");
};


async function zipFolder( folderName ) {

  // make sure it's just the basename
  const zipFileName = `${path.basename(folderName)}`;
  const htmlFileName = `layout1.html`;
  const imageDir = `${zipFileName}/images`;

  // create a new ZipFile object
  const zip = new JSZip();

  // create a folder in the zip file
  zip.folder( zipFileName );

  // weird, had to change this to use fs.readFileSync() instead of async...
  try {
    zip.file( `${zipFileName}/${htmlFileName}`, fs.readFileSync(`${folderName}/${htmlFileName}` ) );
  }
  catch (err) {
    console.error( `Error reading ${folderName}/${htmlFileName}` );
    throw err;
  }

  // add a new folder to the zip for images
  zip.folder( `${zipFileName}/images` );

  // get the list of image files 
  const images = listFiles( `${folderName}/images` );

  // loop over the contents of the directory and add all the image files...
  _.forEach( images, (img) => {

    // had to make this synchronous as well for some reason...
    try {
      let data = fs.readFileSync( `${folderName}/images/${img}` );
      zip.file( `${imageDir}/${img}`, data, { binary: true } );
    }
    catch (err) {
      console.error( `Error adding ${img} to ${zipFileName}.zip` );
      throw err;
    }
  });

  // write the zip data to a file
  return zip
  .generateNodeStream({type: 'nodebuffer', streamFiles: true})
  .pipe( fs.createWriteStream( `${folderName}.zip` ) )
  .on( 'finish', function() {
    console.log( `${zipFileName}.zip written.` );
  });
  
}