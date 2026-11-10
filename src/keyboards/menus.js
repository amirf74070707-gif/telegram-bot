const { Markup } = require("telegraf");
const { MAIN_MENU_LABEL, MODES } = require("../constants/modes");

function mainKeyboard() {
  const rows = [];

  for (let index = 0; index < MODES.length; index += 2) {
    rows.push(MODES.slice(index, index + 2).map((mode) => mode.label));
  }

  rows.push([MAIN_MENU_LABEL]);
  return Markup.keyboard(rows).resize().persistent();
}

module.exports = { mainKeyboard };
