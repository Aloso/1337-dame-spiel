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

/**
 * @typedef {Move} DummyMove
 */

class Rules {
    constructor() {
        if (new.target === Rules) {
            throw new Error("instantiated abstract class Rules");
        }
    }

    boardSize() {} // unimplemented

    firstPlayer() {
        return 1;
    }

    getName() {} // unimplemented

    initBoard(/**Board*/ board) {
        let size = this.boardSize();
        let firstEmpty = size / 2 - 1;
        let secondEmpty = size / 2;
        for (let i = 0; i < firstEmpty; i++) {
            for (let j = 0; j < size; j++) {
                if ((i + j) % 2 === 1) board[i * size + j] = 1;
            }
        }
        for (let i = secondEmpty + 1; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if ((i + j) % 2 === 1) board[i * size + j] = -1;
            }
        }
        board[52] = 2;
        board[34] = -1;
        board[25] = 0;
        board[16] = 0;
        board[74] = 0;
        board[72] = 1;
        board[94] = 0;
    }

    /**
     * @param {int} player
     * @param {Board} board
     * @returns {DummyMove}
     */
    allowedTurns(player, board) {} // unimplemented

    applyMove(/**Move*/ move, /**Board*/ board, /**int*/ size, /**int[]*/ deleted) {
        move.board = board;
        move.boardSize = size;
        board = board.slice();

        let piecePos = move.f1;
        let piece = board[piecePos];
        let pieceRow = (piecePos / size) | 0;
        if (move.isTransform) {
            piece *= 2;
        }
        if (move.isJump) {
            let between = Rules.fieldsBetween((move.f1 / size) | 0, move.f1 % size, (move.f2 / size) | 0, move.f2 % size, size).filter(f => board[f] !== 0)[0];
            move.deletedPiece = between;
            deleted.push(between);
        }
        board[move.f2] = piece;
        board[move.f1] = 0;
        if (move.next.length === 0) {
            for (let i = 0; i < deleted.length; i++) {
                board[deleted[i]] = 0;
            }
            move.allDeletedPieces = deleted;
        }
        return board;
    }

    undoMove(/**Move*/ move) {
        //TODO
        return move.board;
    }

    getActions(move, deleted) {
        let size = move.boardSize;
        let piecePos = move.f1;
        let piece = move.board[piecePos];
        let pieceRow = (piecePos / size) | 0;

        let actions = [new MoveAction(move.f1, move.f2, piece)];
        if (pieceRow === 0 && piece < 0 || pieceRow === size - 1 && piece > 0) { // transformation
            actions.push(new ChangeAction(move.f2, piece, piece * 2));
        }
        if (move.next.length === 0) {
            for (let i = 0; i < deleted.length; i++) {
                actions.push(new TakeAction(deleted[i], move.board[deleted[i]]));
            }
        }
        return actions;
    }

    getWinner(/**Board*/ board) {}  // unimplemented

    isContinueAllowed(/**Move*/ lastMove) {
        return lastMove.next.length > 0;
    }

    isSkipAllowed(/**Move*/ lastMove) {
        return lastMove.next.length === 0;
    }

    isUndoAllowed(/**Move*/ lastMove) {
        return lastMove.parent != null;
    }

    gameHasEnded(/**Board*/ board) {
        let count1 = 0, count2 = 0;
        for (let i = 0; i < board.length; i++) {
            if (board[i] < 0) count1++;
            else if (board[i] > 0) count2++;
        }
        return count1 === 0 || count2 === 0;
    }

    surrender(/**Board*/ board) {
        return true;
    }


    static fieldsBetween(row1, col1, row2, col2, boardSize) {
        if (row2 == null) {
            row2 = (col1 / boardSize) | 0;
            col2 = col1 % boardSize;
            col1 = row1 % boardSize;
            row1 = (row1 / boardSize) | 0;
        }
        let res = [];
        let incR = (row2 - row1) > 0 ? 1 : -1;
        let incC = (col2 - col1) > 0 ? 1 : -1;
        for (let r = row1 + incR, c = col1 + incC; r !== row2; r += incR, c += incC) {
            res.push(r * boardSize + c);
        }
        return res;
    }
}

/**
 * @property {Move} [parent]
 * @property {int} [deletedPiece]
 * @property {int[]} [allDeletedPieces]
 * @property {Board} board
 * @property {int} boardSize
 */
