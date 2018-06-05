"use strict";



/** @return {Model} */
function getModel() {

    class BoardUtils {
        /**
         * @param {int} size
         * @return {Board}
         */
        static createBoard(size) {
            return new Array(size * size).fill(0);
        }
        static row(row) {
            return game.board.slice(row * size, (row + 1) * size);
        }
        static toString(bordered, numbers) {
            let tb = bordered ? new Array(size).fill("─").join("─")      : null;
            let tn = numbers  ? new Array(size).fill(0).map((_, i) => i) : null;
            let arr = [];
            for (let i = 0; i < size; i++) {
                arr[i] = this.row(i).map((v, j) => {
                    switch (v) {
                        case  0: return (i + j) % 2 === 1 ? "·" : " ";
                        case  1: return "w";
                        case  2: return "W";
                        case -1: return "b";
                        case -2: return "B";
                    }
                }).join(" ");
            }
            if (numbers) {
                if (bordered) {
                    return `    ${tn.join(" ")}\n  ┌─${tb}─┐\n${arr.map((v, i) => {
                        let x = i < 10 ? " " + i : i;
                        return x + "│ " + v + " │" + i
                    }).join("\n")}\n  └─${tb}─┘\n    ${tn.join(" ")}`;
                } else {
                    return "   " + tn.join(" ") + "\n" + arr.map((v, i) => {
                        let x = i < 10 ? " " + i : i;
                        return x + " " + v + " " + i;
                    }).join("\n") + "\n   " + tn.join(" ");
                }
            } else {
                if (bordered) {
                    return `┌─${tb}─┐\n│ ${arr.join(" │\n│ ")} │\n└─${tb}─┘`;
                } else {
                    return arr.join("\n");
                }
            }
        }
        static toHTML() {
            let arr = [];
            for (let i = 0; i < size; i++) {
                arr[i] = this.row(i).map(v => {
                    switch (v) {
                        case 0: return "&nbsp;";
                        case 1: return "<span class='man1'></span>";
                        case 2: return "<span class='king1'></span>";
                        case -1: return "<span class='man2'></span>";
                        case -2: return "<span class='king2'></span>";
                    }
                }).map((v, j) => `<td tabindex="0"><span class="posHint">${i} ${j}</span>${v}</td>`);
                arr[i] = `<tr>${arr[i].join("")}</tr>`;
            }
            return `<table class="board">${arr.join("")}</table>`;
        }
    }

    class Player {
        constructor(name, color, factor) {
            this.name = name;
            this.color = color;
            this.factor = factor;
        }
    }

    /**
     * @property {Player} player1
     * @property {Player} player2
     * @property {Object.<int, Player>} player
     * @property {Player} currentPlayer
     * @property {Board} board
     * @property {Move} lastMove
     * @property {int[]} deleted
     * @property {Move[]} history
     * @property {boolean} started
     * @constructor
     */
    class Game {
        constructor(/**Player*/ player1, /**Player*/ player2) {
            this.player1 = player1;
            this.player2 = player2;
            this.player = {
                get [-1]() {return this.player2},
                get [ 1]() {return this.player1}
            };

            this.currentPlayer = player1;
            this.board = [];
            this.lastMove = null;
            this.deleted = [];
            this.history = [];

            this.started = false;
        }
        start() {
            this.currentPlayer = this.player1;
            this.board = BoardUtils.createBoard(size);
            rules.initBoard(this.board);

            this.history = [];

            this.deleted = [];
            this.started = true;
        }
        end() {
            this.started = false;
        }

        nextTurn() {
            this.lastMove = rules.allowedTurns(this.currentPlayer.factor, this.board);
            this.deleted = [];
        }
        endTurn() {
            this.currentPlayer = (this.currentPlayer === this.player1) ? this.player2 : this.player1;
            this.history.push(this.lastMove);
        }
        undoTurn() {
            if (this.history.length > 0) {
                this.currentPlayer = (this.currentPlayer === this.player1) ? this.player2 : this.player1;
                this.lastMove = this.history.pop();
            }
        }

        pushMove(index) {
            if (this.lastMove.next[index]) {
                this.lastMove = this.lastMove.next[index];
                this.board = rules.applyMove(this.lastMove, this.board, size, this.deleted);
                return true;
            } else {
                return false;
            }
        }
        popMove() {
            if (this.lastMove.parent) {
                this.lastMove = this.lastMove.parent;
                this.board = rules.undoMove(this.lastMove);
                return true;
            } else {
                return false;
            }
        }


        get moveNr() {return this.lastMove.height()}
        get roundNr() {return this.history.length}
    }

    class Views {
        constructor(/**View[]*/ views) {
            /**
             * @typedef {function(function(): void): void} DeferFn
             */

            /**
             * @typedef {function(*): void} ListenFn
             * @property {DeferFn} deferFn - can defer events
             * @property {View} view - used to remove all events with a specific view
             */

            /**
             * @typedef {{
             *      [before]: function(): void,
             *      [after]: function(): void
             * }} EventOptions
             */

            /** @type {Object.<string, ListenFn[]>} */
            this.listeners = {
                set_rules: [],
                start: [],
                next_player: [],
                next_move: [],
                move: [],
                surrender: [],
                draw: [],
                win: [],
                undo: [],
                error: []
            };
            this.aborted = false;
        }
        addListener(/**string*/ type, /**ListenFn*/ callback, /**View*/ view, /**DeferFn*/ deferFn) {
            if (!this.listeners[type]) {
                throw new Error("Event type is not supported: " + type);
            }
            let pos = this.listeners[type].findIndex(v => v === callback);
            if (pos !== -1) {
                throw new Error("Event has already been added");
            }
            this.listeners[type].push(callback);
            callback.deferFn = deferFn;
            callback.view = view;
        }
        removeListener(/**string*/ type, /**ListenFn*/ callback) {
            if (!this.listeners[type]) {
                throw new Error("Event type is not supported");
            }
            let pos = this.listeners[type].findIndex(v => v === callback);
            if (pos === -1) {
                throw new Error("Can't remove event, event doesn't exist");
            }
            this.listeners[type].splice(pos, 1);
        }
        removeView(/**View*/ view) {
            for (let l in this.listeners) if (this.listeners.hasOwnProperty(l)) {
                this.listeners[l] = this.listeners[l].filter((/**ListenFn*/ l) => l.view !== view);
            }
        }

        sendWithoutDelay(type, data, /**EventOptions*/ options) {
            if (!options) options = {};
            if (options.before) options.before();
            this.listeners[type].forEach(f => f.call(model, data));
            if (options.after) options.after();
        }
        sendEvent(/**string*/ type, /** * */ data, /**EventOptions?*/ options) {
            if (this.listeners[type] == null) {
                throw new Error("This event doesn't exist: " + type);
            }
            this.aborted = false;

            let loopRunning = true;
            let that = this;
            loop();

            function deferCallback() {
                if (!loopRunning) {
                    loopRunning = true;
                    loop();
                }
            }
            function loop() {
                if (that.aborted) return;

                let listeners = that.listeners[type];
                for (let i = 0; i < listeners.length; i++) {
                    if (listeners[i].deferFn) {
                        if (!listeners[i].deferFn(deferCallback)) {
                            loopRunning = false;
                            return;
                        }
                    }
                }
                that.sendWithoutDelay(type, data, options);
            }
        }
        abortLast() {
            this.aborted = true;
        }

    }

    function apply() {
        //TODO
    }
    function undo() {
        //TODO
    }

    /** @type Rules */
    let rules;
    let size;
    let game = new Game(new Player("White", 0xffffff, 1), new Player("Black", 0x000000, -1));
    let views = new Views([]);

    class Model {
        constructor() {}
        start() {
            if (game.started) throw new Error("Can't start, game is in progress");
            if (rules == null) throw new Error("Can't start game before controller is specified");
            size = rules.boardSize();

            game.start();
            if (rules.firstPlayer() === -1) game.currentPlayer = game.player2;
            views.sendEvent("start", {rules: rules.getName(), size: size});

            game.nextTurn();
            views.sendEvent("next_player", {player: game.currentPlayer, move: 0});
            views.sendEvent("next_move",   {player: game.currentPlayer, move: game.moveNr});
        }
        surrender(/**Player*/ player) {
            if (!game.started) throw new Error("Can't surrender, game hasn't started yet");
            if (rules.surrender(game.board)) {
                game.end();
                views.sendEvent("surrender", player);
            }
        }
        setRules(/**Rules*/ ruleObject) {
            if (game.started) throw new Error("Can't change rules while game is in progress");
            if (ruleObject == null) throw new Error("Invalid rules object: " + ruleObject);

            rules = ruleObject;
            views.sendEvent("set_rules", ruleObject.getName());
        }

        on(/**string*/ type, /**View*/ view, /**ListenFn*/ callback, /**DeferFn*/ defer) {
            return views.addListener(type, callback, view, defer);
        }
        off(/**string*/ type, /**ListenFn*/ callback) {
            return views.removeListener(type, callback);
        }
        removeView(view) {return views.removeView(view)}

        boardToString(border, numbers) {
            return BoardUtils.toString(border, numbers);
        }
        boardToHTML() {
            return BoardUtils.toHTML();
        }
        move(row1, col1, row2, col2) {
            if (!game.started) throw new Error("Can't move, game hasn't started yet");

            try {
                let moveId = unsafe.getMoveId(row1, col1, row2, col2);
                game.pushMove(moveId);
                let actions = rules.getActions(game.lastMove, game.deleted);
                views.sendEvent("move", actions);

                if (model.endTurnAllowed()) {
                    model.endTurn();
                } else {
                    model.continueTurn();
                }
            } catch (err) {
                return err.message;
            }
        }
        continueTurn() {
            if (!game.started) throw new Error("Can't continue, game hasn't started yet");
            if (!model.continueTurnAllowed()) {
                throw new Error("You are not allowed to continue");
            }
            views.sendEvent("next_move", {player: game.currentPlayer, move: game.moveNr});
        }
        continueTurnAllowed() {
            return rules.isContinueAllowed(game.lastMove);
        }
        endTurn() {
            if (!game.started) throw new Error("Can't end move, game hasn't started yet");
            if (!model.endTurnAllowed()) {
                throw new Error("You aren't allowed to to end your turn just yet!");
            }
            if (!rules.gameHasEnded(game.board)) {
                game.endTurn();
                game.nextTurn();
                views.sendEvent("next_player", {player: game.currentPlayer, move: 0});
                views.sendEvent("next_move", {player: game.currentPlayer, move: game.moveNr});
            } else {
                let winner = rules.getWinner(game.board);
                if (winner === 0) {
                    views.sendEvent("draw", null);
                } else {
                    views.sendEvent("win", game.player[winner]);
                }
            }
        }
        endTurnAllowed() {
            return rules.isSkipAllowed(game.lastMove);
        }
        undo() {
            if (!game.started) throw new Error("Can't undo, game hasn't started yet");
            if (game.history.length === 0) return false;
            if (!rules.isUndoAllowed(game.lastMove)) return false;

            let p = this.currentPlayer;
            let [move, boardBefore] = unsafe.undoMove();
            views.sendEvent("undo", move.getInverseActions());
            if (p !== this.currentPlayer) {
                views.sendEvent("next_player", {player: game.currentPlayer, move: game.moveNr});
            }
            views.sendEvent("next_move", {player: game.currentPlayer, move: game.moveNr});
            return true;
        }
        error(handled, category, text, code) {
            views.error(handled, category, text, code);
        }


        get started()           {return game.started}
        get boardSize()         {return size}
        get boardCopy()         {return game.board.slice()}
        get rounds()            {return Math.floor(game.history.length / 2)}
        get turns()             {return game.history.length}
        get movesInARow()       {return game.lastMove.height()}
        get lastMove()          {return game.lastMove}
        get player1()           {return game.player1}
        get player2()           {return game.player2}
        get player()            {return game.player}
        get currentPlayer()     {return game.currentPlayer}
        get currentPlayerId()   {return game.currentPlayer.factor}
        /** @return {Move} */
        get allowedTurns()      {return game.lastMove}

        /** @return {Unsafe} */
        get unsafe() {return unsafe}
    }

    // noinspection JSValidateTypes
    /**
     * @class Unsafe
     * @type Unsafe
     */
    const unsafe = {
        getMoveId: function (row1, col1, row2, col2) {
            let f1 = row1 * size + col1;
            let f2 = row2 * size + col2;
            for (let i = 0, a = game.lastMove.next; i < a.length; i++) {
                if (a[i].isMove(f1, f2)) return i;
            }
            throw new Error("Move isn't allowed");
        },
        get board() {
            return game.board;
        }
    };

    const model = new Model();
    return model;
}