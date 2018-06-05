/**
 * @typedef {int[]} Board
 *
 * @typedef {{field: int, next: HashStack[]}} HashStack
 *
 * @typedef {function(Board, int, int): void} TurnApplier
 *
 * @typedef {MoveOld[]} Moves
 *
 * @typedef {Move[]} Turns
 */

class Moves extends Array {
    constructor() {
        super();
        throw new Error("Instantiated interface Moves");
    }

    /**
     * @param {int} r1
     * @param {int} c1
     * @param {int} r2
     * @param {int} c2
     * @return {boolean}
     */
    containsMove(r1, c1, r2, c2) {
        return true;
    }
}