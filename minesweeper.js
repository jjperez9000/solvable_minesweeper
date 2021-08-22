let components = {
    NUM_ROWS : 5,
    NUM_COLS : 5,
    NUM_BOMBS : 5,
    colors : {0: 'grey', 1: 'blue', 2: 'green', 3: 'red', 4: 'purple', 5: 'maroon', 6: 'turquoise', 7: 'black', 8: 'orange'}
}

//solver information
let firstClick = true;
let edge = new Set();
let usedLocations = new Set();
let nbrs = [];
let tilesNear = [];
let flagsNear = [];

//game information
let NUM_CELLS = (components.NUM_ROWS * components.NUM_COLS);
let numFlags = 0;
let tilesClicked = 0;
let user_board = [];
let user_clicked = [];
let user_flagged = [];

/**
 * takes in a 2d location and returns a 1d location
 */
function getPos(y, x) {
    return y*components.NUM_COLS + x;
}

//takes in an x and y location and returns if it fits in the bounds of the board
/**
 * checks if a coordinate position exists on the board
 */
function check_valid(y, x) {
    return x >= 0 && y >= 0 && x < components.NUM_COLS && y < components.NUM_ROWS;
}

/**
 * draws the board on the page
 */
function drawBoard(boardName, real) {
    const container = document.getElementById(boardName);
    let s = '';

    for (let i = 0; i < components.NUM_ROWS; i++) {
        s += '<div class="row">'
        for (let j = 0; j < components.NUM_COLS; j++) {
            // s += `<div class="cell" id=${(getPos(i, j)).toString()}></div>`;
            //line below is for debugging. Prints tiles with their id's visible
            if (real)
                // s += `<div class="cell" id=${(getPos(i, j)).toString()}> ${(getPos(i, j)).toString()} </div>`;
                s += `<div class="cell" id=${(getPos(i, j)).toString()}>  </div>`;
            else
                // s += `<div class="fakeCell" id="${(getPos(i, j)).toString()}f"> ${(getPos(i, j)).toString()} </div>`;
                s += `<div class="fakeCell" id="${(getPos(i, j)).toString()}f">  </div>`;

        }
        s += '</div>'
    }

    container.innerHTML = s;
}

/**
 * function to set up the nbrs variable.
 * nbrs is used as an easy way to check the tiles that surround a given tile
 */
function neighborlySetup() {
    for (let k=0; k<NUM_CELLS; k++) {
        let x = k % components.NUM_COLS;
        let y = Math.floor(k / components.NUM_COLS);
        nbrs[k] = new Array(8);

        for (let i = -1, itr = 0; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (check_valid(y + i, x + j) && (i || j)) {
                    nbrs[k][itr] = getPos(y+i, x+j);
                    itr++;
                }
            }
        }
    }
}

function printBoard(board, clicked, flags) {
    let temp;
    let hack = 0;
    for (let i=0; i<=NUM_CELLS; i++) {
        if (i % components.NUM_COLS === 0) {
            if (temp !== undefined)
                console.log(temp);
            temp = hack.toString() + ": ";
            hack++;
            hack %= 10;
        }

        if (clicked[i]) {
            temp += board[i].toString() + " ";
        } else if (flags[i]) {
            temp += "F ";
        } else if (board[i] === -1) {
            temp += "B ";
        } else {
            temp += "- ";
        }
    }
}


/**
 * randomly distributes bombs throughout the board
 * also takes in a value representing where the first click is and doesn't put a bomb there
 * or in any of the tiles directly surrounding it.
 * @param firstClickLoc position of the first click made by the player
 * @returns a valid board
 */
