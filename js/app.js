'use strict'

const WALL = 'WALL'
const FLOOR = 'FLOOR'
const BALL = 'BALL'
const GAMER = 'GAMER'
const GLUE = 'GLUE'

const GAMER_IMG = '<img src="img/gamer.png">'
const BALL_IMG = '<img src="img/ball.png">'
const GLUE_IMG = '<img src="img/candy.png">'
const COLLECT_SOUND = new Audio("aud/ball.mp3");

// Model:
var gBoard
var gGamerPos
var gBallCount
var gIsGlued

var gBallInterval
var gGlueInterval

function onInitGame() {
	document.querySelector('.restart-btn').hidden = true

	gIsGlued = false
	gGamerPos = { i: 2, j: 9 }
	gBallCount = 0
	gBoard = buildBoard()
	renderBoard(gBoard)

	gBallInterval = setInterval(addBall, 5000)
	gGlueInterval = setInterval(addGlue, 5000)
}

function buildBoard() {
	//  Create the Matrix 10 * 12 
	const board = createMat(10, 12)
	// Put FLOOR everywhere and WALL at edges
	for (var i = 0; i < board.length; i++) {
		for (var j = 0; j < board[i].length; j++) {
			board[i][j] = { type: FLOOR, gameElement: null }

			if (i === 0 || j === 0 ||
				i === board.length - 1 || j === board[i].length - 1) {
				board[i][j].type = WALL
			}
		}
	}

	// Helpers - imporved READABILTY
	const lastRowIdx = board.length - 1 // 9
	const lastColumnIdx = board[0].length - 1 // 11
	const midRowIdx = Math.ceil(lastRowIdx / 2) // 5
	const midColumnIdx = Math.floor(lastColumnIdx / 2) // 5

	// Placing passages
	board[0][midColumnIdx].type = FLOOR
	board[lastRowIdx][midColumnIdx].type = FLOOR

	board[midRowIdx][0].type = FLOOR
	board[midRowIdx][lastColumnIdx].type = FLOOR

	// Place the gamer and two balls
	board[gGamerPos.i][gGamerPos.j].gameElement = GAMER

	board[2][5].gameElement = BALL
	board[5][2].gameElement = BALL

	console.log('board:', board)
	updateBallCount(2)

	return board
}

// Render the board to an HTML table
function renderBoard(board) {

	var strHTML = ''
	for (var i = 0; i < board.length; i++) {
		strHTML += '<tr>'
		for (var j = 0; j < board[0].length; j++) {
			const currCell = board[i][j]

			var cellClass = getClassName({ i: i, j: j }) // cell-i-j

			if (currCell.type === FLOOR) cellClass += ' floor'
			else if (currCell.type === WALL) cellClass += ' wall'

			strHTML += `<td class="cell ${cellClass}" onclick="moveTo(${i},${j})" >`

			if (currCell.gameElement === GAMER) {
				strHTML += GAMER_IMG
			} else if (currCell.gameElement === BALL) {
				strHTML += BALL_IMG
			}

			strHTML += '</td>'
		}
		strHTML += '</tr>'
	}
	const elBoard = document.querySelector('.board')
	elBoard.innerHTML = strHTML
}

// Move the player to a specific location
function moveTo(i, j) {
	// console.log('i, j:', i, j) 
	if (gIsGlued) return

	const lastRowIdx = gBoard.length - 1 //9
	const lastColumnIdx = gBoard[0].length - 1 //11

	// If going through passeges by keyboard(beyond the mat borders) -> handle next location
	if (j < 0) j = lastColumnIdx // -1 => 11
	if (j > lastColumnIdx) j = 0 // 12 => 0
	if (i < 0) i = lastRowIdx // -1 => 9
	if (i > lastRowIdx) i = 0 // 10 => 0

	// Calculate distance to make sure we are moving to a neighbor cell
	const iAbsDiff = Math.abs(i - gGamerPos.i)
	const jAbsDiff = Math.abs(j - gGamerPos.j)
	// console.log('iAbsDiff:', iAbsDiff)
	// console.log('jAbsDiff:', jAbsDiff)

	// If the clicked Cell is one of the four allowed OR edged (The last row IDX is also the furthest distance possible)
	if (iAbsDiff + jAbsDiff === 1 || iAbsDiff === lastRowIdx || jAbsDiff === lastColumnIdx) {

		const targetCell = gBoard[i][j]
		if (targetCell.type === WALL) return

		if (targetCell.gameElement === BALL) {
			updateBallCount(-1)
			COLLECT_SOUND.play()
			checkVictory()

		} else if (targetCell.gameElement === GLUE) {
			gIsGlued = true
			setTimeout(() => {
				gIsGlued = false
			}, 3000)
		}

		// Move the gamer
		// Update Model:
		gBoard[gGamerPos.i][gGamerPos.j].gameElement = null
		// Update Dom:
		renderCell(gGamerPos, '')

		// Update Model:
		gGamerPos = { i: i, j: j }
		gBoard[gGamerPos.i][gGamerPos.j].gameElement = GAMER
		// Update Dom:
		renderCell(gGamerPos, GAMER_IMG)

		// Check for neighbours
		updateNegsBallCount(gGamerPos, gBoard)

	} else console.log('TOO FAR', iAbsDiff, jAbsDiff)

}

