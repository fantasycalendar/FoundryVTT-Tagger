import CONSTANTS from "./constants.js";

export const hotkeyState = {
    dropNoRules: false,
}

function isVersion9() {
    return foundry.utils.isNewerVersion((game?.version ?? game.data.version), "9.00");
}

export function registerHotkeysPre() {

    if (isVersion9()) {

        game.keybindings.register(CONSTANTS.MODULE_NAME, "do-not-apply-tag-rules", {
            name: "Don't apply tag rules on drop",
            editable: [
                { key: "ControlLeft" },
            ],
            onDown: () => {
                hotkeyState.dropNoRules = true;
            },
            onUp: () => {
                hotkeyState.dropNoRules = false;
            },
            precedence: CONST.KEYBINDING_PRECEDENCE.PRIORITY
        });

    }

}

export function registerHotkeysPost() {

    if (!isVersion9()) {

        window.addEventListener("keydown", (event) => {
            switch(event.code){
                case "ControlLeft":
                    hotkeyState.dropNoRules = true;
                    break;
            }
        });

        window.addEventListener("keyup", (event) => {
            switch(event.code){
                case "ControlLeft":
                    hotkeyState.dropNoRules = false;
                    break;
            }
        });

    }

}