function placeBombs(firstClickLoc) {
    //hash all of the locations where a bomb is not allowed to spawn
    let safeZone = new Set();
    safeZone.add(parseInt(firstClickLoc));
    nbrs[firstClickLoc].forEach(n => {
        safeZone.add(n);
    })

    let board = [];
    let placedBombs = 0;
    for (let i=0;i<NUM_CELLS; i++) board[i] = 0;
    while (placedBombs < components.NUM_BOMBS) {
        let position = Math.floor(Math.random() * (NUM_CELLS));

        if (board[position] !== -1 && !safeZone.has(position)) {
            board[position] = -1;
            placedBombs++;

            nbrs[position].forEach(n => {
                if (board[n] !== -1) {
                    board[n]++;
                }
            })
        }
    }
    return board;
}

/**
 * function that allows the solver ai to place a flag
 * @param tile being flagged and all board info
 * @returns flagged variable but updated with the new flag
 */
function ai_flag(board, clicked, flagged, tile) {

    flagged[tile] = 1;
    numFlags++;
    nbrs[tile].forEach(n => {
        flagsNear[n]++;
    });

    return flagged
}

/**
 * function that allows the solver ai to click a tile
 * @param tile being clicked and all board info
 * @returns clicked variable but updated with the newly clicked tile
 */
function ai_click(board, clicked, flagged, tile) {

    clicked[tile] = 1;
    tilesClicked++;

    nbrs[tile].forEach(n => {
        tilesNear[n]--;
        if (tilesNear[n] === flagsNear[n] && edge.has(n)) {
            edge.delete(n);
        }
    })
    if (tilesNear[tile] > flagsNear[tile]) {
        edge.add(tile);
    }

    return clicked

}

/**
 * finds which tiles can obviously be flagged on a given board
 * @param board said given board
 * @param clicked all currently clicked tiles
 * @param flags all currently flagged tiles
 * @returns [flagged, better] flags that were placed | if flags were placed
 */
function flagEasy(board, clicked, flags) {
    //this guy tells us if any progress was made after this function runs
    let better = false;

    //loop through edge
    //if a tile has the same number of unclicked tiles it does bombs near, flag all surrounding tiles
    edge.forEach(tile => {
        if (tilesNear[tile] === board[tile]) {
            nbrs[tile].forEach(n => {
                if (!clicked[n] && !flags[n]) {

                    flags = ai_flag(board, clicked, flags, n);

                    better = true;

                }
                // if (flagsNear[tile] === tilesNear[tile]) {
                //     // edge.delete(tile);
                //
                // }
            })
        }
    });
    return [flags, better];
}

/**
 * finds which tiles can obviously be clicked on a given board
 * @param board said given board
 * @param clicked all currently clicked tiles
 * @param flags all currently flagged tiles
 * @returns [clicked, better] tiles that were clicked | if tiles were clicked
 */
function clickEasy(board, clicked, flags) {
    let better = false;

    //if a tile has the same number of flags as it does bombs, then click all other surrounding tiles
    edge.forEach(tile => {
        if (board[tile] === flagsNear[tile]) {
            nbrs[tile].forEach(n => {
                if (!clicked[n] && !flags[n]) {

                    clicked = ai_click(board, clicked, flags, n);

                    // if (flagsNear[tile] === tilesNear[tile]) {
                    //     // edge.delete(tile);
                    // }

                    // nbrs[tile].forEach(n => {
                    //     if (tilesNear[n] === flagsNear[n]) {
                    //         // edge.delete(n);
                    //     }
                    // });

                    better = true;
                }
            })
        }
    });

    return [clicked, better];
}

/**
 * finds all tiles that can be flagged on a given board that aren't obvious
 * @param board said given board
 * @param clicked all currently clicked tiles
 * @param flags all currently flagged tiles
 * @returns [flagged, better] flags that were placed | if flags were placed
 */
