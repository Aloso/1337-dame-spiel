"use strict";

class View {
    constructor() {
        if (new.target === View) {
            throw new Error("Class View is abstract and can't be instantiated");
        }
    }
}

/**
 * @param {Model} model
 * @return {HTMLView}
 */
function getHTMLView(model) {

    let ready = true;
    let readyQueue = [];

    function setBusy() {ready = false}
    function setReady() {
        ready = true;
        while (readyQueue.length > 0) {
            readyQueue[0]();
            readyQueue.shift();
            if (!ready) break;
        }
    }
    function defer(c) {
        if (ready) {
            return true;
        } else {
            readyQueue.push(c);
            return false;
        }
    }

    function getRowColumn(field) {
        let size = model.boardSize;
        let row = (field / size) | 0;
        return [row, field % size];
    }

    const $ = o => document.getElementById(o);
    let _r = 0, _c = 0;
    function color(r, c, color) {
        _r = r;
        _c = c;
        console.log(r, c, color);
        $("board").children[0].children[0].children[r].children[c].backgroundColor = color + " !important";
    }
    function unColor() {
        for (let i = 0; i < model.boardSize; i++) {
            for (let j = 0; j < model.boardSize; j++) {
                $("board").children[0].children[0].children[i].children[j].style.backgroundColor = "";
            }
        }
    }

    function getField(eventTarget) {
        let target = eventTarget;
        while (target.nodeName !== "TD" && target.parentNode) {
            target = target.parentNode;
        }
        if (target.nodeName !== "TD") return -1;
        let tr = target.parentNode;
        let col = -1;
        for (let c = 0; c < tr.children.length; c++) {
            if (tr.children[c] === target) {
                col = c;
                break;
            }
        }
        let tbl = tr.parentNode;
        let row = -1;
        for (let r = 0; r < tbl.children.length; r++) {
            if (tbl.children[r] === tr) {
                row = r;
                break;
            }
        }
        if (col === -1 || row === -1) return -1;
        return row * tbl.children.length + col;
    }

    function abortMove() {
        let b = document.getElementById("board");
        b.onmousedown = b.onclick = null;
        let c = document.getElementById("cancel");
        c.innerHTML = "";
    }

    function getFieldClickOptional(after, cancel) {
        let b = document.getElementById("board");
        b.onmousedown = function (e) {
            let field = getField(e.target);
            if (field >= 0) {
                b.onmousedown = null;
                c.innerHTML = "";
                after(field);
            }
        };
        let c = document.getElementById("cancel");
        c.innerHTML = "<button id='cancelAction'>Next player</button>";
        c.children[0].onclick = function () {
            c.innerHTML = "";
            b.onmousedown = null;
            cancel();
        };
    }

    function produceValue(producers, callback, fail) {
        let loop = i => {
            if (producers[i] == null) fail();
            producers[i](f => {
                if (f != null) callback(f);
                else loop(i + 1);
            }, fail);
        };
        loop(0);
    }

    function log(s, id) {
        let n = document.createElement("div");
        n.innerHTML = s;
        console.log(n.textContent);
        $(id ? id : "info").innerHTML = s;
    }

    function colorStartFields(/**Move*/ moves) {
        let startPositions = [];
        let startPosMap = [];
        for (let i = 0; i < moves.next.length; i++) {
            if (!startPosMap[moves.next[i].f1]) startPositions.push(moves.next[i].f1);
        }
        if (startPositions.length > 0) {
            for (let i = 0; i < startPositions.length; i++) {
                let pos = startPositions[i];
                color((pos / model.boardSize) | 0, pos % model.boardSize, "#00aa00");
            }
        } else {
            let pos = startPositions[0];
            color((pos / model.boardSize) | 0, pos % model.boardSize, "#aa0000");
        }
    }

    let curRound = -1;

    class HTMLView extends View {
        constructor() {
            super();

            $("undo").innerHTML = "<button>Undo</button>";
            $("undo").children[0].onclick = function() {
                if (!model.undo()) {
                    log("<span style='red'>Undo is not allowed right now.</span>");
                }
            };
            $("undo").children[0].style.display = "none";

            model.on("set_rules", this, ruleName => {
                console.log("Rules are now " + ruleName);
            }, defer);

            model.on("start", this, data => {
                log(`<span style="color: red">Game has started.</span><space></space>    Rules: <b>${data.rules}</b><space></space>    size: <b>${data.size} × ${data.size}</b>`, "infoPlayer");
            }, defer);

            model.on("next_player", this, data => {
                if (model.rounds !== curRound) {
                    curRound = model.rounds;
                    console.log("──────────────────────────────────── ROUND " + (curRound + 1)
                        + " ────────────────────────────────────");
                }
                log(`${data.player.name}, it's your turn!`, "infoPlayer");
            }, defer);

            model.on("next_move", this, data => {
                $("board").innerHTML = model.boardToHTML();

                let cancel = function cancel() {
                    try {
                        model.endTurn();
                        $("info").innerHTML = "";
                    } catch (e) {
                        console.warn($("info").innerHTML = e.message);
                        loop();
                        throw e;
                    }
                };

                let moves = model.allowedTurns;
                console.log(moves);
                colorStartFields(moves);

                let loop = () => produceValue([
                    data.move > 0 ? c => c(model.lastMove.field2()) : c => c(null),
                    getFieldClickOptional
                ], f1 => {
                    let [r1, c1] = getRowColumn(f1);
                    $("info").innerHTML = `MOVE: (${r1}, ${c1}) ––>`;
                    colorStartFields(moves);

                    getFieldClickOptional(f2 => {
                        unColor();
                        //TODO simplify
                        let [r2, c2] = getRowColumn(f2);
                        if (moves.hasChildMove(r1 * model.boardSize + c1, r2 * model.boardSize + c2)) {
                            console.log($("info").innerHTML = `MOVE: ${r1}${c1}-${r2}${c2}`);
                            let err = model.move(r1, c1, r2, c2);
                            if (err) {
                                console.log($("info").innerHTML = err);
                                loop();
                            } else {
                                $("undo").children[0].style.display = "inline-block";
                            }
                        } else {
                            let err = "This move isn't allowed!";
                            console.warn($("info").innerHTML = err);
                            loop();
                        }
                    }, cancel)
                }, cancel);
                loop();
            }, defer);

            model.on("move", this, () => {
                setBusy();
                setTimeout(setReady, 300);
            }, defer);

            model.on("error", this, data => {
                let d = new Date();
                let m = d.getMilliseconds() + "";
                m = "000".substr(m.length) + m;
                let s = data.handled ? "" : "FATAL ";
                console.warn(`[${d.toLocaleTimeString()}:${m}] ${s}${data.category} error: ${data.text} (${data.code})`);
            }, defer);

            model.on("undo", this, () => {
                $("board").innerHTML = model.boardToHTML();
                log("UNDO");
                abortMove();
                if (model.turns === 0) {
                    $("undo").children[0].style.display = "none";
                }
            }, defer);

            model.on("win", this, p => {
                console.log("Player " + p.name + " wins");
            }, defer);
            model.on("draw", this, p => {
                console.log("It's a draw!");
            }, defer);
        }


        applyMove(field1, field2, piece) {
            console.log(`ANIMATION: move from ${field1} to ${field2}`);
        }
        applyTake(field) {
            //TODO
        }
        applyPut(field, piece) {
            //TODO
        }
        applyChange(field, piece1, piece2) {
            //TODO
        }
    }

    return new HTMLView();
}