class Move {
    constructor(/**int*/ f1, /**int*/ f2, /**boolean*/ isJump, /**boolean*/ isTransform) {
        this.f1 = f1;
        this.f2 = f2;
        this.isJump = isJump;
        this.isTransform = isTransform;
        /** @type {Move[]} */
        this.next = [];
    }
    depth() {
        this._dep = 0;
        for (let i = 0; i < this.next.length; i++) {
            this._dep = Math.max(this._dep, this.next[i].depth());
        }
        return this._dep += 1;
    }
    height() {
        if (this.parent) return 1 + this.parent.height();
        return 0;
    }
    eliminateShorterMoves() {
        let parentDepth = this.depth();

        this.next = this.next.filter(n => {
            if (n._dep /*buffered*/ === parentDepth - 1) {
                n.eliminateShorterMoves();
                return true;
            }
            return false;
        });
    }
    eliminateNonJumps() {
        this.next = this.next.filter(n => {
            if (n.isJump) {
                n.eliminateNonJumps();
                return true;
            }
            return false;
        });
    }
    doubleReferences() {
        for (let i = 0; i < this.next; i++) {
            this.next[i].parent = this;
            this.next[i].doubleReferences();
        }
    }
    isMove(f1, f2) {
        return this.f1 === f1 && this.f2 === f2;
    }

    hasChildMove(f1, f2) {
        for (let i = 0; i < this.next.length; i++) {
            if (this.next[i].isMove(f1, f2)) return true;
        }
        return false;
    }
    toString() {
        let a = this.f1 < 10 ? "0" + this.f1 : this.f1;
        let b = this.f2 < 10 ? "0" + this.f2 : this.f2;
        return a + "-" + b;
    }
    childrenToString() {
        return "[ " + this.next.map(n => n.toString()).join("  ") + " ]";
    }
}

/**
 * @augments {Move}
 */
class DummyMove {
    constructor() {
        this.next = [];
    }
    depth() {
        this._dep = 0;
        for (let i = 0; i < this.next.length; i++) {
            this._dep = Math.max(this._dep, this.next[i].depth());
        }
        return this._dep += 1;
    }
    height() {
        return 0;
    }
    eliminateShorterMoves() {
        let parentDepth = this.depth();

        this.next = this.next.filter(n => {
            if (n._dep /*buffered*/ === parentDepth - 1) {
                n.eliminateShorterMoves();
                return true;
            }
            return false;
        });
    }
    eliminateNonJumps() {
        this.next = this.next.filter(n => {
            if (n.isJump) {
                n.eliminateNonJumps();
                return true;
            }
            return false;
        });
    }
    doubleReferences() {
        for (let i = 0; i < this.next; i++) {
            this.next[i].doubleReferences();
        }
    }
    hasChildMove(f1, f2) {
        for (let i = 0; i < this.next.length; i++) {
            if (this.next[i].isMove(f1, f2)) return true;
        }
        return false;
    }
    toString() {
        return "DummyMove" + this.childrenToString();
    }
    childrenToString() {
        return "[ " + this.next.map(n => n.toString()).join("  ") + " ]";
    }
}