function flagHard(board, clicked, flags) {
    /*concept
    * go through all edge tiles and check to see if their adjacent tiles are linked*
    * if the same number of unlinked tiles exist as there do bombs - 1 around a tile, then we can flag all nonlinked tiles
    *
    * *tiles are linked if they share a bomb
    */
    let better = false;
    //variables to save the tiles we link
    //linked denotes if a tile is linked, and linkedWith denotes which tiles said tile is linked with
    let linked = [];
    let linkedWith = [];
    for (let i=0; i<NUM_CELLS; i++) {
        linked[i] = false;
    }
    //check if each tile contains a link, and if it does then link it
    edge.forEach(tile => {
        //if number of flags near a tile is 1 less than number of bombs near a tile then it is a linked tile
        if (board[tile] - flagsNear[tile] === 1 && tilesNear[tile] - flagsNear[tile] > 1) {
            let temp = [];

            //store a group of linked tiles in a temp variable
            nbrs[tile].forEach(n => {
                if (!clicked[n] && !flags[n]) {
                    temp.push(n);
                }
            });
            //tell that tile's neighbors that they are all linked with it
            nbrs[tile].forEach(n => {
                if (!clicked[n] && !flags[n]) {
                    linkedWith[n] = new Array(temp.length);
                    linkedWith[n] = temp;
                    linked[n] = true;
                }
            });
        }
    })

    //go back through and check if the links result in a flag being placed
    edge.forEach(tile => {
        //if the tile has more than 1 unflagged bomb nearby
        if (board[tile] !== 1 && board[tile] - flagsNear[tile] > 1) {
            let tmpNbrs = new Set();

            //save the unflagged and unclicked neighbors
            nbrs[tile].forEach(n => {
                if (!clicked[n] && !flags[n]) {
                    tmpNbrs.add(n);
                }
            })

            //check all neighbors to see if they are linked
            tmpNbrs.forEach(n => {
                if (linked[n]) {
                    let linkedTilesAdjacentToThis = new Set();
                    let numLinked = 0;
                    //find all tiles that the current neighbor is linked with
                    //we save the tiles that it is linked with along with the number of tiles it is linked to
                    linkedWith[n].forEach(n2 => {
                        if (tmpNbrs.has(n2)) {
                            numLinked++;
                            linkedTilesAdjacentToThis.add(n2);
                        }
                    })
                    //we know that there are at least 2 linked tiles adjacent to the tile we're looking at
                    if (numLinked > 1) {
                        //if the same number of unlinked tiles exist as there do bombs - 1 then flag all non-linked tiles
                        if (tilesNear[tile] - flagsNear[tile] - (numLinked - 1) === board[tile] - flagsNear[tile]) {
                            tmpNbrs.forEach(n2 => {
                                if (!linkedTilesAdjacentToThis.has(n2) && !flags[n2]) {
                                    better = true;
                                    //flag our guy
                                    flags = ai_flag(board, clicked, flags, n2)

                                    //update edge
                                    // nbrs[n2].forEach(n3 => {
                                    //     if (flagsNear[n3] === tilesNear[n3]) {
                                    //         // edge.delete(n3);
                                    //     }
                                    // })
                                }
                            })
                        }
                    }
                }
            })
        }
    })
    return [flags, better];
}

/**
 * finds all tiles that can be clicked on a given board that aren't obvious
 * @param board said given board
 * @param clicked all currently clicked tiles
 * @param flags all currently flagged tiles
 * @returns [clicked, better] tiles that were clicked | if tiles were clicked
 */
