const excelToJson = require("convert-excel-to-json");
const fs = require("fs-extra");
const _ = require("lodash");
const sizeOf = require('image-size');
const path = require('path');


// helper for invoking auto build
const auto = async( folderName, spreadSheetName, outputSlug, config ) => {
  return build( folderName, spreadSheetName, outputSlug, config, 'auto' );
}

// helper for invoking custom build
const custom = async( folderName, spreadSheetName, outputSlug, config ) => {
  return build( folderName, spreadSheetName, outputSlug, config, 'custom' );
}

// make build asynchronous so we can use .then() blocks to wait on it to finish
const build = async (folderName, spreadSheetName, outputSlug, config, action) => {

  if ( !action ) {
    throw new Error( 'A build action must be specified.' );
  }

  // if no outputSlug supplied, use basename of folderName
  outputSlug = outputSlug ? outputSlug : path.basename( folderName );

  // same in both build scripts
  const result = excelToJson({
    sourceFile: `${folderName}/${spreadSheetName}.xlsx`,
    header: {
      rows: 1
    }
  });

  // FYI, 'SKU Information' is the name of the sheet in the spreadsheet
  /**
   * For each row in the spreadsheet...
   * Use forEach instead of map so we can kick out junk rows!!!
   */
  const data = [];
  result['SKU Information'].forEach( (row, rowNum) => {

    // remove any spaces from the URL (the data isn't always clean)
    // the footer row does not have a URL
    if ( row[config.url] ) {
      row[config.url] = row[config.url].replace( /\s+/g, '' );
    }

    // sanitize the slice data to avoid common errors
    // trim whitespace
    let slices = _.trim( row[config.slices] );
    // remove any remaining non-digit characters from both ends
    slices = slices.replace( /^\D+|\D+$/g, '' );
    // now replace one or more non-digits between numbers with a single period
    // bonus is that this now allows using periods in the spreadsheet instead of commas which aren't in the number pad
    slices = slices.replace( /\D+/g, '.' );

    // store the object instead of simply returning it so we can make sure it's not junk
    let obj = _.map(_.split(slices, '.'), num => {
      
      let imageNum = _.trim(num);

      // pulled from BuildCustom
      let custom = false;
      // add check for what action this is
      if ('custom' === action && imageNum == row[config.custom]) {
        let bgColor = 'FFFFFF';
        let fontColor = '020203';
        if (row[config.bgColor]) {
          bgColor = row[config.bgColor];
        }
        if (row[config.fontColor]) {
          fontColor = row[config.fontColor];
        }
        custom = {
          bgColor,
          fontColor
        };
      }

      return {
        num: Number(imageNum),
        sku: row[config.sku],
        alt: row[config.alt],
        url: row[config.url],
        // from BuildCustom
        custom
      };
    });

    // check to see if there are any slices on this row before adding it to the data array!!!
    if ( '' !== slices && null !== slices ) {
      data.push( obj );
    }

  });

  // BEGIN same as custom build except for autoFolderName
  const outputFolderName = `${outputSlug}_${action.toUpperCase()}`;
  const outputPath = `${folderName}/${outputFolderName}`;

  const sortedData = _.sortBy(_.flatMapDeep(data), obj => obj.num);

  // make sure all the images are accounted for
  for(var i = 1; i < sortedData.length; i++) {
    // if the sortedData turns out not to be sorted...
    if ( sortedData[i].num == sortedData[i-1].num ) {
      console.error(`\nERROR: Slice # ${sortedData[i-1].num} is  entered twice.\n`);
      console.log(`sortedData[${i-1}]: \n`, sortedData[i-1]);
      console.log(`sortedData[${i}]: \n`, sortedData[i]);
      process.exit();
    }
    if(sortedData[i].num - sortedData[i-1].num != 1) {
      console.error(`\nERROR: Slice # ${sortedData[i-1].num + 1} is missing.\n`);
      console.log( `error with these items...`)
      console.log(`sortedData[${i-1}]: \n`, sortedData[i-1]);
      console.log(`sortedData[${i}]: \n`, sortedData[i]);
      process.exit();
    }
  }

  const html = buildHtml( sortedData, folderName, action );

  // remember to return a promise so that the then() block will 
  return fs.ensureDir( outputPath )
  .then( () => {
    // console.log(`Build directory '${outputFolderName}' CREATED.`);
    // console.log( `Writing '${outputFolderName}/layout1.html'...` );

    // remember to return a promise!
    return fs.writeFile(`${outputPath}/layout1.html`, html);
  })
  .then( () => {
    // console.log( `Copying images to '${outputFolderName}/images'...` );

    // remember to return a promise!
    return fs.copy(`${folderName}/images`, `${outputPath}/images`);
  })
  .then( () => {
    // console.log( `Building ${outputFolderName}/text-only.txt...` );

    // remember to return a promise!
    return writeTextOnly( `${folderName}/${outputFolderName}`, buildTextOnly( data ) );    
  })
  .catch( err => {
    console.error( `Something went wrong while building ${outputFolderName}...` );
    console.log( err );
    throw err;
  });

  // END same as custom build except for autoFolderName

}

