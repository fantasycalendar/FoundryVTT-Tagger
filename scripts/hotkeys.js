import CONSTANTS from "./constants.js";

export const hotkeyState = {
    ctrlDown: false,
    altDown: false,
    shiftDown: false
}

function isVersion9() {
    return isNewerVersion((game?.version ?? game.data.version), "9.00");
}

export function registerHotkeysPre() {

    if (isVersion9()) {

        game.keybindings.register(CONSTANTS.MODULE_NAME, "do-not-apply-tag-rules", {
            name: "Force drop one item",
            uneditable: [
                { key: "AltLeft" },
            ],
            onDown: () => {
                hotkeyState.altDown = true;
            },
            onUp: () => {
                hotkeyState.altDown = false;
            },
            reservedModifiers: ["SHIFT", "CONTROL"]
        });

    }

}

export function registerHotkeysPost() {

    if (!isVersion9()) {

        window.addEventListener("keydown", (event) => {
            switch(event.code){
                case "AltLeft":
                    hotkeyState.altDown = true;
                    break;
            }
        });

        window.addEventListener("keyup", (event) => {
            switch(event.code){
                case "AltLeft":
                    hotkeyState.altDown = false;
                    break;
            }
        });

    }

}