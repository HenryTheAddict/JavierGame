class Javier {
    constructor(game) {
        this.game = game;
        this.width = 50;
        this.height = 50;
        this.x = 100;
        this.y = game.canvas.height - this.height;
        this.speedX = 0;
        this.speedY = 0;
        this.isJumping = false;
        this.health = 100;
        this.score = 0;
        this.isPunching = false;
        this.punchTimer = 0;
    }

    update() {
        // Gravity
        if (this.y < this.game.canvas.height - this.height) {
            this.speedY += 0.5;
        }

        this.x += this.speedX;
        this.y += this.speedY;

        // Ground collision
        if (this.y > this.game.canvas.height - this.height) {
            this.y = this.game.canvas.height - this.height;
            this.speedY = 0;
            this.isJumping = false;
        }

        // Boundary checks
        if (this.x < 0) this.x = 0;
        if (this.x > this.game.canvas.width - this.width) {
            this.x = this.game.canvas.width - this.width;
        }

        // Update punch timer
        if (this.isPunching) {
            this.punchTimer++;
            if (this.punchTimer > 20) {
                this.isPunching = false;
                this.punchTimer = 0;
            }
        }
    }

    draw(ctx) {
        // Draw Javier
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Draw face
        ctx.fillStyle = '#FFA07A';
        ctx.fillRect(this.x + 10, this.y + 10, 30, 30);

        // Draw eyes
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x + 15, this.y + 20, 5, 5);
        ctx.fillRect(this.x + 30, this.y + 20, 5, 5);

        // Draw punch animation
        if (this.isPunching) {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(this.x + this.width, this.y + 20, 30, 10);
        }

        // Draw health bar
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - 20, 50, 5);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, this.y - 20, (this.health / 100) * 50, 5);
    }

    jump() {
        if (!this.isJumping) {
            this.speedY = -12;
            this.isJumping = true;
        }
    }

    punch() {
        if (!this.isPunching) {
            this.isPunching = true;
            this.punchTimer = 0;
        }
    }
}

class Enemy {
    constructor(game) {
        this.game = game;
        this.width = 40;
        this.height = 40;
        this.x = game.canvas.width;
        this.y = game.canvas.height - this.height;
        this.speedX = -3;
    }

    update() {
        this.x += this.speedX;

        // Check collision with Javier's punch
        if (this.game.javier.isPunching) {
            if (
                this.x < this.game.javier.x + this.game.javier.width + 30 &&
                this.x + this.width > this.game.javier.x &&
                this.y < this.game.javier.y + this.game.javier.height &&
                this.y + this.height > this.game.javier.y
            ) {
                this.game.javier.score += 10;
                document.getElementById('score').textContent = this.game.javier.score;

                // Explode effect
                this.explode();
                return true;
            }
        }

        // Check collision with Javier
        if (
            this.x < this.game.javier.x + this.game.javier.width &&
            this.x + this.width > this.game.javier.x &&
            this.y < this.game.javier.y + this.game.javier.height &&
            this.y + this.height > this.game.javier.y
        ) {
            this.game.javier.health -= 10;
        }

        return this.x + this.width < 0;
    }

    explode() {
        const ctx = this.game.ctx;
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 30, 0, Math.PI * 2);
        ctx.fill();
    }

    draw(ctx) {
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Draw angry eyes
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x + 5, this.y + 10, 8, 3);
        ctx.fillRect(this.x + 25, this.y + 10, 8, 3);
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.javier = new Javier(this);
        this.enemies = [];
        this.enemySpawnTimer = 0;
        this.keys = {};
        this.isPaused = false;

        window.addEventListener('keydown', (e) => this.keys[e.key] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key] = false);

        this.createUI();
        this.gameLoop();
    }

    createUI() {
        // Pause/Resume Button
        const pauseButton = document.createElement('button');
        pauseButton.textContent = 'Pause';
        pauseButton.onclick = () => {
            this.isPaused = !this.isPaused;
            pauseButton.textContent = this.isPaused ? 'Resume' : 'Pause';
        };
        document.body.appendChild(pauseButton);

        // Restart Button
        const restartButton = document.createElement('button');
        restartButton.textContent = 'Restart';
        restartButton.onclick = () => window.location.reload();
        document.body.appendChild(restartButton);
    }

    update() {
        if (this.isPaused) return;

        // Handle input
        if (this.keys['a'] || this.keys['A']) this.javier.speedX = -5;
        else if (this.keys['d'] || this.keys['D']) this.javier.speedX = 5;
        else this.javier.speedX = 0;

        if (this.keys[' ']) this.javier.jump();
        if (this.keys['j'] || this.keys['J']) this.javier.punch();

        this.javier.update();

        // Spawn enemies
        this.enemySpawnTimer++;
        if (this.enemySpawnTimer > 100) {
            this.enemies.push(new Enemy(this));
            this.enemySpawnTimer = 0;
        }

        // Update enemies
        this.enemies = this.enemies.filter(enemy => !enemy.update());
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw ground
        this.ctx.fillStyle = '#90EE90';
        this.ctx.fillRect(0, this.canvas.height - 20, this.canvas.width, 20);

        this.javier.draw(this.ctx);
        this.enemies.forEach(enemy => enemy.draw(this.ctx));

        // Game Over check
        if (this.javier.health <= 0) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '48px Arial';
            this.ctx.fillText('Game Over!', this.canvas.width / 2 - 100, this.canvas.height / 2);
            return true;
        }
        return false;
    }

    gameLoop() {
        this.update();
        if (!this.draw()) {
            requestAnimationFrame(() => this.gameLoop());
        }
    }
}
// Start the game
new Game();