// buildHtml seem to be the same in both AUTO & CUSTOM
const buildHtml = (sortedData, folderName, action) => {
  const html = 
  `<table width="100%" bgcolor="#363636" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td style="border-collapse:collapse;" valign="top">
        <table bgcolor="#FFFFFF" align="center" width="580" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="border-collapse:collapse;" valign="top">
              <a href="*$website_P01$*" sllabel="Website"><img
                style="outline:none; text-decoration:none; -ms-interpolation-mode: bicubic; display:block; border: 0; margin: 0;"
                alt="Company Logo" height="70" src="/images/spacer.png"
                style="outline:none; text-decoration:none; -ms-interpolation-mode: bicubic; display:block; border: 0px;width:580px;height:70px;"
                slcomponent="photo1_CUS" sllabel="Logo_580x70" title="photo1_CUS" width="580" />
              </a>
            </td>
          </tr>
        </table>
        <table align="center" bgcolor="#FFFFFF" width="580" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; mso-table-lspace:0; mso-table-rspace:0;">
          <tr>
            ${checkData(sortedData, folderName, action)}
          </tr>
        </table>
      </td>
    </tr>
  </table>
  `;

  // add the HTML to setup the profile fields in Sproutloud
  // let setup = fs.readFileSync( `${path.dirname(__dirname)}/SPR_Setup.html` );  

  return html + '\n\n' + getSprSetup();
};

// significantly different than custom build
const checkData = (sortedData, folderName, action) => {
  let width = 0;

  let htmlString = "";
  // grab last cell so we can build the footer when we're done
  const lastCell = sortedData.pop();

  _.forEach(sortedData, data => {
    let imageNum = data.num;        
    if (imageNum < 10) imageNum = '0' + imageNum;

    const imageSrc = `${folderName}/images/image_${imageNum}.jpg`
    const dimensions = sizeOf(imageSrc);
    width += dimensions.width;
    // if we've reached full width, start a new row.
    if (width >= 580) {
      width = 0;
      htmlString += `
          ${buildTableData(data, dimensions, imageNum)}
        </tr> 
      </table>
      <table align="center" bgcolor="#FFFFFF" width="580" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; mso-table-lspace:0; mso-table-rspace:0;">
        <tr>
          `;
    }
    else {
      htmlString += `${buildTableData(data, dimensions, imageNum)}`
    }
  });

  if ( 'auto' === action ) {
    htmlString += buildAutoFooter( lastCell, sizeOf( `${folderName}/images/image_${lastCell.num}.jpg`), lastCell.num );
  }
  else {
    if ( false === lastCell.custom ) {
      console.warn( 'Omitting custom footer because the slice was not specified.' );
    }
    else {
      htmlString += buildCustomFooter(lastCell.custom);
    }
  }

  return htmlString
}

