# SPR Node Script

Generate Auto or Custom SPR Emails!

## Installation
```sh
$ git clone git@gitlab.com:rubayth/spr-script.git
$ cd spr-script
$ npm install 
```

## Usage
### Step 1 
  - Create a new email stub `npm run setup -- <new-directory-name> <build-directory-slug>`.
  - Use Jira ticket number for the directory name and Jira ticket title for build directory slug.
  - e.g., `npm run setup -- SPR-252 SPR_011620_CA_Furn` (NOTE: these values are used below in examples)
  - Copy network assets (JPG, PSD, XLSX) into your new email folder.
  - Root directory of repo should look roughly like this: 
```
node_modules/
SPR-246/          //  folder contents => (.psd, .jpg, .xlsx)
  SPR_010220_CA_FBS_AUTO/
    ... built email assets
  SPR_010220_CA_FBS_CUSTOM/
  config.js
  *.psd
  *.jpg
  *.xlsx
  SPR_010220_CA_FBS_AUTO.zip
  SPR_010220_CA_FBS_CUSTOM.zip

SPR-252/           folder contents => (.psd, .jpg, .xlsx)
src/
index.js
package-lock.json
package.json
pasties.txt
README.md
setup.sh
```
### Step 2 - PSD
  - Slice the PSD file, making sure rows of slices go all the way across.
  - After slicing, save the PSD file.
  - Then press `Cmd+Option+Shift+S` (Mac) or `Ctrl+Alt+Shift+S` (Windows & Linux) to export the slices via "Save for Web Legacy".
  - In the Photoshop dialog, click "Save".
  - In the file system dialog, change the filename to "image.jpg", then select the options listed below
    - `Format: Images Only`
    - `Settings: Default Settings`
    - `Slices: All User Slices`
  - **Note:** using "image.jpg" for the file name will output the slice images with the naming convention `image_{slice number}.jpg` which is essential for proper function of the email builder script.

### Step 3 - Excel
  - Edit `SPR-252/config.js` file in src folder to match columns in spreadsheet
    - Default Config:
```
module.exports = {
    config: {
        emailName: "SPR_011620",
        sku: "C",
        alt: "D",
        url: "M",
        slices: "O",
        custom : "P",
        bgColor: "Q",
        fontColor: "R",

    }
}
```
  - Column O: input slice numbers seperated by any non-digit character (e.g., commas, periods, spaces, pluses, letters).
  - The following only affect CUSTOM emails, but the values should be done in the same spreadsheet:
    - Column P: input slice number containing the price (custom)
    - Column Q: Six character hexcode without `#` for background color of the custom slice (Leave empty if white)
      - e.g., `fd1d1f`
    - Column R: Six character hexcode without `#` for font color of custom value. (Leave empty if black)
      - e.g., `0a0203`
  - After last row, input values for footer on Column O, P, Q, R

### Example SpreadSheet: (Row #5 is footer)
| Row # | C | D | M | N | O | P | Q | R |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| 1 | Full SKU | Description | CONCATENATE |  | SLICES | CUSTOM SLICE | BG COLOR | FONT COLOR |
| 2 | RAC84251 | Lemon/Lime Disinfecting Wipes | /sl-forward-sprisv/RAC/84251/1022221859/668-851 |  | 2, 3, 5, 7, 8, 10 | 8 | e3e5a7 | |
| 3 |RAC85017|Hydrogen Peroxide Multi-Purpose Cleaner|/sl-forward-sprisv/RAC/85017/1024721485/769-775| |4, 6, 9, 11, 9	|9|
| 4 ||KND25954|Dark Chocolate Cocoa Bars|/sl-forward-sprisv/KND/25954/1040919837/658-806||46, 47, 49, 51, 53|51|49def4
| 5 |||||54|54|5a6265|

### Step 4 - Run the build script

#### Option 1: Automagick
This one is the easiest when you're building both AUTO and CUSTOM because it does __*EVERYTHING*__ in the least steps.
  - Sniffs the email directory for spreadsheets and uses the first one it finds;
    - Smart enough to exclude temporary Excel files (e.g. `~$LONG_CRAY-CRAY_FILENAME-WITH-QUESTIONABLE+CHARACTERS AND MAYBE_SPACES IN-THE-NAME.xlsx`);
    - Doesn't account for emails that might have 2 spreadsheets for some reason (it hasn't come up yet, but I'm new at this...);
  - Creates build directories `SPR_011620_CA_Furn_AUTO/` and `SPR_011620_CA_Furn_CUSTOM/` in `SPR-252/`;
  - Creates `text-only.txt` in each build directory;
  - Zips both build directories for easy drag and drop into Email on Acid;
  - (Optional): can build only `auto` or `custom`, if either value is supplied as CLI argument.
    - e.g. `$ node ../index.js auto`
  - Opens both HTML files in your browser.

```sh
# Option 1
# Assuming you're starting in the root directory of the repo instead of the directory for this email...
$ cd SPR-252
$ node ../index.js
# The above builds both Auto and Custom versions.
# Alternatively, specify which build version you want.
$ node ../index.js auto
# OR
$ node ../index.js custom
```

#### Option 2: interactive selection of folder, spreadsheet, and build version.
This ultimately triggers the Automagick build with whatever options you select.

**Note:** Pretty sure it still works but I may have broken it when I was making everything else awesomer.

```sh
# Option 2
# Assuming you're in the root directory of the repo...
$ npm start
# Pick the email directory.
# Pick the spreadsheet in that directory.
# Pick the build version(s).
# Cross fingers.
```

### Troubleshooting the build script
  - Error on start
    - Make sure the spr folder with the spreadsheet, images, PSD is in the directory
  - Missing slice #0 error
    - Looking for trailing comma in spreadsheet and remove it
  - Missing slice #(number) error
    - Either a duplicate slice or missing slice. Will output slice information in JSON before and afer error for reference.
    - If outputed JSON contains NaN values, make sure config.js is setup properly.

---


### Sproutloud
  *COMING SOON*

### Email on Acid
  *COMING SOON*

### Jira
  *COMING SOON*

