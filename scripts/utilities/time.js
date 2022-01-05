/**
 * Convert a time in milliseconds to 200ms precision.
 * @param {number} time - The time that shall be converted into 200ms steps.
 * @returns {number} The input time converted into 200ms increments.
 */
export function getTimeInRaster(time) {
  /**
   * Note: This method can cause the script to finish 200ms before
   * the target time. This error seems to be random since the same
   * execution time input can lead to both outcomes. Currently there
   * appears to be no way around this and the accuracy of 400ms has to
   * be accounted for in the controller script.
   */

  return Math.ceil(time / 200) * 200;
}
