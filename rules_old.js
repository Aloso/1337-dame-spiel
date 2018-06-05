"use strict";

class Action {
    constructor() {
        if (new.target === Action) {
            throw new Error("instantiated abstract class Action");
        }
    }
    apply(view) {}
    undo(view) {}
}
class TakeAction extends Action {
    constructor(field, piece) {
        super();
        this.field = field;
        this.piece = piece;
    }
    apply(view) {
        view.applyTake(this.field);
    }
    undo(view) {
        view.applyPut(this.field, this.piece);
    }
}
class PutAction extends Action {
    constructor(field, piece) {
        super();
        this.field = field;
        this.piece = piece;
    }
    apply(view) {
        view.applyPut(this.field, this.piece);
    }
    undo(view) {
        view.applyTake(this.field);
    }
}
class MoveAction extends Action {
    constructor(field1, field2, piece) {
        super();
        this.field1 = field1;
        this.field2 = field2;
        this.piece = piece;
    }
    apply(view) {
        view.applyMove(this.field1, this.field2, this.piece);
    }
    undo(view) {
        view.applyMove(this.field2, this.field1, this.piece);
    }
}
class ChangeAction extends Action {
    constructor(field, piece1, piece2) {
        super();
        this.field = field;
        this.piece1 = piece1;
        this.piece2 = piece2;
    }
    apply(view) {
        view.applyChange(this.field, this.piece1, this.piece2);
    }
    undo(view) {
        view.applyChange(this.field, this.piece2, this.piece1);
    }
}



class MoveOld {
    constructor() {
        throw new Error("Instantiated interface MoveOld");
    }
    isValid() {}
    getError() {}
    field1() {}
    field2() {}
    isJump() {}
    distanceForward() {}
    /**
     * @returns {Board}
     */
    apply() {}

    /** @return {Action[]} */
    getActions() {}
    /** @return {Action[]} */
    getInverseActions() {}
    allowTurnContinue() {}
    allowTurnEnd() {}
    toString() {}
    equals(move) {}
    equalsCoords(r1, c1, r2, c2) {}
}

/**
 * @typedef {InternationalMove} MoveOld
 */


/**
 * @typedef {int[]} board
 * @typedef {int} player - 1 or -1
 */

/**
 * @param {Model} model
 * @param {int} size
 * @return {InternationalRules}
 */
