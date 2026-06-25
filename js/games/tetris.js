/* ===== Tetris Game ===== */
var TETRIS = {};

TETRIS.Game = class {
  constructor(canvasId) {
    this.canvas = typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId;
    this.ctx = this.canvas.getContext("2d");
    this.cols = 10;
    this.rows = 20;
    this.blockSize = this.canvas.width / this.cols;
    this.running = false;
    this.gameOver = false;
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem("tetris-high") || "0");
    this.dropInterval = 500;
    this.lastDrop = 0;

    // Tetromino shapes
    this.shapes = {
      I: { blocks: [[1,1,1,1]], color: "#00E5FF" },
      O: { blocks: [[1,1],[1,1]], color: "#FFD166" },
      T: { blocks: [[0,1,0],[1,1,1]], color: "#9B59B6" },
      S: { blocks: [[0,1,1],[1,1,0]], color: "#5CB85C" },
      Z: { blocks: [[1,1,0],[0,1,1]], color: "#FF6B35" },
      J: { blocks: [[1,0,0],[1,1,1]], color: "#004E98" },
      L: { blocks: [[0,0,1],[1,1,1]], color: "#FF8C8C" }
    };
    this.pieceNames = ["I", "O", "T", "S", "Z", "J", "L"];

    this.reset();
    this.draw();
    this.setupControls();
    this.updateScore();

    const btn = document.getElementById("tetris-start");
    if (btn) btn.onclick = () => this.start();
  }

  reset() {
    this.board = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
    this.score = 0;
    this.gameOver = false;
    this.dropInterval = 500;
    this.lines = 0;
    this.currentPiece = null;
    this.nextPiece = this.randomPiece();
    this.spawnPiece();
  }

  randomPiece() {
    const name = this.pieceNames[Math.floor(Math.random() * this.pieceNames.length)];
    const shape = this.shapes[name];
    return {
      name,
      blocks: shape.blocks.map(row => [...row]),
      color: shape.color,
      x: Math.floor((this.cols - shape.blocks[0].length) / 2),
      y: 0
    };
  }

  spawnPiece() {
    this.currentPiece = this.nextPiece;
    this.nextPiece = this.randomPiece();
    this.currentPiece.x = Math.floor((this.cols - this.currentPiece.blocks[0].length) / 2);
    this.currentPiece.y = 0;

    if (this.collides(this.currentPiece)) {
      this.endGame();
    }
  }

  collides(piece) {
    for (let r = 0; r < piece.blocks.length; r++) {
      for (let c = 0; c < piece.blocks[r].length; c++) {
        if (!piece.blocks[r][c]) continue;
        const bx = piece.x + c;
        const by = piece.y + r;
        if (bx < 0 || bx >= this.cols || by >= this.rows) return true;
        if (by >= 0 && this.board[by][bx]) return true;
      }
    }
    return false;
  }

  setupControls() {
    document.addEventListener("keydown", (e) => {
      if (!this.running || this.gameOver) return;
      const key = e.key;
      e.preventDefault();

      if (key === "ArrowLeft") this.movePiece(-1, 0);
      else if (key === "ArrowRight") this.movePiece(1, 0);
      else if (key === "ArrowDown") this.movePiece(0, 1);
      else if (key === "ArrowUp") this.rotatePiece();
      else if (key === " ") this.hardDrop();
    });
  }

  movePiece(dx, dy) {
    if (!this.currentPiece) return;
    const moved = {
      ...this.currentPiece,
      x: this.currentPiece.x + dx,
      y: this.currentPiece.y + dy
    };
    if (!this.collides(moved)) {
      this.currentPiece = moved;
      this.draw();
    } else if (dy === 1) {
      this.lockPiece();
    }
  }

  rotatePiece() {
    if (!this.currentPiece) return;
    const blocks = this.currentPiece.blocks;
    const rotated = blocks[0].map((_, i) => blocks.map(row => row[i]).reverse());
    const rotatedPiece = { ...this.currentPiece, blocks: rotated };
    if (!this.collides(rotatedPiece)) {
      this.currentPiece = rotatedPiece;
      this.draw();
    }
  }

  hardDrop() {
    if (!this.currentPiece) return;
    while (!this.collides({ ...this.currentPiece, y: this.currentPiece.y + 1 })) {
      this.currentPiece.y++;
    }
    this.lockPiece();
  }

  lockPiece() {
    if (!this.currentPiece) return;
    const p = this.currentPiece;
    for (let r = 0; r < p.blocks.length; r++) {
      for (let c = 0; c < p.blocks[r].length; c++) {
        if (!p.blocks[r][c]) continue;
        const by = p.y + r;
        const bx = p.x + c;
        if (by < 0) { this.endGame(); return; }
        this.board[by][bx] = p.color;
      }
    }

    this.clearLines();
    this.spawnPiece();
    this.draw();
  }

  clearLines() {
    let cleared = 0;
    for (let r = this.rows - 1; r >= 0; r--) {
      if (this.board[r].every(cell => cell !== null)) {
        this.board.splice(r, 1);
        this.board.unshift(Array(this.cols).fill(null));
        cleared++;
        r++; // recheck this row
      }
    }

    if (cleared > 0) {
      const points = [0, 100, 300, 500, 800];
      this.score += points[Math.min(cleared, 4)];
      this.lines += cleared;
      this.dropInterval = Math.max(100, 500 - Math.floor(this.lines / 10) * 30);
      this.updateScore();
    }
  }

  start() {
    if (this.running && !this.gameOver) return;
    this.reset();
    this.running = true;
    this.lastDrop = Date.now();
    document.getElementById("tetris-start").textContent = "游戏中...";
    this.gameLoop();
  }

  gameLoop() {
    if (!this.running) return;

    const now = Date.now();
    if (now - this.lastDrop > this.dropInterval) {
      this.movePiece(0, 1);
      this.lastDrop = now;
    }

    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }

  draw() {
    const ctx = this.ctx;
    const bs = this.blockSize;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= this.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * bs);
      ctx.lineTo(w, r * bs);
      ctx.stroke();
    }
    for (let c = 0; c <= this.cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * bs, 0);
      ctx.lineTo(c * bs, h);
      ctx.stroke();
    }

    // Board blocks
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c]) {
          this.drawBlock(ctx, c * bs, r * bs, bs - 1, this.board[r][c]);
        }
      }
    }

    // Current piece
    if (this.currentPiece) {
      const p = this.currentPiece;
      for (let r = 0; r < p.blocks.length; r++) {
        for (let c = 0; c < p.blocks[r].length; c++) {
          if (p.blocks[r][c]) {
            const x = (p.x + c) * bs;
            const y = (p.y + r) * bs;
            if (y >= 0) this.drawBlock(ctx, x, y, bs - 1, p.color);
          }
        }
      }
    }

    // Next piece preview
    if (this.nextPiece) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(5, 5, 70, 70);
      ctx.fillStyle = "#fff";
      ctx.font = "10px sans-serif";
      ctx.fillText("NEXT", 10, 18);
      const np = this.nextPiece;
      for (let r = 0; r < np.blocks.length; r++) {
        for (let c = 0; c < np.blocks[r].length; c++) {
          if (np.blocks[r][c]) {
            this.drawBlock(ctx, 12 + c * 12, 24 + r * 12, 10, np.color);
          }
        }
      }
    }

    // Game over
    if (this.gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#fff";
      ctx.font = "24px ZCOOL KuaiLe, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("💀 游戏结束", w / 2, h / 2 - 10);
      ctx.font = "16px Noto Sans SC, sans-serif";
      ctx.fillText(`得分: ${this.score}`, w / 2, h / 2 + 30);
    }
  }

  drawBlock(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, size - 1, size - 1, 3);
    ctx.fill();
    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, size - 4, size * 0.3, 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  endGame() {
    this.gameOver = true;
    this.running = false;
    document.getElementById("tetris-start").textContent = "重新开始";
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("tetris-high", this.highScore.toString());
    }
    this.updateScore();
    this.draw();
  }

  updateScore() {
    const scoreEl = document.getElementById("tetris-score");
    const highEl = document.getElementById("tetris-high");
    if (scoreEl) scoreEl.textContent = this.score;
    if (highEl) highEl.textContent = this.highScore;
  }
};