function clickHard(board, clicked, flags) {
    /*concept
    * if (a tile meets these conditions)
    *   given 2 clicked tiles A, surrounded by set N tiles, and B, surrounded by set M tiles,
    *   if A and B have the same number of unflagged bombs and set M contains set N
    * then
    *   click all tiles in m && !n
    */
    let better = false;

    //for each tile A (this is going to be every edge tile)
    edge.forEach(a => {
        let n = new Set();

        //create set N
        nbrs[a].forEach(temp_n => {
            if (!clicked[temp_n] && !flags[temp_n]) {
                n.add(temp_n);
            }
        })

        //unfortunately we can't use the neighbors concept since we need to scan a 5x5 area to cover every possible case :(
        //check for a potential tile B (A & B have same number of bombs)
        let x = a % components.NUM_COLS;
        let y = Math.floor(a / components.NUM_COLS);
        for (let i=-2; i<=2; i++) {
            for (let j=-2; j<=2; j++) {
                if (check_valid(y + i, x + j) && (i || j)) {
                    let b = getPos(y+i, x+j);
                    if (clicked[b] && board[b] - flagsNear[b] === board[a] - flagsNear[a]) {

                        //create set M
                        let m = new Set()
                        nbrs[b].forEach(temp_m => {
                            if (!clicked[temp_m] && !flags[temp_m]) {
                                m.add(temp_m);
                            }
                        })

                        //check if M contains N
                        let n_is_in_m = true;
                        n.forEach(temp_n => {
                            if (!m.has(temp_n)) {
                                n_is_in_m = false;
                            }
                        });

                        //click the points in M && !N
                        if (n_is_in_m) {
                            m.forEach(temp_m => {
                                if (!n.has(temp_m)) {
                                    better = true;

                                    ai_click(board, clicked, flags, temp_m);

                                    // if (flagsNear[temp_m] === tilesNear[temp_m]) {
                                    //     // edge.delete(temp_m);
                                    // }

                                    // nbrs[temp_m].forEach(n2 => {
                                    //     if (tilesNear[n2] === flagsNear[n2]) {
                                    //         // edge.delete(n2);
                                    //     }
                                    // });
                                }
                            })
                        }
                    }
                }
            }
        }
    })
    return [clicked, better];
}

/**
 * removes a bomb from a given location on a board
 * @returns board the new board
 */
function extractBomb(board, clicked, flags, bomb) {
    board[bomb] = 0;
    tilesNear[bomb] = 8;
    flagsNear[bomb] = 0;

    nbrs[bomb].forEach(n => {
        if (board[n] === -1) {
            board[bomb]++;
        } else if (board[n] !== -1) {
            board[n]--;
        }
        if (flags[n]) {
            flagsNear[bomb]++;
        }
        if (clicked[n]) {
            tilesNear[bomb]--;
        }
    })

    components.NUM_BOMBS--;
    return board;
}

/**
 * places a bomb from a given location on a board
 * @returns board the new board
 */
function placeBomb(board, bomb) {
    board[bomb] = -1;
    nbrs[bomb].forEach(n => {
        if (board[n] !== -1) {
            board[n]++;
        }
    })
    components.NUM_BOMBS++;
    return board;
}

/**
 * re-finds the edge of a board
 */
function fixEdge(clicked, flagged) {
    //clean the edge, since sometimes things get messed up
    edge.clear();
    for (let i=0; i<NUM_CELLS; i++) {
        if (clicked[i]) {
            nbrs[i].forEach(n => {
                if (!clicked[n] && !flagged[n] && !edge.has(i)) {
                    edge.add(i);
                }
            })
        }
    }
}

/**
 * moves a random bomb along the edge to a non-bomb tile that isn't along the edge
 * @returns [better, board] if there was improvement | new and improved board
 */
function moveBomb(board, clicked, flagged) {

    //find all candidate bombs and put them in an array together
    let candidateBombsToMove = [];
    edge.forEach(tile => {
        nbrs[tile].forEach(n => {
            if (board[n] === -1 && !flagged[n]) {
                candidateBombsToMove.push(n);
            }
        })
    })

    //no bombs available to move
    if (candidateBombsToMove.length === 0) {
        return [false, board]
    }

    let unclickedSafeTiles = [];
    for (let i=0; i<NUM_CELLS; i++) {
        if (!clicked[i] && board[i] !== -1) {
            unclickedSafeTiles.push(i);
        }
    }
    //randomly select and remove a bomb from our candidates list
    let bombBeingMoved = candidateBombsToMove[Math.floor(Math.random() * (candidateBombsToMove.length))];
    let spotBeingMovedTo
    spotBeingMovedTo = unclickedSafeTiles[Math.floor(Math.random() * (unclickedSafeTiles.length))];

    usedLocations.add(spotBeingMovedTo);

    let validLocationsExist = false
    unclickedSafeTiles.forEach(tile => {
        if (!usedLocations.has(tile)) {
            validLocationsExist = true;
        }
    })

    if (!validLocationsExist) {
        return [false, board];
    }
    board = extractBomb(board, clicked, flagged, bombBeingMoved);
    board = placeBomb(board, spotBeingMovedTo);

    return [true, board];
}

