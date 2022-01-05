/**
 * Print a horizintal line in the log window to separate blocks of information.
 * @param {import("..").NS} ns
 */
export function logPrintLine(ns) {
  ns.print("+------------------------------------------------+");
}

/**
 * Print a named variable to the log window with a unified format.
 * @param {import("..").NS} ns
 * @param {string} varName - The name of the variable.
 * @param {any} varValue - The value of the variable.
 */
export function logPrintVar(ns, varName, varValue) {
  /**
   * The text that will be printed to the debug log.
   * @type {string}
   */
  var text = "| ";

  /** Add the name of the variable to the left */
  text += ns.sprintf("%-21s =", varName);

  /** Add the value in the appropriate formatting */
  if (typeof varValue == "string") {
    text += ns.sprintf("= %21s", varValue);
  } else if (typeof varValue == "number") {
    text += ns.sprintf("= %21.2f", varValue);
  } else if (typeof varValue == "boolean") {
    text += ns.sprintf("= %21t", varValue);
  } else {
    text += "=    Format Not Defined";
  }

  /** Add a # to the end to complete the look */
  text += " |";

  ns.print(text);
}

/**
 * Print a named variable to the log window with a unified format.
 * @param {import("..").NS} ns
 * @param {string} varName - The name of the variable.
 * @param {number} varValue - The value of the variable.
 */
export function logPrintFloat(ns, varName, varValue) {
  /**
   * The text that will be printed to the debug log.
   * @type {string}
   */
  var text = "| ";

  /** Add the name of the variable to the left */
  text += ns.sprintf("%-21s =", varName);

  /** Add the value in the appropriate formatting */
  text += ns.sprintf("= %21.6f", varValue);

  /** Add a # to the end to complete the look */
  text += " |";

  ns.print(text);
}

/**
 * Print a header to the terminal to display script executions.
 * @param {import("..").NS} ns
 */
export function tPrintHeader(ns) {
  /**
   * The text that will be printed to the terminal.
   * @type {string}
   */
  var text = "||    Action    |";
  /**
   * The amount of sapces that must be filled in to align the text with other scripts.
   * The maximum script name length is assumed to be 25 characters. The debug string
   * itself is 75 characters long.
   * @type {number}
   */
  var padding = 120 - ns.getScriptName().length;

  text += "   ID   | Money | Secrty ";
  text += "|     Time    | Time Err ";
  text += "|   Error   ||";

  ns.tprint(text.padStart(padding));
}

/**
 * A class that holds debug information about a script execution.
 */
export class ActionText {
  /**
   * Create an instance of the debug information class.
   */
  constructor() {
    /**
     * The name of the action.
     * @type {string}
     */
    this.action = "Default";
    /**
     * The ID of the action.
     * @type {number}
     */
    this.id = 0;
    /**
     * The money percentage on the target.
     * @type {number}
     */
    this.money = 0;
    /**
     * The security difference compared to minimum security.
     * @type {number}
     */
    this.security = 0;
    /**
     * The time when the action finished.
     * @type {number}
     */
    this.time = 0;
    /**
     * The difference between commanded and actual finish time.
     * @type {number}
     */
    this.timeError = 0;
    /**
     * Additional error information.
     * @type {string}
     */
    this.error = "";
  }
}

/**
 * Print the outcome of a script execution to the terminal.
 * @param {import("..").NS} ns
 * @param {ActionText} actionText - The debug text object that shall be printed.
 */
export function tPrintScript(ns, actionText) {
  /**
   * The text that will be printed to the terminal.
   * @type {string}
   */
  var text = "|| ";
  /**
   * The amount of sapces that must be filled in to align the text with other scripts.
   * The maximum script name length is assumed to be 25 characters. The debug string
   * itself is 75 characters long.
   * @type {number}
   */
  var padding = 120 - ns.getScriptName().length;

  text += ns.sprintf("%-12s | ", actionText.action);
  text += ns.sprintf("%6i | ", actionText.id);
  text += ns.sprintf("%3d ", actionText.money) + "% | ";
  text += ns.sprintf("%6.2f | ", actionText.security);
  text += ns.sprintf("%11i | ", actionText.time);
  text += ns.sprintf("%+8d | ", actionText.timeError);
  text += ns.sprintf("%9s ||", actionText.error);

  ns.tprint(text.padStart(padding));
}
