/* ===== Snake Game ===== */
var SNAKE = {};
// roundRect polyfill
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (typeof r === "number") r = { tl: r, tr: r, br: r, bl: r };
    this.beginPath();
    this.moveTo(x + r.tl, y);
    this.lineTo(x + w - r.tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    this.lineTo(x + w, y + h - r.br);
    this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    this.lineTo(x + r.bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    this.lineTo(x, y + r.tl);
    this.quadraticCurveTo(x, y, x + r.tl, y);
    this.closePath();
  };
}


SNAKE.Game = class {
  constructor(canvasId) {
    this.canvas = typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId;
    this.ctx = this.canvas.getContext("2d");
    this.gridSize = 20;
    this.tileCount = this.canvas.width / this.gridSize;
    this.running = false;
    this.gameOver = false;
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem("snake-high") || "0");
    this.speed = 150;

    this.reset();
    this.draw();
    this.setupControls();
    this.updateScore();

    // Hook up start button
    const btn = document.getElementById("snake-start");
    if (btn) btn.onclick = () => this.start();
  }

  reset() {
    this.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.food = this.spawnFood();
    this.score = 0;
    this.gameOver = false;
    this.speed = 150;
  }

  spawnFood() {
    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * this.tileCount),
        y: Math.floor(Math.random() * this.tileCount)
      };
    } while (this.snake.some(s => s.x === pos.x && s.y === pos.y));
    return pos;
  }

  setupControls() {
    document.addEventListener("keydown", (e) => { const gamesPage = document.getElementById("page-games"); if (!gamesPage || !gamesPage.classList.contains("active")) return;
      if (!this.running) return;
      const key = e.key;
      e.preventDefault();

      if ((key === "ArrowUp" || key === "w" || key === "W") && this.direction.y === 0)
        this.nextDirection = { x: 0, y: -1 };
      else if ((key === "ArrowDown" || key === "s" || key === "S") && this.direction.y === 0)
        this.nextDirection = { x: 0, y: 1 };
      else if ((key === "ArrowLeft" || key === "a" || key === "A") && this.direction.x === 0)
        this.nextDirection = { x: -1, y: 0 };
      else if ((key === "ArrowRight" || key === "d" || key === "D") && this.direction.x === 0)
        this.nextDirection = { x: 1, y: 0 };
    });
  }

  start() {
    if (this.running && !this.gameOver) return;
    this.reset();
    this.running = true;
    this.gameOver = false;
    document.getElementById("snake-start").textContent = "游戏中...";
    this.loop();
  }

  loop() {
    if (!this.running) return;
    this.update();
    this.draw();
    if (!this.gameOver) {
      setTimeout(() => this.loop(), this.speed);
    }
  }

  update() {
    this.direction = { ...this.nextDirection };

    const head = {
      x: this.snake[0].x + this.direction.x,
      y: this.snake[0].y + this.direction.y
    };

    // Wall collision
    if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
      this.endGame();
      return;
    }

    // Self collision
    if (this.snake.some(s => s.x === head.x && s.y === head.y)) {
      this.endGame();
      return;
    }

    this.snake.unshift(head);

    // Eat food
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this.food = this.spawnFood();
      this.updateScore();
      // Speed up slightly
      if (this.speed > 60) this.speed -= 2;
    } else {
      this.snake.pop();
    }
  }

  draw() {
    const ctx = this.ctx;
    const gs = this.gridSize;

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < this.tileCount; i++) {
      ctx.beginPath();
      ctx.moveTo(i * gs, 0);
      ctx.lineTo(i * gs, this.canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * gs);
      ctx.lineTo(this.canvas.width, i * gs);
      ctx.stroke();
    }

    // Food (pulsing)
    const pulse = Math.sin(Date.now() / 200) * 2 + 5;
    ctx.fillStyle = "#FF8C8C";
    ctx.shadowColor = "#FF8C8C";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(this.food.x * gs + gs / 2, this.food.y * gs + gs / 2, gs / 2 - 2 + pulse / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Snake body (gradient)
    for (let i = 0; i < this.snake.length; i++) {
      const s = this.snake[i];
      const hue = (30 + i * 8) % 360;
      const lightness = i === 0 ? 65 : 55;
      ctx.fillStyle = `hsl(${hue}, 85%, ${lightness}%)`;
      ctx.shadowColor = `hsla(${hue}, 85%, ${lightness}%, 0.5)`;
      ctx.shadowBlur = i === 0 ? 12 : 6;

      const padding = i === 0 ? 1 : 2;
      const r = i === 0 ? 4 : 3;
      ctx.beginPath();
      ctx.roundRect(s.x * gs + padding, s.y * gs + padding, gs - padding * 2, gs - padding * 2, r);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Game over overlay
    if (this.gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = "#fff";
      ctx.font = "24px ZCOOL KuaiLe, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("💀 游戏结束", this.canvas.width / 2, this.canvas.height / 2 - 10);
      ctx.font = "16px Noto Sans SC, sans-serif";
      ctx.fillText(`得分: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 30);
    }
  }

  endGame() {
    this.gameOver = true;
    this.running = false;
    document.getElementById("snake-start").textContent = "重新开始";
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("snake-high", this.highScore.toString());
    }
    this.updateScore();
    this.draw();
  }

  updateScore() {
    const scoreEl = document.getElementById("snake-score");
    const highEl = document.getElementById("snake-high");
    if (scoreEl) scoreEl.textContent = "得分: " + this.score;
    if (highEl) highEl.textContent = "最高: " + this.highScore;
  }
};