/**
 * regenerates the game board (also used to generate the first game board)
 * @param firstClick location of first click
 */
function regenBoard(firstClick) {
    let board = placeBombs(firstClick);

    let clicked = [];
    let flagged = [];
    clicked[firstClick] = 1;
    tilesClicked = 0;
    numFlags = 0;
    tilesNear = [];
    flagsNear = [];

    tilesClicked++;

    edge.clear();
    edge.add(firstClick);
    usedLocations.clear();

    for (let i=0; i<NUM_CELLS; i++) {
        //fill out the number of unclicked tiles near each tile
        flagged[i] = 0;
        if (clicked[i] !== 1) clicked[i] = 0;
        tilesNear[i] = 0;
        flagsNear[i] = 0;
        nbrs[i].forEach(n => {
            if (!clicked[n]) {
                tilesNear[i]++;
            }
        })
    }
    return [clicked, board, flagged];
}

/**
 * function to generate a board that can be solved based on the first click a player makes
 * @param firstClick loctaion of first click
 * @returns board solvable board
 */
function solve(firstClick) {
    console.log("generating board");

    //first generate board
    let result = regenBoard(firstClick)
    let clicked = result[0];
    let board = result[1];
    let flagged = result[2];

    //now we start solving:
    let better = true;
    let solved = false
    let lifeLine = 0;
    let desperate = NUM_CELLS / 3 < components.NUM_BOMBS
    let max
    if (Math.floor(NUM_CELLS / 10000) > 0) {
        max = Math.floor(NUM_CELLS / 10000)
    } else {
        max = 1
    }
    console.log(max)
    // let desperate = true


    while (!solved) {
        //I hate it when I accidentally put in a change I am CERTAIN will not work and it turns out to fix everything
        //this bit of code is literally the only reason that this minesweeper game works. My mind is blown.
        //
        if (desperate) {
            for (let i=0; i<max; i++) {
                result = moveBomb(board, clicked, flagged)
                better = result[0];
                board = result[1];
            }
        }

        //click and flag all easy tiles
        result = flagEasy(board, clicked, flagged);
        flagged = result[0];
        better = result[1];

        result = clickEasy(board, clicked, flagged);
        clicked = result[0];
        if (!better) better = result[1];

        //if board not easily improved, click and flag all hard tiles
        if (!better) {
            result = flagHard(board,clicked,flagged);
            flagged = result[0];
            better = result[1];

            result = clickHard(board,clicked,flagged);
            clicked = result[0];
            if (!better) better = result[1];

            //check if solved, if not solved move bomb
            if ((!better && tilesClicked === NUM_CELLS - components.NUM_BOMBS) || numFlags === components.NUM_BOMBS) {
                solved = true;
            } else if (!better) {

                if (edge.size === 0) {
                    console.log("regening because flag edge")
                    let result = regenBoard(firstClick)
                    clicked = result[0];
                    board = result[1];
                    flagged = result[2];
                    lifeLine++
                } else {
                    result = moveBomb(board, clicked, flagged, firstClick)
                    better = result[0];
                    board = result[1];


                    if (!better) {
                        console.log("regening because cant solve")
                        let result = regenBoard(firstClick)
                        clicked = result[0];
                        board = result[1];
                        flagged = result[2];
                        lifeLine++
                    }
                }
            }
        }

        if (lifeLine === 50 && !desperate) {
            desperate = true
            console.log("desperate times call for desperate measures")
        }
        if (lifeLine === 20000) {

            console.log("inf loop")
            break;
        }
    }

    tilesClicked = 0;
    numFlags = 0;
    clicked = [];
    clicked[firstClick] = 1;
    flagged = [];
    tilesNear = [];
    flagsNear = [];

    tilesClicked++;

    edge.clear();
    edge.add(firstClick);

    //general setup
    //save the edge, make a variable to save the flagged bombs, make a variable to save num tiles near each tile
    //find the edge, and fill in tiles near
    for (let i=0; i<NUM_CELLS; i++) {
        //fill out the number of unclicked tiles near each tile
        flagged[i] = 0;
        if (clicked[i] !== 1) clicked[i] = 0;
        tilesNear[i] = 0;
        flagsNear[i] = 0;
        nbrs[i].forEach(n => {
            if (!clicked[n]) {
                tilesNear[i]++;
            }
        })
    }
    better = true;

    while (better) {

        let result = flagEasy(board, clicked, flagged);
        flagged = result[0];

        better = result[1];

        result = clickEasy(board, clicked, flagged);
        clicked = result[0];
        if (!better) better = result[1];


        if (!better) {

            result = flagHard(board, clicked, flagged);
            flagged = result[0];

            better = result[1];

            result = clickHard(board, clicked, flagged);
            clicked = result[0];
            if (!better) better = result[1];
        }
    }
    console.log("solver attempt:")
    // printBoard(board, clicked, flagged);

    user_board = board;
    for (let i=0; i<NUM_CELLS; i++) {
        if (clicked[i]) {

            document.getElementById(i.toString() + 'f').innerHTML = user_board[i];
            document.getElementById(i.toString() + 'f').style.backgroundColor = 'gray';
            document.getElementById(i.toString() + 'f').style.color = components.colors[user_board[i]];
        }
        if (flagged[i]) {
            // document.getElementById(i.toString() + 'f').style.backgroundColor = '';
            document.getElementById(i.toString() + 'f').innerText = "\uD83D\uDEA9";

        }
        // if (board[i] === -1) {
        //     // document.getElementById(i.toString() + 'f').innerText = "\uD83D\uDEA9";
        //     document.getElementById(i.toString() + 'f').style.color = "black";
        // }
    }

    tilesClicked = 0;
    console.log("board generated");
    return board;
}

