// [a, b)
function RandomInRange(a, b) {
  return a + Math.floor(Math.random() * (b - a));
}

class Tetromino {
  static shapes = Object.freeze(shapes);

  static Actions = Object.freeze({
    ROTATE: 'rotate',
    MVRIGHT: 'mvright',
    MVLEFT: 'mvleft'
  })

  shape = Tetromino.shapes[
    Object.keys(Tetromino.shapes)[RandomInRange(0, Object.keys(Tetromino.shapes).length)]
  ];
  // provide uniform distribution
  coords = {
    x1: RandomInRange(0 - Math.floor(this.shape[0].length / 2),
      Board.x + Math.floor(this.shape[0].length / 2)),
    y1: 0
  }

  constructor(other) {
    if (other) {
      this.shape = other.shape.map(arr => arr.slice());
      this.coords = { x1: other.coords.x1, y1: other.coords.y1 };
    }
    else {
      this.rotate(Math.floor(RandomInRange(0, 4)));
    }
  }

  _fixWallKick() {
    const { x1: realX1, x2: realX2 } = Tetromino.getRealBoundaries(this);
    if (realX1 < 0) this.coords.x1 -= realX1;                             // + (0 - realX1)
    if (realX2 > Board.x - 1) this.coords.x1 += (Board.x - 1) - realX2;   // + (max - realX2)
  }

  rotate(N = 1) {
    for (let i = 0; i < N; ++i)
      this.shape = this.shape[0].map((_, i) => this.shape.map(c => c[i]).reverse())
    this._fixWallKick();
  }

  move(direction) {
    if (direction === Tetromino.Actions.MVRIGHT) ++this.coords.x1;
    else if (direction === Tetromino.Actions.MVLEFT) --this.coords.x1;
    this._fixWallKick();
  }

  nextStep() {
    ++this.coords.y1;
  }

  static getRealBoundaries(tetromino) {
    const nonZeroRows = [], nonZeroCols = [];
    tetromino.shape.forEach((r, i) => {
      if (r.some(el => el)) nonZeroRows.push(i + tetromino.coords.y1)
    });
    tetromino.shape[0].forEach((_, c) => {
      if (tetromino.shape.map(arr => arr[c]).some(el => el))
        nonZeroCols.push(c + tetromino.coords.x1)
    })
    return {
      x1: Math.min(...nonZeroCols), x2: Math.max(...nonZeroCols),
      y1: Math.min(...nonZeroRows), y2: Math.max(...nonZeroRows)
    }
  }

}

class Board {
  static x = 10;
  static y = 20;

  _fields = new Array(Board.y).fill(new Array(Board.x).fill(0));

  firstFrame(tetromino) {
    return this._finalize(tetromino);
  }

  nextTick(tetromino) {
    tetromino.nextStep();
    return this._finalize(tetromino);
  }

  act(tetromino, action) {
    let tCopy = new Tetromino(tetromino);
    if (action === Tetromino.Actions.ROTATE) tCopy.rotate();
    else tCopy.move(action);
    const newLayout = this._renderWithTetromino(tCopy);
    const ok = !newLayout.some(arr => arr.some(el => el > 1));
    if (ok) {
      if (action === Tetromino.Actions.ROTATE) tetromino.rotate();
      else tetromino.move(action);
    }
    return { ...this._finalize(tetromino), ok };
  }

  _finalize(tetromino) {
    const isFinalPos = this._isFinalPos(tetromino);
    if (isFinalPos) {
      this._fields = this._renderWithTetromino(tetromino);
      this._handleFullRows();
    }
    return {
      board: isFinalPos ? this._fields : this._renderWithTetromino(tetromino),
      isFinalPos,
      gameOver: isFinalPos && this._fields.some(arr => arr.some(el => el > 1))
    }
  }

  _renderWithTetromino(tetromino) {
    const fieldsCopy = this._fields.map(arr => arr.slice());
    tetromino.shape.forEach((r, y) => r.forEach((_, x) => {
      let targetY = y + tetromino.coords.y1, targetX = x + tetromino.coords.x1;
      if (targetY >= 0 && targetY < Board.y && targetX >= 0 && targetX < Board.x)
        fieldsCopy[targetY][targetX] += tetromino.shape[y][x];
    }))
    return fieldsCopy;
  }

  _isFinalPos(tetromino) {
    let isFinal = false;
    tetromino.shape.forEach((r, y) => r.forEach((_, x) => {
      if (tetromino.shape[y][x] &&
        (tetromino.coords.y1 + y === Board.y - 1
          || this._fields[tetromino.coords.y1 + y + 1][tetromino.coords.x1 + x]))
        isFinal = true;
    }))
    return isFinal;
  }

  _handleFullRows() {
    for (let ri = 0; ri < this._fields.length; ++ri)
      if (this._fields[ri].every((v, _, arr) => v && v === arr[0])) {
        this._fields.splice(ri, 1)
        this._fields.unshift(new Array(Board.x).fill(0));
        --ri;
      }
  }

}

class Game {
  _board = new Board();
  _tetromino = new Tetromino();

  score = 0;
  view = this._board.firstFrame(this._tetromino).board;
  isOver = false;

  constructor() {
    this._loop();
  }

  async _loop() {
    while (!this.isOver) {
      await new Promise(r => setTimeout(r, 180 + 2500 / Math.sqrt(Math.max(this.score, 50))));
      this._boardHandler(this._board.nextTick(this._tetromino));
      ++this.score;
    }
  }

  act(action) {
    this._boardHandler(this._board.act(this._tetromino, action));
  }

  _boardHandler({ board, isFinalPos, gameOver }) {
    this.view = board;
    this.isOver = gameOver;
    if (isFinalPos) {
      this._tetromino = new Tetromino();
      this.view = this._board.firstFrame(this._tetromino).board;
    }
  }
}