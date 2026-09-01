/*
Copyright © 2026 YoutubeQuirks (https://github.com/YoutubeQuirks).
Permission is granted to modify and use this file for personal or public use, provided that the modifications do not aim to
hide the script’s original identity or trademarks.
This copyright notice must remain at the top of the file and not be modified.
*/

// ==UserScript==
// @name         LightWorkLoader
// @namespace    YoutubeQuirks
// @version      1.00
// @description  Returns the old Embedded player UI. The script is in beta, bugs and edge cases may occur.
// @author       YoutubeQuirks
// @homepage     https://github.com/YoutubeQuirks/LightWork
// @updateURL    https://raw.githubusercontent.com/YoutubeQuirks/LightWork/refs/heads/main/LightWorkLoader.user.js
// @downloadURL  https://raw.githubusercontent.com/YoutubeQuirks/LightWork/refs/heads/main/LightWorkLoader.user.js
// @supportURL   https://github.com/YoutubeQuirks/LightWork/issues
// @icon         https://raw.githubusercontent.com/YoutubeQuirks/LightWork/refs/heads/main/DisplayIcon.png
// @match        https://*.youtube.com/embed/*
// @match        https://example.net/*
// @run-at       document-start
// ==/UserScript==


// LightWork now supports automatic updates!!!
// You don‘t have to worry about updating it ever again

// Private NameSpace
(function () {
    'use strict';

    //-- START OF USER CONFIG --//

    // LightWork now loads the latest embed player build with the old UI instead of loading older builds. The old build init technique is only kept as backup.
    // indicates if the backup player should be loaded
    let LightWork_useBackup = false;
    // indicates if the page should be reloaded when LightWork is injected too late and retry (recommended due to weird browser behavior)
    let LightWork_retryInjection = true;

    //-- END OF USER CONFIG --//

    if (window.trustedTypes && window.trustedTypes.createPolicy && !window.trustedTypes.defaultPolicy) {
        window.trustedTypes.createPolicy('default', {
            createHTML: string => string,
            createScriptURL: string => string,
            createScript: string => string
        });
    }

    // Fetches the LightWork script
    function LightWorkLoader_fetch(BlockMainThread) {
        // If we are blocking the main thread (preventing the rest of the page from loading before our script does)
        if (BlockMainThread) {
            // Create a XMLHttpRequest request
            let xhr = new XMLHttpRequest();

            // Open it and set the URL to the main LightWork script
            xhr.open(
                "GET",
                "https://raw.githubusercontent.com/YoutubeQuirks/LightWork/refs/heads/main/LightWork.user.js",
                false
            );

            // Send it (this blocks the main thread until the request resolves)
            xhr.send();

            // Append the response text as a script tag and execute it
            let script = document.createElement("script");
            script.setAttribute("LightWorkLoader", "");
            if (LightWork_useBackup) {
                script.setAttribute("LightWork_useBackup", "");
            }

            if (LightWork_retryInjection) {
                script.setAttribute("LightWork_retryInjection", "");
            }

            script.textContent = xhr.responseText;
            document.documentElement.appendChild(script);
        }
        // Otherwise, we don’t need to block the main thread (use fetch instead)
        else {
            fetch("https://raw.githubusercontent.com/YoutubeQuirks/LightWork/refs/heads/main/LightWork.user.js")
                .then(r => r.text())
                .then(responseText => {
                    // Append it as a script tag and execute it
                    let script = document.createElement("script");
                    if (LightWork_useBackup) {
                        script.setAttribute("LightWork_useBackup", "");
                    }

                    if (LightWork_retryInjection) {
                        script.setAttribute("LightWork_retryInjection", "");
                    }
                    script.textContent = responseText;
                    document.documentElement.appendChild(script);
                });
        }
    }

    // If we are running inside the new Youtube player, but not LightWorkPrivate or LightWorkIgnore
    if (window.location.href.includes('youtube.com/embed/') && !window.location.href.includes('?LightWorkPrivate=1') && !window.location.href.includes('?LightWorkIgnore=1')) {
        // Fetch the main LightWork script and block the main thread
        LightWorkLoader_fetch(true);
    }
    // Otherwise, if we are running inside a LightWorkPrivate iframe
    else if ((window.self !== window.top) && window.location.href.includes('?LightWorkPrivate=1')) {
        // Fetch the main LightWork script, but do not block the main thread
        LightWorkLoader_fetch(false);
    }

    // End of Private NameSpace
})();