// differs from BuildCustom
let customCount = 0;
const buildTableData = ({ sku, alt, url, custom }, dimensions, imageNum) => {

  // if a custom cell
  if (custom) {
    customCount = customCount + 1;
    return `
      <td bgcolor="#${custom.bgColor}" color="#${custom.fontColor}" style="border-collapse: collapse; mso-table-lspace:0; mso-table-rspace:0; background-color: #${custom.bgColor} !important; color: #${custom.fontColor} !important;" valign="middle"  width="${dimensions.width}" height="${dimensions.height}"> 
        <a href="${url}" style="text-decoration:none !important;">
          <span style="color: #${custom.fontColor} !important; font-weight:bold;font-family:sans-serif; text-decoration: none !important;">
            <font face="Arial, Helvetica" size="5" color="#${custom.fontColor}" style="color: #${custom.fontColor} !important; text-decoration: none !important;">
              <b>$</b><b sllabel="${sku}" slcomponent="linetext${customCount}_CUS"></b>
            </font></span>
        </a>
      </td>`;
  }
  return `
    <td height="${dimensions.height}" style="border-collapse: collapse; mso-table-lspace:0; mso-table-rspace:0; line-height: ${dimensions.height}px;" valign="top" width="${dimensions.width}"><a href="${url}"><img style="outline:none; text-decoration:none; -ms-interpolation-mode: bicubic; display:block; border: 0; margin: 0;" src="images/image_${imageNum}.jpg" width="${dimensions.width}" height="${dimensions.height}" border="0" alt="${alt}" /></a></td>
    `;
};

// separate the footer out so we can unify the BuildAuto and BuildCustom
const buildAutoFooter = ({ alt, url }, dimensions, imageNum) => {
  return `
  <td style="border-collapse: collapse; mso-table-lspace:0; mso-table-rspace:0;" valign="top"> 
    <img style="outline:none; text-decoration:none; -ms-interpolation-mode: bicubic; display:block; border: 0; margin: 0;" src="images/image_${imageNum}.jpg" width="${dimensions.width}" height="${dimensions.height}" alt="Footer">
  </td>
  `;
};

// BuildCustom 
const buildCustomFooter = ({ bgColor, fontColor }) => {
  customCount = customCount + 1;
  return `
    <td bgcolor="#${bgColor}" color="#${fontColor}" style="background-color: #${bgColor} !important; border-collapse:collapse; color: #${fontColor} !important; padding: 30px 20px;" valign="top"> 
      <center style="background-color: #${bgColor} !important; color: #${fontColor} !important;">
        <font style="color: #${fontColor} !important; font-family:Arial, Helvetica, sans-serif; font-size:16px;  font-weight:bold; line-height:23px; text-align:center;" size="5" color="#${fontColor}">
          All offers valid now through close of business day
        </font>
        <span style="font-weight:bold;font-family:sans-serif;color:#${fontColor} !important;">
          <font color="#${fontColor}" face="Arial, Helvetica" size="4" style="color:#${fontColor} !important;">
            <b sllabel="Footer Info" slcomponent="linetext${customCount}_CUS"></b>
          </font>
        </span>
        <br />
        <font style="font-family:Arial, Helvetica, sans-serif;color:#${fontColor} !important;font-size:15px;text-align:center;line-height:20px;font-weight:300;" size="4" color="#${fontColor}">Click on products for additional information. While supplies last.</font>
        <br />
        <font style="font-family:Arial, Helvetica, sans-serif;color:#${fontColor} !important;font-size:13px;text-align:center;line-height:17px;font-weight:300;" size="3" color="#${fontColor}">
          <br />Not responsible for typographical errors. Subject to price and availability changes.</font>
      </center>
    </td>
  `;
}