function getInternationalRules(model, size) {
    let winner = 0;
    let safetySwitch = 0;

    class InternationalRules extends Rules {
        constructor() {
            super();
        }

        boardSize() {
            return size
        }

        getName() {
            return "International Draughts"
        }

        /**
         * @param {int} player
         * @param {Board} board
         * @return {DummyMove}
         */
        allowedTurns(player, board) {
            safetySwitch = performance.now();
            return new InternationalTurn(board, player).moves;
        }

        getWinner(board) {
            return winner
        }

        isUndoAllowed(board) {
            return true
        }
    }

    class InternationalTurn {
        constructor(board, player) {
            this.board = board;
            this.player = player;
            this.moves = this.findLegalMoves();
        }
        findLegalMoves() {
            let dummy = new DummyMove();
            let removeStack = new HashStack();

            for (let i = 0; i < this.board.length; i++) {
                if (this.board[i] * this.player > 0) {
                    dummy.f2 = i;
                    this.findLegalFollowingMoves(this.board[i], dummy, removeStack, true);
                }
            }
            if (dummy.next.some(m => m.isJump)) {
                dummy.eliminateNonJumps();
            }
            dummy.eliminateShorterMoves();
            for (let i = 0; i < dummy.next.length; i++) {
                dummy.next[i].doubleReferences();
            }
            return dummy;
        }

        /**
         * @param {int} piece
         * @param {Move} before
         * @param {HashStack} dels
         * @param {boolean} allowWalk
         * @return {Move[]}
         */
        findLegalFollowingMoves(piece, before, dels, allowWalk) {
            let row = this.row(before.f2);
            let col = this.col(before.f2);
            let player = piece / Math.abs(piece);

            /** @type {Move[]} */
            let walkArr = [];
            /** @type {Move[]} */
            let jumpArr = [];

            if (piece * player === 2) {
                [[1, 1], [1, -1], [-1, 1], [-1, -1]]
                    .forEach(a => {
                        let jumped = false;
                        for (let r = row + a[0], c = col + a[1]; this.exists(r, c); r += a[0], c += a[1]) {
                            let p = this.board[r * size + c];
                            if (jumped !== false) {
                                if (p === 0) {
                                    jumpArr.push(new Move(row * size + col, r * size + c, true, this.isTransform(r, piece)));
                                } else {
                                    break;
                                }
                            } else {
                                let turn = new Move(row * size + col, r * size + c, false, this.isTransform(r, piece));
                                if (p === 0) {
                                    if (allowWalk) walkArr.push(turn);
                                } else if (p * player < 0) {
                                    if (dels.contains(turn.f2)) return;
                                    jumped = turn.f2;
                                }
                                else break;
                            }
                        }
                    });

            } else {
                jumpArr = [
                    [row + 2, col + 2],
                    [row + 2, col - 2],
                    [row - 2, col + 2],
                    [row - 2, col - 2]]
                    .reduce((arr, c) => {
                        if (!this.exists(c[0], c[1]) || this.piece(c[0], c[1]) !== 0) return arr;

                        let between = (row + c[0]) / 2 * size + (col + c[1]) / 2;

                        if (this.board[between] * player >= 0 || dels.contains(between)) return arr;
                        if (piece * player === 1 && !this.isForward(row, c[0], piece)) return arr;

                        arr.push(new Move(row * size + col, c[0] * size + c[1], true, this.isTransform(c[0], piece)));
                        return arr;
                    }, []);
                if (jumpArr.length === 0 && allowWalk) {
                    walkArr = [
                        [row + 1, col + 1],
                        [row + 1, col - 1],
                        [row - 1, col + 1],
                        [row - 1, col - 1]]
                        .reduce((arr, c) => {
                            if (!this.exists(c[0], c[1]) || this.piece(c[0], c[1]) !== 0) return arr;
                            if (!this.isForward(row, c[0], piece)) return arr;
                            arr.push(new Move(row * size + col, c[0] * size + c[1], false, this.isTransform(c[0], piece)));
                            return arr;
                        }, []);
                }
            }

            if (jumpArr.length === 0) {
                before.next = before.next.concat(walkArr);
            } else {
                jumpArr.forEach(t => {
                    let between = this.fieldsBetween(t.f1, t.f2);
                    dels.push(between.filter(f => this.board[f] !== 0)[0]);
                    this.findLegalFollowingMoves(piece, t, dels, false);
                    dels.pop();
                    before.next.push(t);
                });
            }
        }

        row(field) {
            return (field / size) | 0;
        }

        col(field) {
            return field % size;
        }

        piece(row, col) {
            return this.board[row * size + col];
        }

        exists(row, col) {
            return row >= 0 && col >= 0 && row < size && col < size;
        }

        isForward(row1, row2, piece) {
            return (row1 - row2) * piece < 0;
        }

        isTransform(row, piece) {
            return piece < 0 && row === 0 || piece > 0 && row === size - 1;
        }

        fieldsBetween(row1, col1, row2, col2) {
            if (row2 == null) {
                row2 = (col1 / size) | 0;
                col2 = col1 % size;
                col1 = row1 % size;
                row1 = (row1 / size) | 0;
            }
            let res = [];
            let incR = (row2 - row1) > 0 ? 1 : -1;
            let incC = (col2 - col1) > 0 ? 1 : -1;
            for (let r = row1 + incR, c = col1 + incC; r !== row2; r += incR, c += incC) {
                res.push(r * size + c);
            }
            return res;
        }
    }

    class HashStack {
        constructor() {
            this.stack = [];
            this.search = [];
        }
        push(v) {
            this.search[v] = this.stack.push(v);
        }
        pop() {
            let v = this.stack.pop();
            delete this.search[v];
            return v;
        }
        contains(v) {
            return this.search[v] != null;
        }
    }

    return new InternationalRules();
}