// Add ball in random cell
function addBall() {
	const emptyCell = getEmptyLocation(gBoard)
	if (!emptyCell) return
	gBoard[emptyCell.i][emptyCell.j].gameElement = BALL
	renderCell(emptyCell, BALL_IMG)

	updateBallCount(1)
	updateNegsBallCount(gGamerPos, gBoard)
}

// Add glue in random cell
function addGlue() {
	const emptyCell = getEmptyLocation(gBoard)
	if (!emptyCell) return
	gBoard[emptyCell.i][emptyCell.j].gameElement = GLUE
	renderCell(emptyCell, GLUE_IMG)

	setTimeout(() => {
		if (gIsGlued) return
		gBoard[emptyCell.i][emptyCell.j].gameElement = null
		renderCell(emptyCell, '')
	}, 3000)
}

// Add empty location on board
function getEmptyLocation(board) {
	// const emptyLocations = [{i:1,j:1},{i:1,j:2}];
	const emptyLocations = []

	for (var i = 0; i < board.length; i++) {
		for (var j = 0; j < board[i].length; j++) {
			const currCell = board[i][j];
			if (currCell.type === FLOOR && !currCell.gameElement) {
				emptyLocations.push({ i, j })
			}
		}
	}

	if (!emptyLocations.length) return null

	const randomIdx = getRandomInt(0, emptyLocations.length)
	return emptyLocations[randomIdx]
}

function checkVictory() {
	if (gBallCount) return

	clearInterval(gBallInterval)
	clearInterval(gGlueInterval)
	gIsGlued = true
	document.querySelector('.restart-btn').hidden = false

}

function updateBallCount(diff) {
	gBallCount += diff
	document.querySelector('h2 span').innerText = gBallCount
}

function updateNegsBallCount(gamerPos, board) {
	const negBallCount = countNegsBalls(gamerPos.i, gamerPos.j, board)
	document.querySelector('h3 span').innerText = negBallCount
}

function countNegsBalls(cellI, cellJ, board) {
	var count = 0
	for (var i = cellI - 1; i <= cellI + 1; i++) {
		if (i < 0 || i >= board.length) continue;
		for (var j = cellJ - 1; j <= cellJ + 1; j++) {
			if (j < 0 || j >= board[i].length) continue;
			if (i === cellI && j === cellJ) continue;
			if (board[i][j].gameElement === BALL) count++;
		}
	}
	return count
}

// Convert a location object {i, j} to a selector and render a value in that element
function renderCell(location, value) {
	const cellSelector = '.' + getClassName(location) // '.cell-1-1'
	const elCell = document.querySelector(cellSelector) // <td></td>
	elCell.innerHTML = value
}

// Move the player by keyboard arrows
function onHandleKey(event) {

	const i = gGamerPos.i
	const j = gGamerPos.j

	switch (event.key) {
		case 'ArrowLeft':
			moveTo(i, j - 1)
			break
		case 'ArrowRight':
			moveTo(i, j + 1)
			break
		case 'ArrowUp':
			moveTo(i - 1, j)
			break
		case 'ArrowDown':
			moveTo(i + 1, j)
			break
	}
}

// Returns the class name for a specific cell
function getClassName(location) {
	const cellClass = 'cell-' + location.i + '-' + location.j
	return cellClass
}