/**
 * clicks a tile at a given location
 * @param loc location to be clicked
 */
function clickTile(loc) {
    tilesClicked++
    console.log(tilesClicked)
    if (tilesClicked === NUM_CELLS - components.NUM_BOMBS - 1) {
        const messageObject = document.createElement("p")
        messageObject.id = "victoryMessage"
        const node = document.createTextNode("Victory!")
        messageObject.appendChild(node)
        document.getElementById("boards").insertBefore(messageObject, document.getElementById("boards").children[1])
    }
    document.getElementById(loc.toString()).style.backgroundColor = 'gray';
    document.getElementById(loc.toString()).style.color = components.colors[user_board[loc]];
    if (user_board[loc]) {
        document.getElementById(loc.toString()).innerHTML = user_board[loc];
    } else {
        document.getElementById(loc.toString()).innerHTML = "";
    }
    user_clicked[loc] = 1;
}

/**
 * if a zero tile is clicked, then click all surrounding tiles
 * @param position location of original tile
 */
function clickAdjacentCells(position) {
    //hash table to store places we've already been
    //ensures that we don't infinite loop
    let alreadyVisited = new Set();

    //starting position
    let toVisit = [];
    toVisit.push(position);
    //while n is not empty, click on all tiles found, and add tiles with 0 bombs near to queueue
    while (toVisit.length !== 0) {
        let current = toVisit.pop();
        nbrs[current].forEach(n => {
            if (!user_clicked[n] && !user_flagged[n] && !alreadyVisited.has(n)) {
                alreadyVisited.add(n);
                clickTile(n);

                if (user_board[n] === 0) {
                    toVisit.push(n);
                }
            }
        })
    }
}


/**
 * function that handles left click events
 * ensures:
 * if first click it is not a bomb
 * if tile has value of zero that all adjacent tiles are also clicked
 * if flag nothing happens
 */