function getInternationalRules(model, size) {
    size |= 0;

    if (size < 4) {
        throw new Error("Can't play on a board that small: " + size);
    } else if (size > 50) {
        throw new Error("Boards that big aren't supported: " + size);
    }

    function findPossibleMovesFor(arr, board, player, pos, repeated, lastMove) {
        //TODO optimize!!!!

        let r1 = (pos / size) | 0;
        let c1 = pos % size;
        if (Math.abs(board[pos]) === 2) {
            for (let i = 0; i < board.length; i++) {
                let r2 = (i / size) | 0;
                let c2 = i % size;
                let mv = new InternationalMove(player, r1, c1, r2, c2, repeated, lastMove, board);
                if (mv.isValid()) {
                    arr.push(mv);
                }
            }
        } else {
            /** @type {MoveOld[]} */
            let moves = [
                new InternationalMove(player, r1, c1, r1 + 1, c1 + 1, repeated, lastMove, board),
                new InternationalMove(player, r1, c1, r1 + 1, c1 - 1, repeated, lastMove, board),
                new InternationalMove(player, r1, c1, r1 - 1, c1 + 1, repeated, lastMove, board),
                new InternationalMove(player, r1, c1, r1 - 1, c1 - 1, repeated, lastMove, board),
                new InternationalMove(player, r1, c1, r1 + 2, c1 + 2, repeated, lastMove, board),
                new InternationalMove(player, r1, c1, r1 + 2, c1 - 2, repeated, lastMove, board),
                new InternationalMove(player, r1, c1, r1 - 2, c1 + 2, repeated, lastMove, board),
                new InternationalMove(player, r1, c1, r1 - 2, c1 - 2, repeated, lastMove, board),
            ];
            moves.forEach(mv => {
                if (mv.isValid()) arr.push(mv);
            });
        }
    }

    function moveArrContains(r1, c1, r2, c2) {
        for (let i = 0; i < this.length; i++) {
            if (this[i].equalsCoords(r1, c1, r2, c2)) return true;
        }
        return false;
    }

    let iRMoveCache = null;

    class InternationalRules extends Rules {
        constructor() {
            super();
        }
        boardSize() {
            return 10;
        }
        getName() {
            return "International";
        }
        possibleMoves(player, board, repeated, lastMove) {
            if (iRMoveCache !== null) return iRMoveCache;
            /** @type {Moves} */
            let res = [];
            if (repeated) {
                findPossibleMovesFor(res, board, player, lastMove.field2(), true, lastMove);
            } else {
                for (let i = 0; i < board.length; i++) {
                    if (board[i] * player > 0) {
                        findPossibleMovesFor(res, board, player, i, false);
                    }
                }
            }
            res.containsMove = moveArrContains;
            iRMoveCache = res;

            return res;
        }
        // Expensive
        allowedTurns(player, board, repeated, lastMove) {
            let tm = performance.now();
            /** @type {Moves} */
            let res = this.possibleMoves(player, board, repeated, lastMove);
            let jumps = [];
            res.forEach(move => { if (move.isJump()) jumps.push(move) });
            if (jumps.length > 0 || repeated) {
                res = jumps;
                if (repeated) {
                    // Filter moves that don't use previous piece
                    res = res.filter(m => m.row1 === lastMove.row2 && m.col1 === lastMove.col2);
                }
            }
            tm = performance.now() - tm;
            if (tm >= 10) {
                console.warn("WARNING: calculating allowed moves took " + tm.toFixed(1) + " ms");
            }

            res.containsMove = moveArrContains;
            return res;
        }
        getMove(player, row1, col1, row2, col2, repeated, lastMove) {
            return new InternationalMove(player, row1, col1, row2, col2, repeated, lastMove, model.unsafe.board);
        }
        clearCache(board) {
            iRMoveCache = null;
        }
        endTurn(board) {
            //TODO remove pieces
            iRMoveCache = null;
        }
        getEndActions(board) {
            return piecesToRemove.map(f => new TakeAction(f, board[f]));
        }
        getWinner(board) {
            let count1 = 0, count2 = 0;
            for (let i = 0; i < board.length; i++) {
                if (board[i] < 0) count1++;
                else if (board[i] > 0) count2++;
            }
            return count1 === 0 ? -1 : 1;
        }
        // Might be expensive
        isContinueAllowed(player, board, repeated, lastMove) {
            if (lastMove.allowTurnContinue()) {
                let allowedMoves = this.allowedTurns(player, board, repeated, lastMove);
                return allowedMoves.length > 0;
            }
            return false;
        }
        isSkipAllowed(player, board, repeated, lastMove) {
            if (!repeated) return false;
            if (lastMove.allowTurnEnd()) return true;
            return !this.isContinueAllowed(player, board, true, lastMove);
        }
        isUndoAllowed(board) {
            return true;
        }
    }


    /**
     * @augments MoveOld
     */
    class InternationalMove {
        /**
         * @param {int} player - 1 for first player, -1 for second player
         * @param {int} row1 - row of first field
         * @param {int} col1 - column of fist field
         * @param {int} row2
         * @param {int} col2
         * @param {boolean} repeated
         * @param {MoveOld} [lastMove] necessary only if repeated is true
         * @param {Board} board
         */
        constructor(player, row1, col1, row2, col2, repeated, lastMove, board) {
            this.player = player;
            this.row1 = row1;
            this.col1 = col1;
            this.row2 = row2;
            this.col2 = col2;
            this.repeated = repeated;
            this.lastMove = lastMove;
            this.board = board;
        }
        /**
         * Expensive
         * @returns {boolean}
         */
        isValid() {
            return !this.getError();
        }
        /**
         * Expensive
         * @returns {string|boolean} a string containing the error message, or false if there is no error
         */
        getError() {
            if (this.repeated) {
                if (this.lastMove.row2 !== this.row1 || this.lastMove.col2 !== this.col1) {
                    return "You must use the same piece again or end your move";
                }
                if (this.lastMove.row1 === this.row2 && this.lastMove.col1 === this.col2) {
                    return "You can't jump back to where just you were";
                }
                if (Math.abs(this.distanceForward()) < 2) {
                    return "You have to do a jump again or end your move";
                }
            }

            if (this.row1 < 0 || this.col1 < 0 || this.row2 < 0 || this.col2 < 0) {
                return "Coordinates mustn't be negative";
            }
            if (this.row1 >= size || this.col1 >= size || this.row2 >= size || this.col2 >= size) {
                return "Coordinates mustn't be bigger than the board size";
            }
            if (this.row1 === this.row2 && this.col1 === this.col2) return "You have to move the piece";
            let v1 = this.board[this.row1 * size + this.col1];
            let v2 = this.board[this.row2 * size + this.col2];

            if (v2 !== 0 || v1 * this.player <= 0) {
                if (v1 === 0) return "Can't move from here, field is empty";
                if (v2 === 0) return "Can't move from here, the piece belongs to your opponent";
                return "Can't move here, field is occupied";
            }
            if (!this.onSameDiagonal()) {
                return "Fields aren't on the same diagonal";
            }
            if (!this.isKing(this.piece())) {
                let distance = this.distanceForward();
                if (distance === -1) return "Men can't walk backward's";

                let absDist = Math.abs(distance);
                if (absDist > 2) return "Men can't go that far in one move";
                if (this.isJump()) {
                    let row = (this.row1 + this.row2) / 2;
                    let col = (this.col1 + this.col2) / 2;
                    if (this.board[row * size + col] * this.player >= 0) {
                        return "You can only jump over your opponent's pieces";
                    }
                }
            } else {
                let between = this.piecesBetween();
                let pieces = between.filter(v => v !== 0);
                if (pieces.length > 1) return "You can't jump over multiple pieces";
                if (pieces.some(v => v * this.player > 0)) return "You can't jump over your own pieces";
            }
            return false;
        }
        onSameDiagonal() {
            return Math.abs(this.row1 - this.row2) === Math.abs(this.col1 - this.col2);
        }
        distanceForward() {
            return (this.row2 - this.row1) * this.player;
        }
        isJump(ignoreMarkedForDeath) {
            let piece = this.piece();
            if (!this.isKing(piece)) {
                return Math.abs(this.row2 - this.row1) > 1;
            } else if (ignoreMarkedForDeath) {
                return this.fieldsBetween().some(f => this.board[f] !== 0);
            } else {
                return this.fieldsBetween().some(f => this.board[f] !== 0 && removeAssoc[f] == null);
            }
        }
        field1() {
            return this.row1 * size + this.col1;
        }
        field2() {
            return this.row2 * size + this.col2;
        }
        piece() {
            return this.board[this.row1 * size + this.col1];
        }
        piecesBetween() {
            let ri = this.row2 > this.row1 ? 1 : -1;
            let ci = this.col2 > this.col1 ? 1 : -1;
            let res = [];
            for (let row = this.row1 + ri, col = this.col1 + ci; row !== this.row2; row += ri, col += ci) {
                res.push(this.board[row * size + col]);
            }
            return res;
        }
        fieldsBetween() {
            let ri = this.row2 > this.row1 ? 1 : -1;
            let ci = this.col2 > this.col1 ? 1 : -1;
            let res = [];
            for (let row = this.row1 + ri, col = this.col1 + ci; row !== this.row2; row += ri, col += ci) {
                res.push(row * size + col);
            }
            return res;
        }
        isKing(piece) {
            return piece * this.player === 2;
        }
        transforms(piece) {
            if (!this.isKing(piece)) {
                return this.row2 === (this.player === 1 ? size - 1 : 0);
            }
            return false;
        }
        apply() {
            let board = model.boardCopy;
            let piece = this.piece();
            board[this.row2 * size + this.col2] = piece;
            board[this.row1 * size + this.col1] = 0;
            if (this.transforms(piece)) {
                board[this.row2 * size + this.col2] = piece * 2;
            }
            const between = this.fieldsBetween();
            for (let i = 0; i < between.length; i++) {
                this.killedPiece = between[i];
            }
            return board;
        }
        allowTurnContinue() {
            return this.isJump(true) && !this.transforms(this.piece());
        }
        allowTurnEnd() {
            return !this.isJump() || this.transforms(this.piece());
        }
        /** @return {Action[]} */
        getActions() {
            let f1 = this.field1(), f2 = this.field2();
            let res = [new MoveAction(f1, f2, this.board[f1])];
            let between = this.fieldsBetween();
            for (let i = 0; i < between.length; i++) {
                if (this.board[between[i]] !== 0) {
                    res.push(new TakeAction(between[i], this.board[between[i]]));
                }
            }
            if (this.transforms(this.board[f1])) {
                res.push(new ChangeAction(f2, this.board[f1], this.board[f1] * 2));
            }
            return res;
        }
        /** @return {Action[]} */
        getInverseActions() {
            let actions = this.getActions();
            actions.forEach(a => [a.apply, a.undo] = [a.undo, a.apply]);
            return actions;
        }
        toString() {
            return `${this.row1}${this.col1}-${this.row2}${this.col2}`;
        }
        equals(move) {
            return this.row1 === move.row1 && this.col1 === move.col1
                && this.row2 === move.row2 && this.col2 === move.col2;
        }
        equalsCoords(r1, c1, r2, c2) {
            return this.row1 === r1 && this.col1 === c1 && this.row2 === r2 && this.col2 === c2;
        }
    }


    return new InternationalRules();
}