// returns the HTML to set up the SPR hidden fields
const getSprSetup = () => {
  return `

<!-- AT THE END OF THE CONTENT TABLE PLACE THE FOLLOWING TABLE -->
<pre style="display: none; visibility: none;">  
____ ____ _  _ _  _ ____ _  _ ___    
|    |  | |\/| |\/| |___ |\ |  |     
|___ |__| |  | |  | |___ | \|  |     
                                     
____ _  _ ___                        
|  | |  |  |                         
|__| |__|  |                         
                                     
____ ____ ____ _  _                  
|___ |__/ |  | |\/|                  
|    |  \ |__| |  |                  
                                     
___  ____ ____                       
|__] |__/ |___                       
|    |  \ |___                       
                                     
___ ____ ____    ___ ____            
 |  |__| | __     |  |  |            
 |  |  | |__]     |  |__|            
                                     
___  ____ ___ ___ ____ _  _          
|__] |  |  |   |  |  | |\/|          
|__] |__|  |   |  |__| |  |          
                                                                                                                 
</pre>
<table align="center" border="0" cellpadding="0" cellspacing="0" width="580" style="display:none; visibility: none;" height="0">
    <tbody>
        <tr>
            <td style="border-collapse:collapse;" valign="top"> <div sllabel="Company Name" slcomponent="fullname_P01"></div></td>
            <td style="border-collapse:collapse;" valign="top"> <div sllabel="Address1" slcomponent="address1_P01"></div></td>
            <td style="border-collapse:collapse;" valign="top"> <div sllabel="Address2" slcomponent="address2_P01"></div></td>
        </tr>
        <tr>
            <td style="border-collapse:collapse;" valign="top" ><div sllabel="City" slcomponent="city_P01"></div></td>
            <td style="border-collapse:collapse;" valign="top"> <div sllabel="State" slcomponent="state_P01"></div></td>
            <td style="border-collapse:collapse;" valign="top" ><div sllabel="Zip" slcomponent="zip_P01"></div></td>
        </tr>
        <tr>
            <td style="border-collapse:collapse;" valign="top"> <div sllabel="Phone" slcomponent="phone_P01"></div></td>
            <td style="border-collapse:collapse;" valign="top"> <div sllabel="Email" slcomponent="email1_P01"></div></td>
            <td style="border-collapse:collapse;" valign="top"> <div sllabel="Website" slcomponent="website_P01"></div></td>
        </tr>
        <tr>
            <td style="border-collapse:collapse;" valign="top"> <div sllabel="ISV" slcomponent="storename_P01"></div></td>
            <td style="border-collapse:collapse;" valign="top"> <div sllabel="DealerID" slcomponent="groupname_P01"></div></td>
            <td style="border-collapse:collapse;" valign="top"> <div sllabel="DealerID2" slcomponent="credentials_P01"></div></td>

        </tr>
        <tr>

            <td style="border-collapse:collapse;" valign="top"> <div sllabel="TabID" slcomponent="storespecialties1_P01"></div></td>
            <td style="border-collapse:collapse;" valign="top"> <div sllabel="GuestUserID" slcomponent="storespecialties2_P01"></div></td>
            <td style="border-collapse:collapse;" valign="top"> <div sllabel="ServerID" slcomponent="storespecialties3_P01"></div></td>
            <td style="border-collapse:collapse;" valign="top"> <div sllabel="Enhanced" slcomponent="storespecialties4_P01"></div></td>
        </tr>
        <tr>
            <td style="border-collapse:collapse;" valign="top"> <div sllabel="PURL" slcomponent="title_P01"></div></td>

        </tr>
    </tbody>
</table>


  `;
}

const buildTextOnly = ( rowData ) => {
  let textOnly = '';
  _.forEach( rowData, data => {
    if ( data[0].sku && data[0].alt && data[0].url ) {
      textOnly += data[0].sku + '\n' + data[0].alt + '\n' + data[0].url + '\n\n';
    }
    // make sure that PDF links are included in the text only version
    else if ( data[0].alt && data[0].url ) {
      textOnly += data[0].alt + '\n' + data[0].url + '\n\n';
    }
    // PDF links don't usually have an alt value so account for both possibilities
    else if ( data[0].url ) {
      textOnly += data[0].url + '\n\n';
    }
  });
  return _.trim( textOnly );
}

const writeTextOnly = async ( outputFolderName, textData ) => {
  const fileName = `${outputFolderName}/text-only.txt`;
  const dirName = path.basename( outputFolderName );
  return fs.writeFile( fileName, textData, err => {
    if ( err ) {
      console.error( `${dirName} Text-Only Build error`, err );
      throw err;
    }
    else {
      // console.log( `${dirName} Text-Only GENERATED` );
    }
  });
}

module.exports = { auto, build, custom };