function leftClickEvent(e) {
    //e.target.id is the index of the clicked tile since we use id's to tell the tiles where they are located
    //ensures non-game elements are left alone and that flags are not clicked through
    if (!Number.isInteger(parseInt(e.target.id)) || user_flagged[parseInt(e.target.id)] === 1 || e.target.className === "fakeCell") return true;

    clickTile(parseInt(e.target.id));

    if (firstClick) {
        firstClick = false;
        user_board = solve(parseInt(e.target.id));
    }

    //if bomb then use different colors/text and return false (signalling game loss)
    if (user_board[parseInt(e.target.id)] === -1) {
        e.target.style.backgroundColor = 'yellow';
        e.target.innerHTML = "";
        for (let i=0; i<NUM_CELLS; i++) {
            if (user_board[i] === -1) {
                document.getElementById(i.toString()).style.backgroundColor = 'yellow';
                document.getElementById(i.toString()).innerText = '\uD83D\uDCA3';
                document.getElementById(i.toString()).style.color = "black";
            }
        }
        return false;
    } else if (user_board[parseInt(e.target.id)] === 0) {
        clickAdjacentCells(parseInt(e.target.id));
    }
    return true;
}
/**
 * function that handles right click events
 * ensures:
 * if tile already clicked, nothing happens
 */
function rightClickEvent(e) {
    //ensures non-game elements are left alone and that clicked tiles cannot be flagged
    if (!Number.isInteger(parseInt(e.target.id)) || user_clicked[parseInt(e.target.id)] === 1 || e.target.className === "fakeCell") return;

    if (user_flagged[parseInt(e.target.id)] === 1) {
        e.target.style.backgroundColor = 'lightgray';
        e.target.innerText = ""
        user_flagged[parseInt(e.target.id)] = 0;
        numFlags--;
    }
    else {
        // e.target.style.backgroundColor = 'red';
        e.target.innerText = "\uD83D\uDEA9"
        user_flagged[parseInt(e.target.id)] = 1;
        numFlags++;
    }
}

function hideSolution() {
    var x = document.getElementById("solutionBoard");
    if (x.style.display === "none") {
        x.style.display = "block";
    } else {
        x.style.display = "none";
    }
}

function makeBoard() {
    if (document.getElementById("victoryMessage") !== undefined && document.getElementById("victoryMessage") !== null) {
        document.getElementById("victoryMessage").remove();
    }
    if (document.getElementById("numCols").value <= 0 || document.getElementById("numRows").value <= 0 ||
        document.getElementById("numCols").value * document.getElementById("numRows").value - 9 < document.getElementById("numBombs").value) {
        return
    }
    if (document.getElementById("solutionBoard").style.display === "block") {
        hideSolution()
    }

    components.NUM_COLS = document.getElementById("numCols").value
    components.NUM_ROWS = document.getElementById("numRows").value
    components.NUM_BOMBS = document.getElementById("numBombs").value

    //solver information
    firstClick = true;
    edge = new Set();
    usedLocations = new Set();
    nbrs = [];
    tilesNear = [];
    flagsNear = [];

    //game information
    NUM_CELLS = (components.NUM_ROWS * components.NUM_COLS);
    numFlags = 0;
    tilesClicked = 0;
    user_board = [];
    user_clicked = [];
    user_flagged = [];


    console.log(components.NUM_ROWS)

    neighborlySetup()
    drawBoard("gameBoard", true);
    document.getElementById("solutionBoard").innerHTML = ''
    drawBoard("solutionBoard", false);
}

/////////////////////MAIN//MAIN//MAIN//////////////////////////

//event listener for a right click (triggering a flag placement)
window.oncontextmenu = rightClickEvent;

//event listener for a left click (triggering a tile clear)
window.onclick = leftClickEvent;
drawBoard("gameBoard", true);

drawBoard("solutionBoard", false);
neighborlySetup();




