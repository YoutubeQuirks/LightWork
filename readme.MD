# LightWork

## Introduction
LightWork is an open source browser Userscript that returns the old embedded Youtube player UI. It does this by loading the old player interface from before March 2026.


## Installation

### Chrome

  1. Go to the Chrome Web Store and install a UserScript extension:
   [TamperMonkey for Chrome](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
  2. Click **Add to Chrome** to install TamperMonkey
  3. Paste this url into your browser: `about:extensions`
  4. Toggle `Developer Mode` on
  5. Click the TamperMonkey extension and scroll down a bit. Toggle the `Allow UserScripts` option on and restart your browser
  7. Install the LightWork loader (automatic updates): [LightWork](https://raw.githubusercontent.com/YoutubeQuirks/LightWork/refs/heads/main/LightWorkLoader.user.js)
  8. Load a video in the embedded player and enjoy!

### Firefox

  1. Go to the Firefox addons store and install a UserScript extension:
   [TamperMonkey for Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
  2. Click **Add to Firefox** to install TamperMonkey
  3. Install the LightWork loader (automatic updates): [LightWork](https://raw.githubusercontent.com/YoutubeQuirks/LightWork/refs/heads/main/LightWorkLoader.user.js)
  4. Load a video in the embedded player and enjoy!

## Configuration

LightWork allows configuration via URL parameters and UserScript flags.

#### Url Parameters:
1.) `?LightWorkIgnore=1`: The player will be ignored by LightWork and the new UI loads.  
2.) `?LightWorkLanguage=LAN_CODE`: The following language will be loaded and used by the player. This has priority over the "?hl=" parameter. (e.g. en_US)

#### UserScript flags:
1.) `LightWork_useBackup`: The backup player will be loaded instead of the main one.  
2.) `LightWork_retryInjection`: If LightWork runs too late and injection fails, this flag will reload the page and retry.


### Public Project Usage
You are allowed to use LightWork in your own project (e.g. a browser extension), as long as it follows the [LICENSE](LICENSE) file.

## Issues
If you encounter any issues or bugs, please create an issue on Github by visiting this URL: https://github.com/YoutubeQuirks/LightWork/issues.

## Updates
You can now use the LightWork loader, which automatically executes the latest version of the script. If you still want to use LightWork itself as a UserScript, you will have to manually update it via your UserScript manager.