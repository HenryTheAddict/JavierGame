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
        this.coins = 0;
        this.isPunching = false;
        this.punchTimer = 0;
        this.weapon = null; // Current weapon
    }

    update() {
        if (this.y < this.game.canvas.height - this.height) {
            this.speedY += 0.5;
        }

        this.x += this.speedX;
        this.y += this.speedY;

        if (this.y > this.game.canvas.height - this.height) {
            this.y = this.game.canvas.height - this.height;
            this.speedY = 0;
            this.isJumping = false;
        }

        if (this.x < 0) this.x = 0;
        if (this.x > this.game.canvas.width - this.width) {
            this.x = this.game.canvas.width - this.width;
        }

        if (this.isPunching) {
            this.punchTimer++;
            if (this.punchTimer > 20) {
                this.isPunching = false;
                this.punchTimer = 0;
            }
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.fillStyle = '#FFA07A';
        ctx.fillRect(this.x + 10, this.y + 10, 30, 30);

        ctx.fillStyle = 'black';
        ctx.fillRect(this.x + 15, this.y + 20, 5, 5);
        ctx.fillRect(this.x + 30, this.y + 20, 5, 5);

        if (this.isPunching) {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(this.x + this.width, this.y + 20, 30, 10);
        }

        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - 20, 50, 5);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, this.y - 20, (this.health / 100) * 50, 5);

        ctx.fillStyle = 'yellow';
        ctx.font = '16px Arial';
        ctx.fillText(`Coins: ${this.coins}`, 10, 20);
        ctx.fillText(`Score: ${this.score}`, 10, 40);

        if (this.weapon) {
            ctx.fillText(`Weapon: ${this.weapon}`, 10, 60);
        }
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

class Coin {
    constructor(game) {
        this.game = game;
        this.width = 15;
        this.height = 15;
        this.x = Math.random() * (game.canvas.width - this.width);
        this.y = game.canvas.height - this.height - 20;
    }

    draw(ctx) {
        ctx.fillStyle = 'gold';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        if (
            this.x < this.game.javier.x + this.game.javier.width &&
            this.x + this.width > this.game.javier.x &&
            this.y < this.game.javier.y + this.game.javier.height &&
            this.y + this.height > this.game.javier.y
        ) {
            this.game.javier.coins++;
            return true;
        }
        return false;
    }
}

class Shop {
    constructor(game) {
        this.game = game;
        this.items = [
            { name: 'Sword', cost: 10 },
            { name: 'Shield', cost: 15 },
            { name: 'Gun', cost: 25 },
        ];
    }

    draw(ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(50, 50, this.game.canvas.width - 100, this.game.canvas.height - 100);

        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText('Shop', this.game.canvas.width / 2 - 20, 80);

        this.items.forEach((item, index) => {
            ctx.fillText(
                `${index + 1}. ${item.name} - ${item.cost} coins`,
                100,
                120 + index * 40
            );
        });

        ctx.fillText('Press the number key to buy an item.', 100, 250);
    }

    handlePurchase(key) {
        const index = parseInt(key) - 1;
        if (index >= 0 && index < this.items.length) {
            const item = this.items[index];
            if (this.game.javier.coins >= item.cost) {
                this.game.javier.coins -= item.cost;
                this.game.javier.weapon = item.name;
                alert(`You bought a ${item.name}!`);
            } else {
                alert('Not enough coins!');
            }
        }
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.javier = new Javier(this);
        this.enemies = [];
        this.powerUps = [];
        this.coins = [];
        this.enemySpawnTimer = 0;
        this.coinSpawnTimer = 0;
        this.round = 1;
        this.keys = {};
        this.isPaused = false;
        this.isShopOpen = false;
        this.shop = new Shop(this);

        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (this.isShopOpen && !isNaN(e.key)) {
                this.shop.handlePurchase(e.key);
            }
        });
        window.addEventListener('keyup', (e) => (this.keys[e.key] = false));

        this.createUI();
        this.gameLoop();
    }

    createUI() {
        const roundText = document.createElement('div');
        roundText.id = 'roundText';
        roundText.textContent = `Round: ${this.round}`;
        document.body.appendChild(roundText);
    }

    update() {
        if (this.isPaused || this.isShopOpen) return;

        if (this.keys['a'] || this.keys['A']) this.javier.speedX = -5;
        else if (this.keys['d'] || this.keys['D']) this.javier.speedX = 5;
        else this.javier.speedX = 0;

        if (this.keys[' ']) this.javier.jump();
        if (this.keys['j'] || this.keys['J']) this.javier.punch();
        if (this.keys['s'] || this.keys['S']) this.isShopOpen = true;

        this.javier.update();

        this.enemySpawnTimer++;
        if (this.enemySpawnTimer > 100 - this.round * 5) {
            const fromLeft = Math.random() < 0.5;
            const x = fromLeft ? 0 : this.canvas.width - 40;
            const speedX = fromLeft ? 3 + this.round : -3 - this.round;
            this.enemies.push(new Enemy(this, x, speedX, this.round));
            this.enemySpawnTimer = 0;
        }

        this.coinSpawnTimer++;
        if (this.coinSpawnTimer > 200) {
            this.coins.push(new Coin(this));
            this.coinSpawnTimer = 0;
        }

        this.enemies = this.enemies.filter((enemy) => !enemy.update());
        this.powerUps = this.powerUps.filter((powerUp) => !powerUp.update());
        this.coins = this.coins.filter((coin) => !coin.update());

        if (this.javier.score >= this.round * 50) {
            this.round++;
            document.getElementById('roundText').textContent = `Round: ${this.round}`;
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#90EE90';
        this.ctx.fillRect(0, this.canvas.height - 20, this.canvas.width, 20);

        this.javier.draw(this.ctx);
        this.enemies.forEach((enemy) => enemy.draw(this.ctx));
        this.powerUps.forEach((powerUp) => powerUp.draw(this.ctx));
        this.coins.forEach((coin) => coin.draw(this.ctx));

        if (this.isShopOpen) {
            this.shop.draw(this.ctx);
        }
    }

    gameLoop() {
        this.update();
        this.draw();
        if (this.javier.health > 0) {
            requestAnimationFrame(() => this.gameLoop());
        } else {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '48px Arial';
            this.ctx.fillText(
                'Game Over!',
                this.canvas.width / 2 - 100,
                this.canvas.height / 2
            );
        }
    }
}

new Game();
