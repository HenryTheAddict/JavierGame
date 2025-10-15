// Make sure the DOM is fully loaded before accessing elements
document.addEventListener("DOMContentLoaded", function () {
  // Game setup
  const canvas = document.getElementById("gameCanvas");
  if (!canvas) {
    console.error("Canvas element not found!");
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("Could not get canvas context!");
    return;
  }

  const scoreElement = document.getElementById("score");
  const coinsElement = document.getElementById("coins");
  const startRoundButton = document.getElementById("startRoundButton");

  // Game state
  let score = 0;
  let coins = 0;
  let isPaused = false;
  let isShopOpen = false;
  let gameStarted = false; // Track if game has started
  let lastDirection = 1; // 1 for right, -1 for left

  // Health regeneration system
  let lastDamageTime = 0;
  const healthRegenDelay = 360; // 6 seconds at 60fps
  const healthRegenAmount = 1; // Amount to regenerate per frame

  // Blink animation state
  let playerBlinking = false;
  let blinkTimer = 0;
  let blinkDuration = 30; // Half a second at 60fps
  let blinkFrequency = 6; // How often to blink (every X frames)

  // Jump particles system
  const jumpParticles = [];

  // Round system
  let currentRound = 1;
  let enemiesRemaining = 5; // Enemies per round
  let isRoundTransition = false;
  let roundTransitionTimer = 0;
  const roundTransitionDuration = 120; // 2 seconds at 60fps

  // Damage indicators
  const damageIndicators = [];

  // Game environment
  const gravity = 0.5;
  const ground = canvas.height - 50;

  // Player stats (can be upgraded in shop)
  const player = {
    x: 100,
    y: 300,
    width: 50,
    height: 50,
    speed: 5,
    jumpForce: 12,
    velocity: { x: 0, y: 0 },
    isJumping: false,
    isPunching: false,
    punchDamage: 10,
    health: 100,
    maxHealth: 100,
    color: "#e67e22", // Orange color for monkey (changed from brown)
    coinMagnetRange: 150, // Range for coin attraction
    isDead: false,
    hasTail: true, // Monkey has a tail
    lightningCharge: 0,
    maxLightningCharge: 100,
    chargePerHit: 25,
    deathAnimation: {
      active: false,
      timer: 0,
      maxTime: 90,
      particles: [],
    },
  };

  // Enemies
  const enemies = [];
  const enemySpawnRate = 90; // Much faster spawn rate for more enemies
  let enemyTimer = 0;

  // Enemy types with different properties
  const enemyTypes = [
    {
      name: "basic",
      color: "#e74c3c",
      health: 20,
      speed: 1,
      jumpForce: 8,
      size: { width: 40, height: 50 },
      points: 10,
    },
    {
      name: "fast",
      color: "#f39c12",
      health: 15,
      speed: 2.5,
      jumpForce: 12,
      size: { width: 35, height: 45 },
      points: 15,
    },
    {
      name: "tank",
      color: "#9b59b6",
      health: 40,
      speed: 0.8,
      jumpForce: 6,
      size: { width: 50, height: 60 },
      points: 25,
    },
    {
      name: "jumper",
      color: "#2ecc71",
      health: 18,
      speed: 1.2,
      jumpForce: 15,
      size: { width: 38, height: 48 },
      points: 20,
    },
    {
      name: "mini",
      color: "#1abc9c",
      health: 12,
      speed: 3,
      jumpForce: 10,
      size: { width: 25, height: 35 },
      points: 12,
    },
  ];

  // Death animations
  const deathAnimations = [];

  // Grave animations
  const graveAnimations = [];

  // Lightning effects
  const lightningEffects = [];

  // Blood particles
  const bloodParticles = [];

  // Screen shake
  const screenShake = {
    x: 0,
    y: 0,
    intensity: 0,
    duration: 0,
  };

  // Collectibles
  const coins3D = [];

  // UI Elements
  const pauseMenu = document.getElementById("pauseMenu");
  const shopMenu = document.getElementById("shopMenu");
  const startMenu = document.getElementById("startMenu");
  const deathScreen = document.getElementById("deathScreen");
  const overlay = document.getElementById("overlay");
  const resumeButton = document.getElementById("resumeButton");
  const restartButton = document.getElementById("restartButton");
  const deathRestartButton = document.getElementById("deathRestartButton");
  const closeShopButton = document.getElementById("closeShopButton");
  const startButton = document.getElementById("startButton");
  const shopButton = document.getElementById("shopButton");
  const buyButtons = document.querySelectorAll(".buy-button");

  // Event listeners for UI
  resumeButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", restartGame);
  deathRestartButton.addEventListener("click", restartGame);
  closeShopButton.addEventListener("click", toggleShop);
  startButton.addEventListener("click", startGame);
  shopButton.addEventListener("click", toggleShop);

  // Remove the start round button functionality as we're auto-starting rounds
  startRoundButton.style.display = "none";

  buyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.getAttribute("data-item");
      const cost = parseInt(button.getAttribute("data-cost"));

      if (coins >= cost) {
        coins -= cost;
        upgradePlayer(item);
        coinsElement.textContent = coins;

        // Modern success animation
        button.style.transform = "scale(0.95)";
        button.style.background = "#2ecc71";
        button.innerHTML = "✅ Purchased!";
        button.disabled = true;

        // Create purchase success particles
        createPurchaseParticles(button);

        // Animate coin counter
        animateCoinCounter();

        setTimeout(() => {
          button.style.transform = "scale(1)";
          button.style.background = "#2c3e50";
          button.innerHTML = `Buy (${cost} coins)`;
          button.disabled = false;
        }, 2000);
      } else {
        // Enhanced failure animation
        button.style.transform = "scale(0.95)";
        button.style.background = "#e74c3c";
        button.innerHTML = "❌ Not enough coins!";

        // Shake animation
        button.style.animation = "shake 0.5s ease-in-out";

        setTimeout(() => {
          button.style.transform = "scale(1)";
          button.style.background = "#2c3e50";
          button.innerHTML = `Buy (${cost} coins)`;
          button.style.animation = "";
        }, 1000);
      }
    });
  });

  // UI state management
  function clearAllUIStates() {
    isPaused = false;
    isShopOpen = false;
    startMenu.style.display = "none";
    pauseMenu.style.display = "none";
    shopMenu.style.display = "none";
    deathScreen.style.display = "none";
    overlay.style.display = "none";
    document.body.classList.remove("shop-open");
  }

  // Keyboard controls
  const keys = {};

  document.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;

    // Pause game with Escape key
    if (e.key === "Escape" && !isShopOpen) {
      togglePause();
    }

    // Open shop with S key
    if (e.key.toLowerCase() === "s" && !isPaused) {
      toggleShop();
    }

    // Punch with J key - faster attacking
    if (
      e.key.toLowerCase() === "j" &&
      !player.isPunching &&
      !isPaused &&
      !isShopOpen
    ) {
      player.isPunching = true;
      setTimeout(() => {
        player.isPunching = false;
      }, 150); // Reduced from 300ms to 150ms for faster attacking

      // Check for enemy hits
      checkPunchHits();
    }

    // Electrocution attack with H key
    if (
      e.key.toLowerCase() === "h" &&
      !isPaused &&
      !isShopOpen &&
      !player.isDead
    ) {
      performElectrocutionAttack();
    }
  });

  document.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  // Game functions
  function togglePause() {
    isPaused = !isPaused;
    pauseMenu.style.display = isPaused ? "block" : "none";
    overlay.style.display = isPaused ? "block" : "none";

    // Removed the extra requestAnimationFrame call to prevent speed-up bug
  }

  function toggleShop() {
    isShopOpen = !isShopOpen;
    shopMenu.style.display = isShopOpen ? "block" : "none";
    overlay.style.display = isShopOpen ? "block" : "none";

    // Add/remove blur effect
    if (isShopOpen) {
      document.body.classList.add("shop-open");
      isPaused = true;
    } else {
      document.body.classList.remove("shop-open");
      isPaused = false;
      // Removed the extra requestAnimationFrame call to prevent speed-up bug
    }
  }

  function restartGame() {
    score = 0;
    scoreElement.textContent = score;
    coins = 0;
    coinsElement.textContent = coins;

    // Reset round system
    currentRound = 1;
    enemiesRemaining = 8;
    isRoundTransition = false;
    roundTransitionTimer = 0;

    // Reset player
    player.x = 100;
    player.y = 300;
    player.velocity = { x: 0, y: 0 };
    player.health = player.maxHealth;
    player.isDead = false;
    player.deathAnimation.active = false;
    player.deathAnimation.particles = [];

    // Reset health regeneration
    lastDamageTime = 0;

    // Clear enemies, coins, and damage indicators
    enemies.length = 0;
    coins3D.length = 0;
    damageIndicators.length = 0;

    // Reset UI state
    isShopOpen = false;
    shopMenu.style.display = "none";
    document.body.classList.remove("shop-open");

    // Show start menu again
    gameStarted = false;
    clearAllUIStates();
    startMenu.style.display = "block";
    overlay.style.display = "block";
    // Hide the start round button
    startRoundButton.style.display = "none";
  }

  function upgradePlayer(item) {
    switch (item) {
      case "strength":
        player.punchDamage += 5;
        break;
      case "speed":
        player.speed *= 1.1; // 10% increase
        break;
      case "health":
        player.maxHealth += 20;
        player.health += 20;
        break;
    }
  }

  // Electrocution attack function
  function performElectrocutionAttack() {
    if (
      enemies.length === 0 ||
      player.lightningCharge < player.maxLightningCharge
    )
      return;

    // Find the nearest enemy
    let nearestEnemy = null;
    let nearestDistance = Infinity;

    enemies.forEach((enemy) => {
      const dx = enemy.x + enemy.width / 2 - (player.x + player.width / 2);
      const dy = enemy.y + enemy.height / 2 - (player.y + player.height / 2);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestEnemy = enemy;
      }
    });

    if (nearestEnemy && nearestDistance <= 400) {
      // 400px range
      // Create lightning effect
      createLightningEffect(
        player.x + player.width / 2,
        player.y + player.height / 2,
        nearestEnemy.x + nearestEnemy.width / 2,
        nearestEnemy.y + nearestEnemy.height / 2,
      );

      // Instantly kill the enemy
      score += nearestEnemy.points * 2 || 20; // Double points for lightning kill
      scoreElement.textContent = score;

      // Create special death animation
      createElectrocutionDeathAnimation(nearestEnemy.x, nearestEnemy.y);

      // Spawn bonus coins
      for (let i = 0; i < 3; i++) {
        spawnCoinAtPosition(
          nearestEnemy.x + Math.random() * 40,
          nearestEnemy.y + Math.random() * 40,
        );
      }

      // Remove the enemy
      const index = enemies.indexOf(nearestEnemy);
      if (index > -1) {
        enemies.splice(index, 1);
      }

      // Reset charge after use
      player.lightningCharge = 0;
    }
  }

  // Create lightning effect
  function createLightningEffect(startX, startY, endX, endY) {
    const segments = [];
    const numSegments = 8;

    for (let i = 0; i <= numSegments; i++) {
      const t = i / numSegments;
      const x = startX + (endX - startX) * t + (Math.random() - 0.5) * 20;
      const y = startY + (endY - startY) * t + (Math.random() - 0.5) * 20;
      segments.push({ x, y });
    }

    // Ensure start and end points are exact
    segments[0] = { x: startX, y: startY };
    segments[segments.length - 1] = { x: endX, y: endY };

    lightningEffects.push({
      segments,
      timer: 0,
      maxTime: 20, // Lightning lasts for 1/3 second
      width: 3 + Math.random() * 2,
      color: `hsl(${200 + Math.random() * 60}, 100%, 80%)`, // Blue-white lightning
    });
  }

  // Create special electrocution death animation
  function createElectrocutionDeathAnimation(x, y) {
    const particles = [];
    const particleCount = 50; // More particles for dramatic effect

    // Electric spark colors
    const sparkColors = ["#ffffff", "#87ceeb", "#00bfff", "#1e90ff", "#4169e1"];

    for (let i = 0; i < particleCount; i++) {
      const randomSparkColor =
        sparkColors[Math.floor(Math.random() * sparkColors.length)];

      particles.push({
        x: x + Math.random() * 40,
        y: y + Math.random() * 50,
        vx: (Math.random() - 0.5) * 15, // Faster, more dramatic spread
        vy: (Math.random() - 0.5) * 15,
        size: Math.random() * 8 + 3,
        color: randomSparkColor,
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        spark: true, // Flag for special spark rendering
      });
    }

    deathAnimations.push({
      particles,
      timer: 0,
      maxTime: 90, // Longer animation for dramatic effect
      electrocution: true,
    });

    // Create a grave animation at the enemy's position
    createGraveAnimation(x, y);
  }

  // Update lightning effects
  function updateLightningEffects() {
    for (let i = lightningEffects.length - 1; i >= 0; i--) {
      const lightning = lightningEffects[i];
      lightning.timer++;

      // Add some random flickering to segments
      lightning.segments.forEach((segment) => {
        segment.x += (Math.random() - 0.5) * 2;
        segment.y += (Math.random() - 0.5) * 2;
      });

      // Remove lightning when timer expires
      if (lightning.timer >= lightning.maxTime) {
        lightningEffects.splice(i, 1);
      }
    }
  }

  // Draw lightning effects
  function drawLightningEffects() {
    lightningEffects.forEach((lightning) => {
      ctx.save();

      // Calculate alpha for flickering effect
      const alpha = 0.7 + 0.3 * Math.sin(lightning.timer * 0.5);
      ctx.globalAlpha = alpha;

      // Draw main lightning bolt
      ctx.strokeStyle = lightning.color;
      ctx.lineWidth = lightning.width;
      ctx.lineCap = "round";
      ctx.shadowColor = lightning.color;
      ctx.shadowBlur = 10;

      ctx.beginPath();
      lightning.segments.forEach((segment, index) => {
        if (index === 0) {
          ctx.moveTo(segment.x, segment.y);
        } else {
          ctx.lineTo(segment.x, segment.y);
        }
      });
      ctx.stroke();

      // Draw additional thinner lightning branches
      ctx.lineWidth = 1;
      ctx.globalAlpha = alpha * 0.5;

      for (let i = 0; i < lightning.segments.length - 1; i++) {
        if (Math.random() < 0.3) {
          // 30% chance for branch
          const start = lightning.segments[i];
          const branchLength = 20 + Math.random() * 30;
          const branchAngle = Math.random() * Math.PI * 2;
          const endX = start.x + Math.cos(branchAngle) * branchLength;
          const endY = start.y + Math.sin(branchAngle) * branchLength;

          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
      }

      ctx.restore();
    });
  }

  function spawnEnemy() {
    // Only spawn if we have enemies remaining in this round
    if (enemiesRemaining <= 0) return;

    enemiesRemaining--;

    // Choose a random enemy type
    const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

    // Randomly choose spawn direction (left or right side)
    const spawnFromLeft = Math.random() > 0.5;

    // Random jump cooldown between 2-5 seconds (120-300 frames at 60fps)
    const randomJumpCooldown = 120 + Math.floor(Math.random() * 180);

    // Scale properties based on current round
    const roundMultiplier = 1 + currentRound * 0.08;

    const enemy = {
      x: spawnFromLeft ? -50 : canvas.width + 50, // Spawn from left or right
      y: ground - enemyType.size.height,
      width: enemyType.size.width,
      height: enemyType.size.height,
      speed: enemyType.speed * roundMultiplier + Math.random() * 0.5,
      health: enemyType.health + (currentRound - 1) * 5,
      maxHealth: enemyType.health + (currentRound - 1) * 5,
      color: enemyType.color,
      velocity: { x: 0, y: 0 }, // Add velocity for jumping
      isJumping: false,
      jumpForce: enemyType.jumpForce + Math.random() * 2,
      jumpCooldown: randomJumpCooldown,
      maxJumpCooldown: randomJumpCooldown,
      direction: spawnFromLeft ? 1 : -1,
      type: enemyType.name,
      points: enemyType.points,
    };

    enemies.push(enemy);
  }

  function createDeathAnimation(x, y) {
    const particles = [];
    const particleCount = 30; // Doubled particle count

    // Blood color variations
    const bloodColors = ["#e74c3c", "#c0392b", "#a93226", "#922b21", "#7b241c"];

    for (let i = 0; i < particleCount; i++) {
      // Select random blood color
      const randomBloodColor =
        bloodColors[Math.floor(Math.random() * bloodColors.length)];

      particles.push({
        x: x + Math.random() * 40,
        y: y + Math.random() * 50,
        vx: (Math.random() - 0.5) * 8, // Horizontal spread only
        vy: Math.random() * 2 + 1, // Only downward or slight upward movement
        size: Math.random() * 10 + 5,
        color: randomBloodColor, // Use varied blood colors
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
      });
    }

    deathAnimations.push({
      particles,
      timer: 0,
      maxTime: 60,
    });

    // Create a grave animation at the enemy's position
    createGraveAnimation(x, y);

    // Spawn a coin at the enemy's position
    spawnCoinAtPosition(x, y);
  }

  function spawnCoinAtPosition(x, y) {
    const coin = {
      x: x,
      y: y,
      radius: 15,
      rotation: 0,
      color: "#f39c12",
      vx: 0,
      vy: 0,
      attracted: false,
    };

    coins3D.push(coin);
  }

  function checkPunchHits() {
    const punchRange = 90; // Longer arm
    const punchDirection = lastDirection;
    let hitSomething = false;

    enemies.forEach((enemy) => {
      // Check if enemy is in punch range based on direction
      if (punchDirection > 0) {
        // Punching right
        if (
          enemy.x > player.x &&
          enemy.x < player.x + player.width + punchRange &&
          Math.abs(enemy.y - player.y) < player.height
        ) {
          // Calculate distance-based damage scaling
          const distance = enemy.x - (player.x + player.width);
          const proximityFactor = 1 - distance / punchRange;
          const scaledDamage = Math.ceil(
            player.punchDamage * (1 + proximityFactor),
          );

          enemy.health -= scaledDamage;
          // Visual feedback for hit
          enemy.color = "#ff0000";
          setTimeout(() => {
            enemy.color = "#e74c3c";
          }, 100);

          // Create blood splatter
          createBloodSplatter(
            enemy.x + enemy.width / 2,
            enemy.y + enemy.height / 2,
            scaledDamage,
          );

          // Screen shake on hit - more intense for higher damage
          createScreenShake(5 + scaledDamage * 0.5, 8 + scaledDamage * 0.3);

          // Build lightning charge
          player.lightningCharge = Math.min(
            player.lightningCharge + player.chargePerHit,
            player.maxLightningCharge,
          );

          hitSomething = true;

          // Create damage indicator
          createDamageIndicator(
            enemy.x + enemy.width / 2,
            enemy.y,
            scaledDamage,
          );

          if (enemy.health <= 0) {
            score += enemy.points || 10;
            scoreElement.textContent = score;

            // Create death animation at enemy position
            createDeathAnimation(enemy.x, enemy.y);
            // Spawn extra coins based on proximity (closer = more coins)
            const extraCoins = Math.floor(proximityFactor * 2);
            for (let i = 0; i < extraCoins; i++) {
              spawnCoinAtPosition(
                enemy.x + Math.random() * 30,
                enemy.y + Math.random() * 30,
              );
            }

            // Remove the enemy
            const index = enemies.indexOf(enemy);
            if (index > -1) {
              enemies.splice(index, 1);
            }
          }
        }
      } else {
        // Punching left
        if (
          enemy.x + enemy.width < player.x &&
          enemy.x + enemy.width > player.x - punchRange &&
          Math.abs(enemy.y - player.y) < player.height
        ) {
          // Calculate distance-based damage scaling
          const distance = player.x - (enemy.x + enemy.width);
          const proximityFactor = 1 - distance / punchRange;
          const scaledDamage = Math.ceil(
            player.punchDamage * (1 + proximityFactor),
          );

          enemy.health -= scaledDamage;
          // Visual feedback for hit
          enemy.color = "#ff0000";
          setTimeout(() => {
            enemy.color = "#e74c3c";
          }, 100);

          // Create blood splatter
          createBloodSplatter(
            enemy.x + enemy.width / 2,
            enemy.y + enemy.height / 2,
            scaledDamage,
          );

          // Screen shake on hit - more intense for higher damage
          createScreenShake(5 + scaledDamage * 0.5, 8 + scaledDamage * 0.3);

          // Build lightning charge
          player.lightningCharge = Math.min(
            player.lightningCharge + player.chargePerHit,
            player.maxLightningCharge,
          );

          hitSomething = true;

          // Create damage indicator
          createDamageIndicator(
            enemy.x + enemy.width / 2,
            enemy.y,
            scaledDamage,
          );

          if (enemy.health <= 0) {
            score += enemy.points || 10;
            scoreElement.textContent = score;

            // Create death animation at enemy position
            createDeathAnimation(enemy.x, enemy.y);
            // Spawn extra coins based on proximity (closer = more coins)
            const extraCoins = Math.floor(proximityFactor * 2);
            for (let i = 0; i < extraCoins; i++) {
              spawnCoinAtPosition(
                enemy.x + Math.random() * 30,
                enemy.y + Math.random() * 30,
              );
            }

            // Remove the enemy
            const index = enemies.indexOf(enemy);
            if (index > -1) {
              enemies.splice(index, 1);
            }
          }
        }
      }
    });

    // Extra screen shake and punch particles if we hit something
    if (hitSomething) {
      createScreenShake(3, 6);

      // Create punch impact particles
      const punchX = player.x + (lastDirection > 0 ? player.width + 90 : -90);
      const punchY = player.y + 25;

      for (let i = 0; i < 8; i++) {
        jumpParticles.push({
          x: punchX + (Math.random() - 0.5) * 20,
          y: punchY + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          size: Math.random() * 4 + 2,
          color: "#ffff00",
          alpha: 1,
          life: 0,
          maxLife: 15,
        });
      }
    }
  }

  function collectCoins() {
    for (let i = coins3D.length - 1; i >= 0; i--) {
      const coin = coins3D[i];
      const dx = player.x + player.width / 2 - coin.x;
      const dy = player.y + player.height / 2 - coin.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Magnetic effect when in range
      if (distance < player.coinMagnetRange) {
        coin.attracted = true;

        // Calculate direction to player
        const angle = Math.atan2(dy, dx);
        const speed = 5 * (1 - distance / player.coinMagnetRange);

        // Update velocity towards player
        coin.vx = Math.cos(angle) * speed;
        coin.vy = Math.sin(angle) * speed;
      }

      // Move coin based on velocity
      if (coin.attracted) {
        coin.x += coin.vx;
        coin.y += coin.vy;
      }

      // Collect coin if touching player
      if (distance < player.width / 2 + coin.radius) {
        coins++;
        coinsElement.textContent = coins;
        coins3D.splice(i, 1);
      }
    }
  }

  function updatePlayer() {
    // Horizontal movement
    player.velocity.x = 0;

    if (keys["a"] || keys["arrowleft"]) {
      player.velocity.x = -player.speed;
      lastDirection = -1;
    }

    if (keys["d"] || keys["arrowright"]) {
      player.velocity.x = player.speed;
      lastDirection = 1;
    }

    // Jumping
    if ((keys[" "] || keys["arrowup"]) && !player.isJumping) {
      player.velocity.y = -player.jumpForce;
      player.isJumping = true;

      // Create jump particles when player jumps
      createJumpParticles(player.x, player.y + player.height);
    }

    // Apply gravity
    player.velocity.y += gravity;

    // Update position
    player.x += player.velocity.x;
    player.y += player.velocity.y;

    // Ground collision
    if (player.y > ground - player.height) {
      player.y = ground - player.height;
      player.velocity.y = 0;

      // Create landing particles if the player was falling with some velocity
      if (player.isJumping) {
        createLandingParticles(player.x, player.y + player.height);
        player.isJumping = false;
      }
    }

    // Screen boundaries
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width)
      player.x = canvas.width - player.width;
  }

  function updateEnemies() {
    // Don't spawn enemies during round transition
    if (!isRoundTransition) {
      // Spawn new enemies
      enemyTimer++;
      if (enemyTimer >= enemySpawnRate && enemiesRemaining > 0) {
        spawnEnemy();
        enemyTimer = 0;
      }

      // Update progress bar
      const totalEnemies = 8 + (currentRound - 1) * 3;
      const enemiesDefeated = totalEnemies - enemiesRemaining - enemies.length;
      const progressPercentage = (enemiesDefeated / totalEnemies) * 100;
      document.getElementById("roundProgressBar").style.width =
        `${progressPercentage}%`;

      // Check if round is complete
      if (enemies.length === 0 && enemiesRemaining === 0) {
        // Automatically start the next round instead of showing the button
        startRoundTransition();
      }
    }

    // Update existing enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];

      // Calculate direction to player for following behavior
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Apply gravity to enemy
      enemy.velocity.y += gravity * 0.8; // Slightly less gravity than player

      // Handle jumping - enemies will always jump when cooldown reaches 0
      if (!enemy.isJumping && enemy.jumpCooldown <= 0) {
        enemy.velocity.y = -enemy.jumpForce;
        enemy.isJumping = true;
        // Reset with a random cooldown between 2-5 seconds (120-300 frames)
        enemy.jumpCooldown = 120 + Math.floor(Math.random() * 180);
        enemy.maxJumpCooldown = enemy.jumpCooldown;
      }

      if (enemy.jumpCooldown > 0) {
        enemy.jumpCooldown--;
      }

      // Only follow if within a certain range
      if (distance < 300) {
        // Calculate normalized direction vector
        const dirX = dx / distance;

        // Update enemy direction based on player position
        enemy.direction = dirX > 0 ? 1 : -1;

        // Move enemy toward player horizontally only
        enemy.x += enemy.direction * enemy.speed + (Math.random() - 0.5);
      } else {
        // Default movement when player is too far
        enemy.x += enemy.direction * enemy.speed;
      }

      // Apply vertical velocity
      enemy.y += enemy.velocity.y;

      // Ground collision
      if (enemy.y > ground - enemy.height) {
        enemy.y = ground - enemy.height;
        enemy.velocity.y = 0;
        enemy.isJumping = false;
      }

      // Remove if off screen (from either side)
      // Don't remove enemies that just spawned and are still entering the screen
      // For left side, only remove if they've moved past their spawn point and gone off screen
      // For right side, only remove if they've moved past their spawn point and gone off screen
      if (
        (enemy.direction > 0 && enemy.x < -enemy.width && enemy.x < -100) ||
        (enemy.direction < 0 &&
          enemy.x > canvas.width + enemy.width &&
          enemy.x > canvas.width + 100)
      ) {
        enemies.splice(i, 1);
      }

      // Check collision with player
      if (
        !player.isPunching &&
        !player.isDead &&
        player.x < enemy.x + enemy.width &&
        player.x + player.width > enemy.x &&
        player.y < enemy.y + enemy.height &&
        player.y + player.height > enemy.y
      ) {
        // Player takes damage
        player.health -= 5;

        // Reset health regeneration timer when taking damage
        lastDamageTime = 0;

        // Start blink animation when player takes damage
        playerBlinking = true;
        blinkTimer = 0;

        // Knockback
        if (player.x < enemy.x) {
          player.velocity.x = -5;
        } else {
          player.velocity.x = 5;
        }
        player.velocity.y = -5;

        // Game over if health depleted
        if (player.health <= 0) {
          startPlayerDeathAnimation();
        }
      }
    }
  }

  function updateCoins() {
    // Update existing coins
    coins3D.forEach((coin) => {
      coin.rotation += 0.05;
    });

    // Check collection
    collectCoins();
  }

  function updateDeathAnimations() {
    for (let i = deathAnimations.length - 1; i >= 0; i--) {
      const anim = deathAnimations[i];
      anim.timer++;

      // Update particles
      anim.particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.1; // Gravity
        particle.alpha = 1 - anim.timer / anim.maxTime;
        particle.size *= 0.97;
      });

      // Remove animation when done
      if (anim.timer >= anim.maxTime) {
        deathAnimations.splice(i, 1);
      }
    }
  }

  function createGraveAnimation(x, y) {
    // Create a grave animation at the enemy's position
    graveAnimations.push({
      x: x + 10, // Center the grave on the enemy's position
      y: ground - 30, // Position the grave on the ground
      width: 30,
      height: 40,
      timer: 0,
      maxTime: 180, // Graves last longer than death particles
      yOffset: 40, // Start below ground
      alpha: 0, // Start transparent
    });
  }

  function updateGraveAnimations() {
    for (let i = graveAnimations.length - 1; i >= 0; i--) {
      const grave = graveAnimations[i];
      grave.timer++;

      // Animation phases
      if (grave.timer < 30) {
        // Phase 1: Rise from ground
        grave.yOffset = 40 * (1 - grave.timer / 30);
        grave.alpha = grave.timer / 30;
      } else if (grave.timer > grave.maxTime - 60) {
        // Phase 3: Fade out
        grave.alpha = (grave.maxTime - grave.timer) / 60;
      } else {
        // Phase 2: Stay visible
        grave.yOffset = 0;
        grave.alpha = 1;
      }

      // Remove animation when done
      if (grave.timer >= grave.maxTime) {
        graveAnimations.splice(i, 1);
      }
    }
  }

  // Create jump particles when player jumps
  function createJumpParticles(x, y) {
    const particleCount = 15;

    for (let i = 0; i < particleCount; i++) {
      jumpParticles.push({
        x: x + Math.random() * player.width,
        y: y,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 2 - 1,
        size: Math.random() * 8 + 2,
        color: "#7f8c8d", // Dust color
        alpha: 1,
        life: 0,
        maxLife: 20 + Math.random() * 20,
      });
    }
  }

  // Create landing particles when player lands
  function createLandingParticles(x, y) {
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
      jumpParticles.push({
        x: x + Math.random() * player.width,
        y: y,
        vx: (Math.random() - 0.5) * 5, // Wider spread for landing
        vy: -Math.random() * 1.5, // Less upward velocity
        size: Math.random() * 10 + 3, // Slightly larger particles
        color: "#7f8c8d", // Dust color
        alpha: 1,
        life: 0,
        maxLife: 15 + Math.random() * 15, // Shorter lifespan
      });
    }
  }

  // Update jump particles
  function updateJumpParticles() {
    for (let i = jumpParticles.length - 1; i >= 0; i--) {
      const particle = jumpParticles[i];

      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.1; // Gravity
      particle.life++;
      particle.alpha = 1 - particle.life / particle.maxLife;

      // Remove dead particles
      if (particle.life >= particle.maxLife) {
        jumpParticles.splice(i, 1);
      }
    }
  }

  // Draw jump particles
  function drawJumpParticles() {
    jumpParticles.forEach((particle) => {
      ctx.save();
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // Update blink animation
  function updateBlinkAnimation() {
    // Update player blinking animation
    if (playerBlinking) {
      blinkTimer++;
      if (blinkTimer >= blinkDuration) {
        playerBlinking = false;
        blinkTimer = 0;
      }
    }

    // Health regeneration system
    if (!playerBlinking && !player.isDead) {
      lastDamageTime++;

      // Start regenerating health after 6 seconds (360 frames) without taking damage
      if (
        lastDamageTime >= healthRegenDelay &&
        player.health < player.maxHealth
      ) {
        player.health = Math.min(
          player.health + healthRegenAmount,
          player.maxHealth,
        );
      }
    }
  }

  function drawPlayer() {
    ctx.save();

    // Apply enhanced blinking effect when player is hit
    if (playerBlinking && blinkTimer % blinkFrequency < blinkFrequency / 2) {
      ctx.globalAlpha = 0.3; // More transparent during blink for better visibility
    }

    // Draw monkey tail
    if (player.hasTail) {
      ctx.fillStyle = player.color;
      ctx.beginPath();
      const tailStartX = lastDirection > 0 ? player.x : player.x + player.width;
      const tailStartY = player.y + player.height - 10;
      const tailCurveX = tailStartX + (lastDirection > 0 ? -20 : 20);
      const tailCurveY = tailStartY + 20;
      const tailEndX = tailStartX + (lastDirection > 0 ? -30 : 30);
      const tailEndY = tailStartY + 10;

      ctx.moveTo(tailStartX, tailStartY);
      ctx.quadraticCurveTo(tailCurveX, tailCurveY, tailEndX, tailEndY);
      ctx.lineWidth = 8;
      ctx.stroke();
    }

    // Draw monkey body
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Lightning charge glow effect when charged
    if (player.lightningCharge >= player.maxLightningCharge) {
      ctx.save();
      ctx.shadowColor = "#00bfff";
      ctx.shadowBlur = 15;
      ctx.strokeStyle = "#87ceeb";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        player.x - 2,
        player.y - 2,
        player.width + 4,
        player.height + 4,
      );
      ctx.restore();
    }

    // Draw monkey face
    // Lighter face area
    ctx.fillStyle = "#D2B48C"; // Tan color for monkey face
    ctx.beginPath();
    ctx.ellipse(
      player.x + player.width / 2,
      player.y + player.height / 2 - 5,
      20,
      25,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(player.x + 15, player.y + 15, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(player.x + 35, player.y + 15, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(
      player.x + player.width / 2,
      player.y + 25,
      5,
      3,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    // Mouth
    ctx.beginPath();
    ctx.moveTo(player.x + 15, player.y + 35);
    ctx.quadraticCurveTo(
      player.x + player.width / 2,
      player.y + 40,
      player.x + 35,
      player.y + 35,
    );
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ears
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.ellipse(player.x + 5, player.y + 5, 8, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(
      player.x + player.width - 5,
      player.y + 5,
      8,
      8,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    // Draw punch if punching
    if (player.isPunching) {
      // Enhanced punch animation with multiple effects
      const punchTime = Date.now() * 0.03;
      const punchSize = 18 + Math.sin(punchTime) * 5;
      const armExtension = 90 + Math.sin(punchTime * 2) * 10;

      ctx.save();

      // Add glow effect to punch
      ctx.shadowColor = "#ff6b35";
      ctx.shadowBlur = 15;

      ctx.fillStyle = "#e67e22"; // Orange arm color to match player

      if (lastDirection > 0) {
        // Main arm
        ctx.fillRect(
          player.x + player.width,
          player.y + 20,
          armExtension,
          punchSize,
        );

        // Fist impact effect
        ctx.fillStyle = "#ff4757";
        ctx.fillRect(
          player.x + player.width + armExtension - 5,
          player.y + 18,
          10,
          punchSize + 4,
        );

        // Speed lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(
            player.x + player.width + armExtension - 15,
            player.y + 15 + i * 7,
          );
          ctx.lineTo(
            player.x + player.width + armExtension + 15,
            player.y + 15 + i * 7,
          );
          ctx.stroke();
        }
      } else {
        // Main arm
        ctx.fillRect(
          player.x - armExtension,
          player.y + 20,
          armExtension,
          punchSize,
        );

        // Fist impact effect
        ctx.fillStyle = "#ff4757";
        ctx.fillRect(
          player.x - armExtension - 5,
          player.y + 18,
          10,
          punchSize + 4,
        );

        // Speed lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(player.x - armExtension - 15, player.y + 15 + i * 7);
          ctx.lineTo(player.x - armExtension + 15, player.y + 15 + i * 7);
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    // Draw health bar
    const healthPercentage = player.health / player.maxHealth;

    // Change health bar color based on regeneration status
    if (
      lastDamageTime >= healthRegenDelay &&
      player.health < player.maxHealth
    ) {
      // Pulsing green effect during regeneration
      const pulseIntensity = 0.7 + 0.3 * Math.sin(Date.now() * 0.01);
      ctx.fillStyle = `rgba(46, 204, 113, ${pulseIntensity})`;
    } else {
      ctx.fillStyle = "#2ecc71";
    }

    ctx.fillRect(player.x, player.y - 15, player.width * healthPercentage, 5);
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(player.x, player.y - 15, player.width, 5);

    // Show regeneration indicator
    if (
      lastDamageTime >= healthRegenDelay &&
      player.health < player.maxHealth
    ) {
      ctx.fillStyle = "#2ecc71";
      ctx.beginPath();
      ctx.arc(
        player.x + player.width * healthPercentage + 5,
        player.y - 12.5,
        3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    // Draw enhanced lightning charge meter
    const chargePercentage = player.lightningCharge / player.maxLightningCharge;
    const meterWidth = player.width + 10;
    const meterHeight = 6;
    const meterX = player.x - 5;
    const meterY = player.y - 30;

    ctx.save();

    // Background with gradient
    const bgGradient = ctx.createLinearGradient(
      meterX,
      meterY,
      meterX + meterWidth,
      meterY,
    );
    bgGradient.addColorStop(0, "rgba(0, 0, 0, 0.7)");
    bgGradient.addColorStop(1, "rgba(0, 0, 0, 0.5)");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(meterX, meterY, meterWidth, meterHeight);

    // Charge fill with gradient and effects
    if (chargePercentage > 0) {
      const chargeGradient = ctx.createLinearGradient(
        meterX,
        meterY,
        meterX + meterWidth * chargePercentage,
        meterY,
      );

      if (chargePercentage >= 1) {
        // Full charge - animated rainbow effect
        const time = Date.now() * 0.005;
        const hue1 = (180 + Math.sin(time) * 60) % 360;
        const hue2 = (220 + Math.sin(time + 1) * 60) % 360;
        chargeGradient.addColorStop(0, `hsl(${hue1}, 100%, 70%)`);
        chargeGradient.addColorStop(1, `hsl(${hue2}, 100%, 70%)`);

        // Lightning bolt pattern when full
        ctx.fillStyle = chargeGradient;
        ctx.shadowColor = "#00bfff";
        ctx.shadowBlur = 10;
      } else {
        // Partial charge - blue gradient
        chargeGradient.addColorStop(0, "#4169e1");
        chargeGradient.addColorStop(1, "#1e90ff");
        ctx.fillStyle = chargeGradient;
      }

      ctx.fillRect(meterX, meterY, meterWidth * chargePercentage, meterHeight);
    }

    // Enhanced border with glow when charged
    if (chargePercentage >= 1) {
      ctx.shadowColor = "#87ceeb";
      ctx.shadowBlur = 5;
    }
    ctx.strokeStyle = chargePercentage >= 1 ? "#87ceeb" : "#fff";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(meterX, meterY, meterWidth, meterHeight);

    // Charge level text
    if (chargePercentage >= 1) {
      ctx.fillStyle = "#fff";
      ctx.font = "10px Arial";
      ctx.textAlign = "center";
      ctx.fillText("⚡READY⚡", player.x + player.width / 2, meterY - 3);
    }

    ctx.restore();

    ctx.restore();
  }

  function drawEnemies() {
    enemies.forEach((enemy) => {
      ctx.save();

      // Apply flipping based on enemy type and direction
      let shouldFlip = false;
      if (enemy.type === "tank" && enemy.direction === 1) {
        // Tank coming from left should flip to face player
        shouldFlip = true;
      } else if (
        (enemy.type === "fast" || enemy.type === "mini") &&
        enemy.direction === -1
      ) {
        // Fast and mini enemies coming from right should flip to face player
        shouldFlip = true;
      }

      if (shouldFlip) {
        // Flip horizontally by scaling and translating
        ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
        ctx.scale(-1, 1);
        ctx.translate(
          -(enemy.x + enemy.width / 2),
          -(enemy.y + enemy.height / 2),
        );
      }

      // Draw enemy body with type-specific styling
      ctx.fillStyle = enemy.color;
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

      // Add type-specific visual indicators
      if (enemy.type === "fast") {
        // Speed lines - trail behind the enemy based on direction
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let j = 0; j < 3; j++) {
          // If enemy is going right (direction 1), lines go to the left (behind)
          // If enemy is going left (direction -1), lines go to the right (behind)
          const startX =
            enemy.direction === 1 ? enemy.x - 5 : enemy.x + enemy.width + 5;
          const endX =
            enemy.direction === 1 ? enemy.x - 15 : enemy.x + enemy.width + 15;
          ctx.moveTo(startX, enemy.y + 10 + j * 10);
          ctx.lineTo(endX, enemy.y + 10 + j * 10);
        }
        ctx.stroke();
      } else if (enemy.type === "tank") {
        // Armor plating
        ctx.strokeStyle = "#7f8c8d";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          enemy.x + 5,
          enemy.y + 5,
          enemy.width - 10,
          enemy.height - 10,
        );
      } else if (enemy.type === "jumper") {
        // Spring coils on legs
        ctx.strokeStyle = "#27ae60";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(enemy.x + 10, enemy.y + enemy.height - 10, 5, 0, Math.PI * 2);
        ctx.arc(
          enemy.x + enemy.width - 10,
          enemy.y + enemy.height - 10,
          5,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      } else if (enemy.type === "mini") {
        // Sparkles around mini enemies
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        for (let j = 0; j < 3; j++) {
          const sparkleX = enemy.x + Math.random() * enemy.width;
          const sparkleY = enemy.y + Math.random() * enemy.height;
          ctx.beginPath();
          ctx.arc(sparkleX, sparkleY, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Visual indicator for jump cooldown
      if (
        !enemy.isJumping &&
        enemy.jumpCooldown < enemy.maxJumpCooldown * 0.3
      ) {
        // Draw a small indicator that the enemy is about to jump
        ctx.fillStyle = "yellow";
        ctx.beginPath();
        ctx.arc(enemy.x + enemy.width / 2, enemy.y - 10, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw face (works with flipped coordinate system)
      ctx.fillStyle = "#000";
      // Angry eyes - positions adjusted for potential flipping
      const eyeOffset1 = shouldFlip ? enemy.width - 16 : 8;
      const eyeOffset2 = shouldFlip ? enemy.width - 32 : 24;
      ctx.fillRect(enemy.x + eyeOffset1, enemy.y + 12, 8, 8);
      ctx.fillRect(enemy.x + eyeOffset2, enemy.y + 12, 8, 8);

      // Mouth - adjusted for flipping
      const mouthOffset1 = shouldFlip ? enemy.width - 10 : 10;
      const mouthOffset2 = shouldFlip ? enemy.width - 20 : 20;
      const mouthOffset3 = shouldFlip ? enemy.width - 30 : 30;
      ctx.beginPath();
      ctx.moveTo(enemy.x + mouthOffset1, enemy.y + 35);
      ctx.lineTo(enemy.x + mouthOffset2, enemy.y + 40);
      ctx.lineTo(enemy.x + mouthOffset3, enemy.y + 35);
      ctx.lineWidth = 2;
      ctx.stroke();

      // Health bar
      const healthPercentage = enemy.health / enemy.maxHealth;
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(enemy.x, enemy.y - 15, enemy.width * healthPercentage, 5);
      ctx.strokeStyle = "#fff";
      ctx.strokeRect(enemy.x, enemy.y - 15, enemy.width, 5);

      ctx.restore();
    });
  }

  function drawCoins() {
    coins3D.forEach((coin) => {
      ctx.save();
      ctx.translate(coin.x, coin.y);
      ctx.rotate(coin.rotation);

      // Draw 3D coin effect
      // Outer circle
      ctx.fillStyle = coin.color;
      ctx.beginPath();
      ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
      ctx.fill();

      // Inner circle (gives 3D effect)
      ctx.fillStyle = "#f1c40f";
      ctx.beginPath();
      ctx.arc(0, 0, coin.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Dollar sign
      ctx.fillStyle = "#fff";
      ctx.font = "15px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", 0, 0);

      // Draw magnetic effect if attracted
      if (coin.attracted) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, coin.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  function drawDeathAnimations() {
    deathAnimations.forEach((anim) => {
      anim.particles.forEach((particle) => {
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);

        ctx.fillStyle = particle.color;

        // Special rendering for electrocution sparks
        if (particle.spark && anim.electrocution) {
          // Draw sparkling effect
          ctx.shadowColor = particle.color;
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
          ctx.fill();

          // Add cross-shaped spark
          ctx.lineWidth = 2;
          ctx.strokeStyle = particle.color;
          ctx.beginPath();
          ctx.moveTo(-particle.size, 0);
          ctx.lineTo(particle.size, 0);
          ctx.moveTo(0, -particle.size);
          ctx.lineTo(0, particle.size);
          ctx.stroke();
        } else {
          // Regular death particles
          ctx.fillRect(
            -particle.size / 2,
            -particle.size / 2,
            particle.size,
            particle.size,
          );
        }

        ctx.restore();
      });
    });
  }

  function drawGraveAnimations() {
    graveAnimations.forEach((grave) => {
      ctx.save();
      ctx.globalAlpha = grave.alpha;

      // Draw the grave
      // Tombstone
      ctx.fillStyle = "#7f8c8d";
      ctx.fillRect(
        grave.x,
        grave.y + grave.yOffset,
        grave.width,
        grave.height - 10,
      );

      // Rounded top
      ctx.beginPath();
      ctx.arc(
        grave.x + grave.width / 2,
        grave.y + grave.yOffset,
        grave.width / 2,
        Math.PI,
        2 * Math.PI,
      );
      ctx.fill();

      // Cross or RIP text
      ctx.fillStyle = "#34495e";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        "RIP",
        grave.x + grave.width / 2,
        grave.y + grave.yOffset + 15,
      );

      // Dirt mound at base
      ctx.fillStyle = "#795548";
      ctx.beginPath();
      ctx.ellipse(
        grave.x + grave.width / 2,
        grave.y + grave.height + grave.yOffset,
        grave.width / 1.5,
        10,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      ctx.restore();
    });
  }

  // Player death animation functions
  function startPlayerDeathAnimation() {
    player.isDead = true;
    player.deathAnimation.active = true;
    player.deathAnimation.timer = 0;

    // Create death particles - increased quantity and variety
    for (let i = 0; i < 40; i++) {
      // Doubled the number of particles
      // Add color variation for blood particles
      const bloodColors = [
        "#e74c3c",
        "#c0392b",
        "#a93226",
        "#922b21",
        "#7b241c",
      ];
      const randomBloodColor =
        bloodColors[Math.floor(Math.random() * bloodColors.length)];

      player.deathAnimation.particles.push({
        x: player.x + Math.random() * player.width,
        y: player.y + Math.random() * player.height,
        vx: (Math.random() - 0.5) * 12, // Increased spread
        vy: (Math.random() - 0.5) * 12, // Increased spread
        size: Math.random() * 15 + 5,
        color: randomBloodColor, // Use varied blood colors
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
      });
    }

    // Create a grave at the player's position
    createGraveAnimation(player.x, player.y);

    // Show death screen after a delay
    setTimeout(() => {
      isPaused = true;
      deathScreen.style.display = "block";
      overlay.style.display = "block";
    }, 2000);
  }

  function updatePlayerDeathAnimation() {
    if (!player.deathAnimation.active) return;

    player.deathAnimation.timer++;

    // Update particles
    player.deathAnimation.particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.1; // Gravity
      particle.alpha =
        1 - player.deathAnimation.timer / player.deathAnimation.maxTime;
      particle.size *= 0.97;
    });

    // End animation when timer is up
    if (player.deathAnimation.timer >= player.deathAnimation.maxTime) {
      player.deathAnimation.active = false;
    }
  }

  function drawPlayerDeathAnimation() {
    if (!player.deathAnimation.active) return;

    // Don't draw the player when dead, only particles
    player.deathAnimation.particles.forEach((particle) => {
      ctx.save();
      ctx.globalAlpha = particle.alpha;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);

      ctx.fillStyle = particle.color;
      ctx.fillRect(
        -particle.size / 2,
        -particle.size / 2,
        particle.size,
        particle.size,
      );

      ctx.restore();
    });

    // Draw game over text
    if (player.deathAnimation.timer > 30) {
      ctx.save();
      ctx.fillStyle =
        "rgba(255, 0, 0, " +
        Math.min(1, (player.deathAnimation.timer - 30) / 60) +
        ")";
      ctx.font = "48px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
      ctx.restore();
    }
  }

  // Make sure gameLoop is defined and called
  // Function to create damage indicators
  function createDamageIndicator(x, y, damage) {
    damageIndicators.push({
      x: x,
      y: y,
      value: damage,
      timer: 0,
      maxTime: 60, // 1 second at 60fps
      color: damage >= 15 ? "#ff0000" : "#ffffff", // Red for high damage, white for normal
      size: 12 + Math.min(damage, 20) / 2, // Size scales with damage
    });
  }

  // Function to update damage indicators
  function updateDamageIndicators() {
    for (let i = damageIndicators.length - 1; i >= 0; i--) {
      const indicator = damageIndicators[i];
      indicator.timer++;
      indicator.y -= 1; // Float upward

      // Remove when timer expires
      if (indicator.timer >= indicator.maxTime) {
        damageIndicators.splice(i, 1);
      }
    }
  }

  // Function to draw damage indicators
  function drawDamageIndicators() {
    damageIndicators.forEach((indicator) => {
      ctx.save();

      // Calculate alpha based on timer
      const alpha = 1 - indicator.timer / indicator.maxTime;

      // Draw damage text
      ctx.fillStyle = indicator.color;
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${indicator.size}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(indicator.value.toString(), indicator.x, indicator.y);

      ctx.restore();
    });
  }

  // Function to handle round transitions
  function startRoundTransition() {
    isRoundTransition = true;
    roundTransitionTimer = 0;
    currentRound++;
    enemiesRemaining = 8 + (currentRound - 1) * 3; // More enemies each round, ramped up

    // Reset progress bar during round transition
    document.getElementById("roundProgressBar").style.width = "0%";
  }

  // Create blood splatter effect
  function createBloodSplatter(x, y, damage) {
    const particleCount = Math.min(damage * 2, 30); // More particles for higher damage
    const bloodColors = ["#8b0000", "#a0000a", "#b22222", "#dc143c", "#ff0000"];

    for (let i = 0; i < particleCount; i++) {
      bloodParticles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 8 - 2,
        size: Math.random() * 6 + 2,
        color: bloodColors[Math.floor(Math.random() * bloodColors.length)],
        alpha: 1,
        life: 0,
        maxLife: 40 + Math.random() * 20,
        gravity: 0.2,
      });
    }
  }

  // Update blood particles
  function updateBloodParticles() {
    for (let i = bloodParticles.length - 1; i >= 0; i--) {
      const particle = bloodParticles[i];

      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += particle.gravity;
      particle.life++;
      particle.alpha = 1 - particle.life / particle.maxLife;
      particle.size *= 0.99;

      // Remove dead particles
      if (particle.life >= particle.maxLife) {
        bloodParticles.splice(i, 1);
      }
    }
  }

  // Draw blood particles
  function drawBloodParticles() {
    bloodParticles.forEach((particle) => {
      ctx.save();
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // Screen shake functions
  function createScreenShake(intensity, duration) {
    if (screenShake.intensity < intensity) {
      screenShake.intensity = intensity;
      screenShake.duration = duration;
    }
  }

  function updateScreenShake() {
    if (screenShake.duration > 0) {
      screenShake.x = (Math.random() - 0.5) * screenShake.intensity;
      screenShake.y = (Math.random() - 0.5) * screenShake.intensity;
      screenShake.duration--;
      screenShake.intensity *= 0.9;
    } else {
      screenShake.x = 0;
      screenShake.y = 0;
      screenShake.intensity = 0;
    }
  }

  // Function to start the next round manually
  function startNextRound() {
    // Only allow starting a new round if not in transition and current round is complete
    if (!isRoundTransition && enemies.length === 0 && enemiesRemaining === 0) {
      startRoundTransition();
    }
  }

  // Function to update round transition
  function updateRoundTransition() {
    if (!isRoundTransition) return;

    roundTransitionTimer++;

    if (roundTransitionTimer >= roundTransitionDuration) {
      isRoundTransition = false;
    }
  }

  // Function to draw round transition
  function drawRoundTransition() {
    if (!isRoundTransition) return;

    ctx.save();

    // Background overlay
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.7, roundTransitionTimer / 30)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Round text
    ctx.fillStyle = "#ffffff";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Fade in and out effect
    let alpha = 1;
    if (roundTransitionTimer < 30) {
      alpha = roundTransitionTimer / 30;
    } else if (roundTransitionTimer > roundTransitionDuration - 30) {
      alpha = (roundTransitionDuration - roundTransitionTimer) / 30;
    }

    ctx.globalAlpha = alpha;
    ctx.fillText(`ROUND ${currentRound}`, canvas.width / 2, canvas.height / 2);

    ctx.restore();
  }

  function gameLoop() {
    // Always draw the background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply screen shake
    ctx.save();
    ctx.translate(screenShake.x, screenShake.y);

    drawBackground();

    if (gameStarted && !isPaused && !isShopOpen) {
      // Draw other game elements
      drawGraveAnimations(); // Draw graves behind other elements
      drawJumpParticles(); // Draw jump particles
      drawBloodParticles(); // Draw blood particles
      drawCoins();
      drawDeathAnimations();
      drawPlayer();
      drawPlayerDeathAnimation();
      drawEnemies();
      drawLightningEffects(); // Draw lightning effects
      drawDamageIndicators(); // Draw damage numbers

      // Update game state
      updatePlayer();
      updatePlayerDeathAnimation();
      updateEnemies();
      updateCoins();
      updateDeathAnimations();
      updateGraveAnimations(); // Update grave animations
      updateDamageIndicators(); // Update damage indicators
      updateRoundTransition(); // Update round transition
      updateJumpParticles(); // Update jump particles
      updateBloodParticles(); // Update blood particles
      updateBlinkAnimation(); // Update blink animation
      updateLightningEffects(); // Update lightning effects
      updateScreenShake(); // Update screen shake

      // Draw round transition overlay (if active)
      drawRoundTransition();
    }

    // Restore screen shake transform
    ctx.restore();

    // Continue game loop regardless of game state
    requestAnimationFrame(gameLoop);
  }

  // Background animation variables
  let backgroundTime = 0;
  const clouds = [];

  // Initialize clouds
  for (let i = 0; i < 5; i++) {
    clouds.push({
      x: Math.random() * canvas.width,
      y: 50 + Math.random() * 100,
      width: 60 + Math.random() * 40,
      height: 30 + Math.random() * 20,
      speed: 0.2 + Math.random() * 0.3,
      opacity: 0.6 + Math.random() * 0.3,
    });
  }

  // Define an animated background function
  function drawBackground() {
    backgroundTime += 0.01;

    // Animated sky with gradient that shifts slightly over time
    const skyGradient = ctx.createLinearGradient(0, 0, 0, ground);
    skyGradient.addColorStop(
      0,
      `hsl(${180 + Math.sin(backgroundTime) * 10}, 70%, 60%)`,
    );
    skyGradient.addColorStop(
      1,
      `hsl(${210 + Math.sin(backgroundTime * 0.5) * 5}, 70%, 50%)`,
    );
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, ground);

    // Draw animated clouds
    ctx.fillStyle = "#ffffff";
    clouds.forEach((cloud) => {
      // Move cloud
      cloud.x += cloud.speed;
      if (cloud.x > canvas.width + cloud.width) {
        cloud.x = -cloud.width;
        cloud.y = 50 + Math.random() * 100;
      }

      // Draw cloud with rounded shape
      ctx.save();
      ctx.globalAlpha = cloud.opacity;
      ctx.beginPath();
      ctx.ellipse(
        cloud.x,
        cloud.y,
        cloud.width / 2,
        cloud.height / 2,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(
        cloud.x + cloud.width * 0.3,
        cloud.y - cloud.height * 0.2,
        cloud.width / 3,
        cloud.height / 2,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(
        cloud.x - cloud.width * 0.2,
        cloud.y - cloud.height * 0.1,
        cloud.width / 4,
        cloud.height / 3,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();
    });

    // Ground with stylized grass texture that sways slightly
    ctx.fillStyle = "#2ecc71";
    ctx.fillRect(0, ground, canvas.width, canvas.height - ground);

    // Add animated grass details
    ctx.fillStyle = "#27ae60";

    // Draw grass tufts with slight animation
    for (let x = 0; x < canvas.width; x += 15) {
      const height = 5 + Math.random() * 8;
      const sway = Math.sin(backgroundTime * 2 + x * 0.05) * 2;

      ctx.beginPath();
      ctx.moveTo(x, ground);
      ctx.lineTo(x + sway + 4, ground - height);
      ctx.lineTo(x + 8, ground);
      ctx.fill();
    }
  }

  // Function to start the game
  function startGame() {
    gameStarted = true;
    currentRound = 1;
    enemiesRemaining = 8;

    // Clear all UI states and start fresh
    clearAllUIStates();

    // Reset progress bar
    document.getElementById("roundProgressBar").style.width = "0%";
  }

  // Initialize game
  if (coinsElement) {
    coinsElement.textContent = coins;
  }

  // Purchase particle effects
  function createPurchaseParticles(button) {
    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < 12; i++) {
      const particle = document.createElement("div");
      particle.style.position = "fixed";
      particle.style.left = centerX + "px";
      particle.style.top = centerY + "px";
      particle.style.width = "8px";
      particle.style.height = "8px";
      particle.style.background = "#f39c12";
      particle.style.borderRadius = "50%";
      particle.style.pointerEvents = "none";
      particle.style.zIndex = "9999";
      particle.innerHTML = "🪙";
      particle.style.fontSize = "8px";

      document.body.appendChild(particle);

      const angle = (i / 12) * Math.PI * 2;
      const distance = 50 + Math.random() * 30;
      const endX = centerX + Math.cos(angle) * distance;
      const endY = centerY + Math.sin(angle) * distance;

      particle.animate(
        [
          { transform: "translate(0, 0) scale(1)", opacity: 1 },
          {
            transform: `translate(${endX - centerX}px, ${endY - centerY}px) scale(0)`,
            opacity: 0,
          },
        ],
        {
          duration: 800,
          easing: "ease-out",
        },
      ).onfinish = () => particle.remove();
    }
  }

  function animateCoinCounter() {
    const coinElement = document.getElementById("coins");
    coinElement.style.transform = "scale(1.2)";
    coinElement.style.color = "#f39c12";
    coinElement.style.textShadow = "0 0 10px #f39c12";

    setTimeout(() => {
      coinElement.style.transform = "scale(1)";
      coinElement.style.color = "white";
      coinElement.style.textShadow = "1px 1px 2px rgba(0, 0, 0, 0.5)";
    }, 300);
  }

  // Add shake animation keyframes to document
  const style = document.createElement("style");
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0) scale(1); }
      25% { transform: translateX(-5px) scale(0.95); }
      75% { transform: translateX(5px) scale(0.95); }
    }
  `;
  document.head.appendChild(style);

  // Initialize game with proper UI state
  clearAllUIStates();
  startMenu.style.display = "block";
  overlay.style.display = "block";

  // Start the game loop (will only render active elements when gameStarted is true)
  gameLoop();
}); // End of DOMContentLoaded event listener
