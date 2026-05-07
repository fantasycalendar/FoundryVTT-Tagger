import CONSTANTS from "./constants.js";

export const hotkeyState = {
    dropNoRules: false,
};

export function registerHotkeys() {
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
        precedence: CONST.KEYBINDING_PRECEDENCE.PRIORITY,
    });
}
