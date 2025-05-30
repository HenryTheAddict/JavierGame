
// Make sure the DOM is fully loaded before accessing elements
document.addEventListener('DOMContentLoaded', function() {
    // Game setup
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get canvas context!');
        return;
    }
    
    const scoreElement = document.getElementById('score');
    const coinsElement = document.getElementById('coins');
    const startRoundButton = document.getElementById('startRoundButton');
    
    // Game state
    let score = 0;
    let highScore = 0; // New global variable for high score
    let coins = 0;
    let isPaused = false;
    let isShopOpen = false;
    let gameStarted = false; // Track if game has started
    let lastDirection = 1; // 1 for right, -1 for left
    
    // Health regeneration system
    let lastDamageTime = 0;
    const healthRegenDelay = 300; // Changed from 360 (5 seconds)
    // const healthRegenAmount = 1; // Will be replaced by player.healthRegenRate
    
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
    
    // Screen Shake Variables
    let screenShakeMagnitude = 0;
    let screenShakeDuration = 0; // Total duration of the shake
    let screenShakeTimer = 0;    // Remaining time for the current shake

    // Particle array for punch impacts
    const impactParticles = [];

    // Boss Variables
    let boss = {};
    let bossActive = false;
    const bossSpawnRound = 3; // Spawn boss on round 3 for testing
    let bossProjectiles = [];
    const bossHealthContainer = document.getElementById('bossHealthContainer');
    const bossHealthBar = document.getElementById('bossHealthBar');
    const bossNameElement = document.getElementById('bossName'); // If you want to change name dynamically

    // Dynamic Background Variables
    let currentBackgroundSet = 0; // 0: Day, 1: Evening, 2: Night
    let prevBackgroundSet = 0; // Used for transition
    let backgroundTransitionTimer = 0;
    const backgroundTransitionDuration = 120; // 2 seconds (120 frames at 60fps)

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
        doubleJumpForce: 10, // Slightly less than initial jump
        velocity: { x: 0, y: 0 },
        isJumping: false,
        canDoubleJump: false,
        hasDoubleJumped: false,
        isPunching: false,
        punchDamage: 10,
        initialPunchDamage: 10, // To store base damage before temp boost
        health: 100,
        maxHealth: 100,
        healthRegenRate: 1, // Initial health regen rate
        tempDamageBoostActive: false,
        tempDamageBoostRounds: 0,
        color: '#e67e22', // Orange color for monkey (changed from brown)
        coinMagnetRange: 150, // Range for coin attraction
        isDead: false,
        hasTail: true, // Monkey has a tail
        idleTimer: 0, // For idle animation
        deathAnimation: {
            active: false,
            timer: 0,
            maxTime: 90,
            particles: []
        }
    };
    
    // Enemies
    const enemies = [];
    const enemySpawnRate = 150; // Changed from 180 (2.5 seconds)
    let enemyTimer = 0;
    
    // Enemy colors for variety
    const enemyColors = ['#e74c3c', '#9b59b6', '#2ecc71', '#f39c12', '#1abc9c'];
    const flyingEnemyColor = '#3498db'; // Blue for flying enemy
    
    // Death animations
    const deathAnimations = [];
    
    // Grave animations
    const graveAnimations = [];
    
    // Collectibles
    const coins3D = [];
    
    // UI Elements
    const pauseMenu = document.getElementById('pauseMenu');
    const shopMenu = document.getElementById('shopMenu');
    const startMenu = document.getElementById('startMenu');
    const deathScreen = document.getElementById('deathScreen');
    const overlay = document.getElementById('overlay');
    const resumeButton = document.getElementById('resumeButton');
    const restartButton = document.getElementById('restartButton');
    const deathRestartButton = document.getElementById('deathRestartButton');
    const closeShopButton = document.getElementById('closeShopButton');
    const startButton = document.getElementById('startButton');
    const shopButton = document.getElementById('shopButton');
    // const buyButtons = document.querySelectorAll('.buy-button'); // Moved to initializeShopButtons

    // Tutorial Elements and State
    let tutorialActive = false;
    let tutorialStep = 0;
    let tutorialMessages = [];
    const tutorialOverlayElement = document.getElementById('tutorialOverlay');
    const tutorialTextElement = document.getElementById('tutorialText');
    const tutorialNextButton = document.getElementById('tutorialNextButton');

    // Event listeners for UI
    resumeButton.addEventListener('click', togglePause);
    restartButton.addEventListener('click', restartGame);
    deathRestartButton.addEventListener('click', restartGame);
    closeShopButton.addEventListener('click', toggleShop);
    startButton.addEventListener('click', startGame);
    shopButton.addEventListener('click', toggleShop);
    
    // Remove the start round button functionality as we're auto-starting rounds
    startRoundButton.style.display = 'none';
    
    // Initialize shop buttons - This needs to be done after player object is defined.
    // We will call this function again if tempDamageBoost becomes available.
    function initializeShopButtons() {
        const allBuyButtons = document.querySelectorAll('.buy-button');
        allBuyButtons.forEach(button => {
            // Remove existing event listeners to prevent duplicates if called multiple times
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);

            newButton.addEventListener('click', () => {
                const item = newButton.getAttribute('data-item');
                const cost = parseInt(newButton.getAttribute('data-cost'));

                if (item === 'tempDamageBoost' && player.tempDamageBoostActive) {
                    newButton.textContent = 'Active!';
                    newButton.disabled = true;
                    return; // Don't allow re-purchase if already active
                }

                if (coins >= cost) {
                    coins -= cost;
                    upgradePlayer(item); // This function will handle disabling for temp items
                    coinsElement.textContent = coins;

                    if (item !== 'tempDamageBoost') { // Persistent upgrades
                        newButton.textContent = 'Purchased!';
                        newButton.disabled = true; // Disable after purchase for non-temporary items
                        // Optionally, re-enable after a delay for some items or never for others
                        // For now, permanent upgrades stay disabled.
                    }
                } else {
                    newButton.textContent = 'Not enough coins!';
                    setTimeout(() => {
                        // Check if button is not 'Active!' before resetting text
                        if (newButton.textContent === 'Not enough coins!') {
                           newButton.textContent = `Buy (${cost} coins)`;
                        }
                    }, 1000);
                }
            });
        });
    }

    // Initial call to setup shop buttons
    initializeShopButtons();

    // Tutorial Next Button Event Listener
    if(tutorialNextButton) { // Ensure button exists before adding listener
        tutorialNextButton.addEventListener('click', () => {
            tutorialStep++;
            showTutorialStep();
        });
    }
    
    // Keyboard controls
    const keys = {};
    
    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        
        // Pause game with Escape key
        if (e.key === 'Escape' && !isShopOpen) {
            togglePause();
        }
        
        // Open shop with S key
        if (e.key.toLowerCase() === 's' && !isPaused) {
            toggleShop();
        }
        
        // Punch with J key - faster attacking
        if (e.key.toLowerCase() === 'j' && !player.isPunching && !isPaused && !isShopOpen) {
            player.isPunching = true;
            setTimeout(() => {
                player.isPunching = false;
            }, 150); // Reduced from 300ms to 150ms for faster attacking
            
            // Check for enemy hits
            checkPunchHits();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });
    
    // Game functions
    function togglePause() {
        isPaused = !isPaused;
        pauseMenu.style.display = isPaused ? 'block' : 'none';
        // Ensure general overlay doesn't conflict with tutorial overlay if tutorial is also pausing
        if (!tutorialActive) {
            overlay.style.display = isPaused ? 'block' : 'none';
        }
    }
    
    function toggleShop() {
        isShopOpen = !isShopOpen;
        shopMenu.style.display = isShopOpen ? 'block' : 'none';
        // Ensure general overlay doesn't conflict with tutorial overlay
        if (!tutorialActive) {
            overlay.style.display = isShopOpen ? 'block' : 'none';
        }
        
        if (isShopOpen) {
            isPaused = true; // Shop always pauses game
        } else if (!tutorialActive) { // Only unpause if tutorial isn't the one keeping it paused
            isPaused = false;
        }
    }

    function initializeTutorialMessages() {
        tutorialMessages = [
            "Welcome, Monkey! Use A/D or Left/Right Arrows to Move.",
            "Press Space or Up Arrow to Jump. Press again in mid-air to Double Jump!",
            "Press J to Punch the Robots! Different robots may appear.",
            "Collect Coins dropped by robots to buy Upgrades in the Shop (S key).",
            "Survive the rounds and defeat all enemies. Good luck!"
        ];
    }

    function showTutorialStep() {
        if (tutorialActive && tutorialStep < tutorialMessages.length) {
            if(tutorialTextElement) tutorialTextElement.textContent = tutorialMessages[tutorialStep];
            if(tutorialOverlayElement) tutorialOverlayElement.style.display = 'block';
            if(overlay) overlay.style.display = 'block'; // Use general overlay for dimming
            isPaused = true; // Pause game for tutorial
        } else {
            hideTutorial();
        }
    }

    function hideTutorial() {
        if(tutorialOverlayElement) tutorialOverlayElement.style.display = 'none';
        // Only hide general overlay if shop is not also open
        if(overlay && !isShopOpen && !isPaused) overlay.style.display = 'none';
        // If game was paused only for tutorial, unpause it.
        // If it was paused for other reasons (e.g. manual pause), this check might need refinement.
        // For now, if tutorial is hidden, we assume game can resume if not otherwise paused.
        isPaused = false; // This might conflict if player paused then tutorial ended.
                         // Better: only set isPaused to false if it was true *because* of the tutorial.
                         // This needs a more nuanced state management or check if other pause reasons exist.
                         // For this task, we'll keep it simple: hiding tutorial unpauses if no other menu is open.
        if (isShopOpen || (pauseMenu && pauseMenu.style.display === 'block')) {
            isPaused = true; // Re-assert pause if another menu is active
        } else {
            isPaused = false;
        }
        tutorialActive = false;
        // localStorage.setItem('tutorialCompleted', 'true'); // Optional: to not show again
    }
    
    function restartGame() {
        score = 0;
        scoreElement.textContent = score;
        coins = 0;
        coinsElement.textContent = coins;
        
        // Reset round system
        currentRound = 1;
        enemiesRemaining = 5;
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
        
        // Show start menu again
        gameStarted = false;
        isPaused = false;
        pauseMenu.style.display = 'none';
        deathScreen.style.display = 'none';
        startMenu.style.display = 'block';
        overlay.style.display = 'block';
        // Hide the start round button
        startRoundButton.style.display = 'none';
    }
    
    function upgradePlayer(item) {
        switch(item) {
            case 'strength':
                player.punchDamage += 4; // Changed from +3
                player.initialPunchDamage += 4; // Also update initial
                break;
            case 'speed':
                player.speed *= 1.08; // Changed from 1.1 (8% increase)
                break;
            case 'health':
                player.maxHealth += 25; // Changed from +20
                player.health += 25;    // Changed from +20
                break;
            case 'coinMagnet':
                player.coinMagnetRange += 75; // Changed from +50
                break;
            case 'healthRegen':
                player.healthRegenRate += 0.75; // Changed from +0.5
                break;
            case 'tempDamageBoost':
                player.tempDamageBoostActive = true;
                player.tempDamageBoostRounds = 1; // Lasts for one round
                player.punchDamage = player.initialPunchDamage * 2; // Apply boost
                // Disable the button and mark as active
                const tempBoostButton = document.querySelector('button[data-item="tempDamageBoost"]');
                if (tempBoostButton) {
                    tempBoostButton.textContent = 'Active!';
                    tempBoostButton.disabled = true;
                }
                break;
        }
    }
    
    function spawnEnemy() {
        // Only spawn if we have enemies remaining in this round
        if (enemiesRemaining <= 0) return;
        
        enemiesRemaining--;
        
        const spawnFromLeft = Math.random() > 0.5;
        
        // Determine if spawning a flying enemy
        const flyingSpawnChance = 0.2 + currentRound * 0.05; // Starts at 20% in round 1, increases
        const spawnFlyingEnemy = currentRound > 1 && Math.random() < flyingSpawnChance;

        if (spawnFlyingEnemy) {
            const flyingEnemy = {
                type: 'flying',
                x: spawnFromLeft ? -50 : canvas.width + 50,
                y: 100 + Math.random() * 150, // Spawn higher up
                width: 60,
                height: 40,
                speed: 1.5 + Math.random() * 0.5 + currentRound * 0.05, // Adjusted speed scaling
                health: 12 + (currentRound - 1) * 3, // Adjusted health scaling
                maxHealth: 12 + (currentRound - 1) * 3, // Adjusted health scaling
                color: flyingEnemyColor,
                attackType: 'swoop', // Or 'projectile'
                sprite: null, // For later sprite integration
                aggroRange: 400,
                isSwooping: false,
                swoopTargetY: 0,
                swoopSpeedY: 5,
                initialY: 100 + Math.random() * 150, // Store initial Y for sinusoidal movement
                movementPattern: Math.random() < 0.5 ? 'horizontal' : 'sinusoidal', // Add variety
                direction: spawnFromLeft ? 1 : -1,
                // Flying enemies don't use gravity or jumping like ground enemies
                velocity: { x: 0, y: 0 }, // For movement control
            };
            enemies.push(flyingEnemy);
        } else {
            // Choose a random color from the enemyColors array
            const randomColor = enemyColors[Math.floor(Math.random() * enemyColors.length)];
            // Random jump cooldown between 2-5 seconds (120-300 frames at 60fps)
            const randomJumpCooldown = 120 + Math.floor(Math.random() * 180);

            const groundEnemy = {
                type: 'ground', // Default to ground
                x: spawnFromLeft ? -50 : canvas.width + 50, // Spawn from left or right
                y: ground - 50,
                width: 40,
                height: 50,
                speed: 1 + Math.random() * 1.5 * (1 + currentRound * 0.06), // Adjusted speed scaling
                health: 15 + (currentRound - 1) * 4, // Adjusted health scaling
                maxHealth: 15 + (currentRound - 1) * 4, // Adjusted health scaling
                color: randomColor,
                velocity: { x: 0, y: 0 }, // Add velocity for jumping
                isJumping: false,
                jumpForce: 8 + Math.random() * 4, // Random jump height
                jumpCooldown: randomJumpCooldown, // Random cooldown between 2-5 seconds
                maxJumpCooldown: randomJumpCooldown, // Store the max cooldown for resetting
                direction: spawnFromLeft ? 1 : -1 // Direction: 1 for right, -1 for left
            };
            enemies.push(groundEnemy);
        }
    }
    
    function createDeathAnimation(x, y) {
        const particles = [];
        const particleCount = 45; // Increased from 30
        
        // Blood color variations
        const bloodColors = ['#e74c3c', '#c0392b', '#a93226', '#922b21', '#7b241c'];
        
        for (let i = 0; i < particleCount; i++) {
            const randomBloodColor = bloodColors[Math.floor(Math.random() * bloodColors.length)];
            const isChunk = Math.random() < 0.1; // 10% chance of being a larger chunk
            
            particles.push({
                x: x + Math.random() * 40 - 20, // Centered around enemy
                y: y + Math.random() * 50 - 25, // Centered around enemy
                vx: (Math.random() - 0.5) * (isChunk ? 6 : 12), // Chunks are slower, normal more spread
                vy: (Math.random() - 0.5) * (isChunk ? 4 : 10) - (isChunk ? 1 : 3), // Chunks less upward, normal more upward
                size: isChunk ? (Math.random() * 10 + 10) : (Math.random() * 8 + 4), // Chunks are larger
                color: randomBloodColor,
                alpha: 1,
                rotation: Math.random() * Math.PI * 2,
                life: 0,
                maxLife: isChunk ? 90 : 60 // Chunks last longer
            });
        }
        
        deathAnimations.push({
            particles,
            timer: 0,
            maxTime: 60
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
            color: '#f39c12',
            vx: 0,
            vy: 0,
            attracted: false
        };
        
        coins3D.push(coin);
    }
    
    function checkPunchHits() {
        const punchRange = 90; // Longer arm
        const punchVerticalRange = player.height + 30; // How high/low the punch can reach
        const punchDirection = lastDirection;
        
        // Handle hits on normal enemies if boss is not active
        if (!bossActive) {
            enemies.forEach((enemy, index) => {
                let hit = false;
                let proximityFactor = 0;
                let currentDamage = player.punchDamage;

                const punchHitboxY = player.y - 15;
                const punchHitbox = {
                    x: punchDirection > 0 ? player.x + player.width : player.x - punchRange,
                    y: punchHitboxY,
                    width: punchRange,
                    height: punchVerticalRange
                };

                if (punchHitbox.x < enemy.x + enemy.width &&
                    punchHitbox.x + punchHitbox.width > enemy.x &&
                    punchHitbox.y < enemy.y + enemy.height &&
                    punchHitbox.y + punchHitbox.height > enemy.y) {
                    hit = true;
                    if (punchDirection > 0) {
                        const distance = Math.max(0, enemy.x - (player.x + player.width));
                        proximityFactor = 1 - (distance / punchRange);
                    } else {
                        const distance = Math.max(0, (player.x - punchRange) - (enemy.x + enemy.width - punchRange));
                        proximityFactor = 1 - (distance / punchRange);
                    }
                    proximityFactor = Math.max(0, Math.min(proximityFactor, 1));
                    currentDamage = Math.ceil(currentDamage * (1 + proximityFactor * 0.5));
                }

                if (hit) {
                    enemy.health -= currentDamage;
                    const originalColor = enemy.type === 'flying' ? flyingEnemyColor : (enemy.originalColor || enemyColors[0]);
                    if (!enemy.originalColor && enemy.type !== 'flying') {
                        enemy.originalColor = enemy.color;
                    }
                    enemy.color = '#ff0000';
                    setTimeout(() => {
                        if (enemies.includes(enemy)) {
                            enemy.color = originalColor;
                        }
                    }, 100);
                    
                    createDamageIndicator(enemy.x + enemy.width/2, enemy.y, currentDamage);
                    createPunchImpactParticles(punchHitbox.x + (punchDirection > 0 ? punchHitbox.width -10 : 10) , enemy.y + enemy.height / 2, punchDirection);

                    if (enemy.health <= 0) {
                        score += (enemy.type === 'flying' ? 15 : 10);
                        scoreElement.textContent = score;
                        coins += (enemy.type === 'flying' ? 2 : 1);
                        coinsElement.textContent = coins;
                        triggerScreenShake(3, 10);
                        createDeathAnimation(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                        const extraCoinsFromProximity = Math.floor(proximityFactor * 2);
                        for (let k = 0; k < extraCoinsFromProximity; k++) {
                            spawnCoinAtPosition(enemy.x + enemy.width/2 + (Math.random()-0.5)*20, enemy.y + enemy.height/2 + (Math.random()-0.5)*20);
                        }
                        enemies.splice(index, 1);
                    }
                }
            });
        }

        // Handle hits on Boss
        if (bossActive && boss.vulnerable && Object.keys(boss).length > 0) {
            let hit = false;
            // Proximity factor not really used for boss, simple damage application
            let currentDamage = player.punchDamage; // This already includes temp boosts

            const punchHitboxY = player.y - 15; // Start punch slightly above player's feet
            const punchHitbox = {
                x: punchDirection > 0 ? player.x + player.width : player.x - punchRange,
                y: punchHitboxY,
                width: punchRange,
                height: punchVerticalRange
            };

            // Check for overlap between punchHitbox and enemy bounding box
            if (punchHitbox.x < enemy.x + enemy.width &&
                punchHitbox.x + punchHitbox.width > enemy.x &&
                punchHitbox.y < enemy.y + enemy.height &&
                punchHitbox.y + punchHitbox.height > enemy.y) {
                hit = true;

                // Calculate proximity for damage scaling (more effective at closer range)
                if (punchDirection > 0) { // Punching right
                    // Distance from the end of player's normal reach to the enemy's left side
                    const distance = Math.max(0, enemy.x - (player.x + player.width));
                    proximityFactor = 1 - (distance / punchRange);
                } else { // Punching left
                    // Distance from player's left side to the enemy's right side (after punch extension)
                    const distance = Math.max(0, (player.x - punchRange) - (enemy.x + enemy.width - punchRange));
                    proximityFactor = 1 - (distance / punchRange);
                }
                // Ensure proximityFactor is between 0 and 1
                proximityFactor = Math.max(0, Math.min(proximityFactor, 1));
                // Apply proximity bonus to the currentDamage (which might already be boosted)
                currentDamage = Math.ceil(currentDamage * (1 + proximityFactor * 0.5));
            }

            if (hit) {
                enemy.health -= currentDamage;

                const originalColor = enemy.type === 'flying' ? flyingEnemyColor : (enemy.originalColor || enemyColors[0]); // Fallback if originalColor not set
                if (!enemy.originalColor && enemy.type !== 'flying') { // Store original color for ground enemies if not already set
                    enemy.originalColor = enemy.color;
                }

                enemy.color = '#ff0000'; // Hit flash color
                setTimeout(() => {
                    if (enemies.includes(enemy)) { // Check if enemy still exists
                        enemy.color = originalColor;
                    }
                }, 100);

                createDamageIndicator(enemy.x + enemy.width/2, enemy.y, currentDamage);
                createPunchImpactParticles(punchHitbox.x + (punchDirection > 0 ? punchHitbox.width -10 : 10) , enemy.y + enemy.height / 2, punchDirection);

                if (enemy.health <= 0) {
                    score += (enemy.type === 'flying' ? 15 : 10);
                    scoreElement.textContent = score;
                    updateHighScore(); // Update high score when score changes
                    
                    // Add base coins for defeating enemy
                    coins += (enemy.type === 'flying' ? 2 : 1);
                    coinsElement.textContent = coins;

                    triggerScreenShake(3, 10);
                    createDeathAnimation(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                    
                    // Spawn additional coins based on proximity (proximityFactor is 0 to 1)
                    const extraCoinsFromProximity = Math.floor(proximityFactor * 2);
                    for (let k = 0; k < extraCoinsFromProximity; k++) {
                        // Spawn extra coins slightly offset for visual variety
                        spawnCoinAtPosition(enemy.x + enemy.width/2 + (Math.random()-0.5)*20, enemy.y + enemy.height/2 + (Math.random()-0.5)*20);
                    }

            const punchHitboxY = player.y - 15;
            const punchHitbox = {
                x: punchDirection > 0 ? player.x + player.width : player.x - punchRange,
                y: punchHitboxY,
                width: punchRange,
                height: punchVerticalRange
            };

            if (punchHitbox.x < boss.x + boss.width &&
                punchHitbox.x + punchHitbox.width > boss.x &&
                punchHitbox.y < boss.y + boss.height &&
                punchHitbox.y + punchHitbox.height > boss.y) {
                hit = true;
                // Proximity factor could be calculated similarly if desired for boss
            }

            if (hit) {
                boss.health -= currentDamage;
                triggerScreenShake(2, 8); // Smaller shake for hitting boss
                createDamageIndicator(boss.x + boss.width / 2, boss.y + boss.height / 2, currentDamage);

                // Visual feedback for boss hit (e.g., flash color)
                const originalBossColor = boss.color;
                boss.color = '#ff0000'; // Flash red
                setTimeout(() => {
                     if(bossActive && boss) boss.color = originalBossColor; // Check boss still exists
                }, 100);


                if (boss.health <= 0) {
                    bossActive = false; // Boss is defeated
                    triggerScreenShake(10, 30); // Large shake for boss defeat
                    // TODO: Boss death animation, score, coins etc.
                    // For now, give a large coin and score bonus
                    coins += 100;
                    score += 500;
                    coinsElement.textContent = coins;
                    scoreElement.textContent = score;
                    updateHighScore(); // Update high score after boss defeat score

                    if(bossHealthContainer) bossHealthContainer.style.display = 'none';
                    document.getElementById('roundProgressContainer').style.display = 'block'; // Show round progress again

                    // To prevent immediate re-spawn if bossSpawnRound is met again by currentRound incrementing
                    // We can set a flag or simply advance currentRound again if needed, or ensure startRoundTransition handles this
                    // For now, let's assume defeating the boss means you go to the "next" logical round.
                    // The existing startRoundTransition will increment currentRound.
                    startRoundTransition();
                }
            }
        }
    }
    
    function collectCoins() {
        for (let i = coins3D.length - 1; i >= 0; i--) {
            const coin = coins3D[i];
            const dx = player.x + player.width/2 - coin.x;
            const dy = player.y + player.height/2 - coin.y;
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
            if (distance < player.width/2 + coin.radius) {
                coins++;
                coinsElement.textContent = coins;
                coins3D.splice(i, 1);
            }
        }
    }
    
    function updatePlayer() {
        // Horizontal movement
        player.velocity.x = 0;
        
        if (keys['a'] || keys['arrowleft']) {
            player.velocity.x = -player.speed;
            lastDirection = -1;
        }
        
        if (keys['d'] || keys['arrowright']) {
            player.velocity.x = player.speed;
            lastDirection = 1;
        }
        
        // Jumping
        if (keys[' '] || keys['arrowup']) {
            if (!player.isJumping) { // First jump (from ground)
                player.velocity.y = -player.jumpForce;
                player.isJumping = true;
                player.canDoubleJump = true;
                player.hasDoubleJumped = false;
                createJumpParticles(player.x, player.y + player.height);
            } else if (player.canDoubleJump && !player.hasDoubleJumped) { // Double jump
                player.velocity.y = -player.doubleJumpForce;
                player.hasDoubleJumped = true;
                // Optional: Create different particles for double jump
                createJumpParticles(player.x, player.y + player.height, true); // Pass a flag for double jump particles
            }
            // Prevent further jump input processing for this frame by consuming the key
            // This is a simple way to avoid triple+ jumps if key is held.
            // A more robust solution might involve a short cooldown on jump input after a double jump.
            keys[' '] = false;
            keys['arrowup'] = false;
        }
        
        // Apply gravity
        player.velocity.y += gravity;
        
        // Update position
        player.x += player.velocity.x;
        player.y += player.velocity.y;

        // Idle timer update
        if (player.velocity.x === 0 && player.velocity.y === gravity && !player.isJumping) { // Check if on ground and y velocity is just gravity
            player.idleTimer++;
        } else {
            player.idleTimer = 0;
        }
        
        // Ground collision
        if (player.y > ground - player.height) {
            player.y = ground - player.height;
            player.velocity.y = 0;
            
            // Create landing particles if the player was falling with some velocity
            if (player.isJumping) { // isJumping is true if player was in air
                const fallSpeed = player.velocity.y; // Check speed before it's reset
                createLandingParticles(player.x, player.y + player.height);
                player.isJumping = false;
                player.canDoubleJump = false;
                player.hasDoubleJumped = false;
                if (fallSpeed > 10) { // Trigger shake only on hard landings
                    triggerScreenShake(Math.min(fallSpeed / 5, 4), 8); // Max magnitude 4
                }
            }
        }
        
        // Screen boundaries
        if (player.x < 0) player.x = 0;
        if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
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
            const totalEnemiesForRound = 4 + Math.floor(currentRound * 1.5); // Use Math.floor for integer
            const enemiesDefeated = totalEnemiesForRound - enemiesRemaining - enemies.length;
            const progressPercentage = totalEnemiesForRound > 0 ? (enemiesDefeated / totalEnemiesForRound) * 100 : 0;
            document.getElementById('roundProgressBar').style.width = `${progressPercentage}%`;
            
            // Check if round is complete
            if (enemies.length === 0 && enemiesRemaining === 0) {
                // Automatically start the next round instead of showing the button
                startRoundTransition();
            }
        }
        
        // Update existing enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            
            const enemy = enemies[i];
            
            if (enemy.type === 'flying') {
                // Flying enemy logic
                const dxToPlayer = player.x - enemy.x;
                const dyToPlayer = player.y - enemy.y;
                const distanceToPlayer = Math.sqrt(dxToPlayer * dxToPlayer + dyToPlayer * dyToPlayer);

                // Aggro and Swoop Attack
                if (distanceToPlayer < enemy.aggroRange && !enemy.isSwooping) {
                    if (enemy.attackType === 'swoop') {
                        enemy.isSwooping = true;
                        enemy.swoopTargetY = player.y + player.height / 2; // Target player's center
                        // Calculate direction for swoop
                        const angle = Math.atan2(dyToPlayer, dxToPlayer);
                        enemy.velocity.x = Math.cos(angle) * enemy.speed * 1.5; // Swoop faster
                        enemy.velocity.y = Math.sin(angle) * enemy.swoopSpeedY;
                    }
                    // TODO: Implement projectile attack later
                }

                if (enemy.isSwooping) {
                    enemy.x += enemy.velocity.x;
                    enemy.y += enemy.velocity.y;

                    // End swoop if reached target Y or gone past player significantly
                    if ( (enemy.velocity.y > 0 && enemy.y >= enemy.swoopTargetY) ||
                         (enemy.velocity.y < 0 && enemy.y <= enemy.swoopTargetY) ||
                         Math.abs(enemy.y - enemy.swoopTargetY) < 20 ) { // Close enough
                        enemy.isSwooping = false;
                        enemy.y = enemy.initialY + Math.sin(enemy.x / 50) * 20; // Return to pattern
                    }
                } else {
                    // Basic movement pattern
                    enemy.x += enemy.direction * enemy.speed;
                    if (enemy.movementPattern === 'horizontal') {
                        // Simple back and forth, maybe change direction at edges or randomly
                        if (enemy.x > canvas.width - enemy.width || enemy.x < 0) {
                            enemy.direction *= -1;
                        }
                    } else if (enemy.movementPattern === 'sinusoidal') {
                        enemy.y = enemy.initialY + Math.sin(enemy.x / 50) * 20; // Adjust amplitude and frequency as needed
                    }
                }

                // Keep flying enemy within vertical bounds (e.g., not too high, not on ground)
                if (enemy.y < 50) enemy.y = 50;
                if (enemy.y > ground - 100) enemy.y = ground - 100; // Don't let them touch ground unless swooping

            } else {
                // Ground enemy logic (existing logic)
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                enemy.velocity.y += gravity * 0.8;
                
                if (!enemy.isJumping && enemy.jumpCooldown <= 0) {
                    enemy.velocity.y = -enemy.jumpForce;
                    enemy.isJumping = true;
                    enemy.jumpCooldown = 120 + Math.floor(Math.random() * 180);
                    enemy.maxJumpCooldown = enemy.jumpCooldown;
                }

                if (enemy.jumpCooldown > 0) {
                    enemy.jumpCooldown--;
                }

                if (distance < 300) {
                    const dirX = dx / distance;
                    enemy.direction = dirX > 0 ? 1 : -1;
                    enemy.x += enemy.direction * enemy.speed + (Math.random() - 0.5);
                } else {
                    enemy.x += enemy.direction * enemy.speed;
                }

                enemy.y += enemy.velocity.y;

                if (enemy.y > ground - enemy.height) {
                    enemy.y = ground - enemy.height;
                    enemy.velocity.y = 0;
                    enemy.isJumping = false;
                }
            }
            
            // Common logic for all enemy types (collision, removal)
            if ((enemy.direction > 0 && enemy.x < -enemy.width - 50) || // Adjusted off-screen removal
                (enemy.direction < 0 && enemy.x > canvas.width + enemy.width + 50)) {
                enemies.splice(i, 1);
                continue; // Skip to next enemy as this one is removed
            }
            
            // Check collision with player (applies to both enemy types)
            if (!player.isPunching && !player.isDead &&
                player.x < enemy.x + enemy.width &&
                player.x + player.width > enemy.x &&
                player.y < enemy.y + enemy.height &&
                player.y + player.height > enemy.y) {
                
                let damageDealt = 0;
                if (enemy.type === 'flying') {
                    damageDealt = 8 + Math.floor(currentRound / 3);
                } else { // Ground enemy
                    damageDealt = 5 + Math.floor(currentRound / 3);
                }
                player.health -= damageDealt;
                lastDamageTime = 0;
                playerBlinking = true;
                blinkTimer = 0;
                triggerScreenShake(5, 15); // Screen shake on player hit
                
                if (player.x < enemy.x) {
                    player.velocity.x = -5;
                } else {
                    player.velocity.x = 5;
                }
                player.velocity.y = -5;
                
                if (player.health <= 0) {
                    startPlayerDeathAnimation();
                }
                 // If flying enemy hits during swoop, it should reset its state
                if (enemy.type === 'flying' && enemy.isSwooping) {
                    enemy.isSwooping = false;
                    enemy.y = enemy.initialY + Math.sin(enemy.x / 50) * 20; // Reset position
                }
            }
        }
    }
    
    function updateCoins() {
        // Update existing coins
        coins3D.forEach(coin => {
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
            anim.particles.forEach(p => { // Renamed to p to avoid conflict
                p.x += p.vx;
                p.y += p.vy;
                p.vy += gravity * 0.05; // Less gravity on particles
                p.life++;
                p.alpha = 1 - (p.life / p.maxLife);
                p.size *= 0.98; // Shrink slightly
            });
            
            // Remove animation when done or all particles faded
            if (anim.timer >= anim.maxTime || anim.particles.every(p => p.alpha <= 0)) {
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
            alpha: 0 // Start transparent
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
    function createJumpParticles(x, y, isDoubleJump = false) {
        const particleCount = isDoubleJump ? 25 : 15; // More particles for double jump
        const particleColor = isDoubleJump ? '#2980b9' : '#7f8c8d'; // Blue for double jump, dust for normal
        const initialVyFactor = isDoubleJump ? 3 : 2; // Stronger burst for double jump
        
        for (let i = 0; i < particleCount; i++) {
            jumpParticles.push({
                x: x + Math.random() * player.width,
                y: y,
                vx: (Math.random() - 0.5) * (isDoubleJump ? 4 : 3),
                vy: -Math.random() * initialVyFactor - 1,
                size: Math.random() * (isDoubleJump ? 10 : 8) + 2,
                color: particleColor,
                alpha: 1,
                life: 0,
                maxLife: 20 + Math.random() * (isDoubleJump ? 25 : 20)
            });
        }
    }
    
    // Create landing particles when player lands
    function createLandingParticles(x, y) {
        const particleCount = 28; // Increased from 20
        
        for (let i = 0; i < particleCount; i++) {
            jumpParticles.push({
                x: x + Math.random() * player.width,
                y: y,
                vx: (Math.random() - 0.5) * (Math.random() * 6 + 3), // Wider, more varied spread
                vy: -Math.random() * 2.5, // Slightly more upward velocity
                size: Math.random() * 10 + 4, // Slightly larger particles
                color: '#7f8c8d', // Dust color
                alpha: 1,
                life: 0,
                maxLife: 20 + Math.random() * 25 // Varied lifespan
            });
        }
    }

    // Function to create punch impact particles
    function createPunchImpactParticles(x, y, direction) {
        const particleCount = 8; // Small burst
        for (let i = 0; i < particleCount; i++) {
            impactParticles.push({
                x: x,
                y: y + (Math.random() - 0.5) * 20, // Slight vertical spread
                vx: direction * (Math.random() * 3 + 2) + (Math.random() - 0.5) * 2, // Primarily in punch direction
                vy: (Math.random() - 0.5) * 3,
                size: Math.random() * 5 + 2,
                color: '#FFFF99', // Yellowish sparks
                alpha: 1,
                life: 0,
                maxLife: 10 + Math.random() * 10 // Short lifespan
            });
        }
    }

    // Function to update impact particles (generic, can be used for others too)
    function updateImpactParticles() {
        for (let i = impactParticles.length - 1; i >= 0; i--) {
            const particle = impactParticles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += gravity * 0.05; // Light gravity
            particle.life++;
            particle.alpha = 1 - (particle.life / particle.maxLife);
            particle.size *= 0.95;

            if (particle.life >= particle.maxLife || particle.alpha <= 0 || particle.size <= 0.5) {
                impactParticles.splice(i, 1);
            }
        }
    }

    // Function to draw impact particles
    function drawImpactParticles() {
        impactParticles.forEach(particle => {
            ctx.save();
            ctx.globalAlpha = particle.alpha;
            ctx.fillStyle = particle.color;
            // Simple square particles for sparks
            ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
            ctx.restore();
        });
    }

    
    // Update jump particles
    function updateJumpParticles() {
        for (let i = jumpParticles.length - 1; i >= 0; i--) {
            const particle = jumpParticles[i];
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.1; // Gravity
            particle.life++;
            particle.alpha = 1 - (particle.life / particle.maxLife);
            
            // Remove dead particles
            if (particle.life >= particle.maxLife) {
                jumpParticles.splice(i, 1);
            }
        }
    }
    
    // Draw jump particles
    function drawJumpParticles() {
        jumpParticles.forEach(particle => {
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
            if (lastDamageTime >= healthRegenDelay && player.health < player.maxHealth) {
                player.health = Math.min(player.health + player.healthRegenRate, player.maxHealth);
            }
        }
    }
    
    function drawPlayer() {
        ctx.save();
        
        // Apply enhanced blinking effect when player is hit
        if (playerBlinking && blinkTimer % blinkFrequency < blinkFrequency/2) {
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
        let playerDrawY = player.y;
        let playerDrawHeight = player.height;

        if (player.idleTimer > 60) { // Start idle animation after 1 second
            const idleOffset = Math.sin(Date.now() / 200) * 2; // Slow sine wave for up/down movement
            // Adjust height and Y for breathing effect, keeping feet on ground
            playerDrawY = player.y - idleOffset;
            playerDrawHeight = player.height + idleOffset;
        }
        ctx.fillRect(player.x, playerDrawY, player.width, playerDrawHeight);
        
        // Draw monkey face (relative to playerDrawY)
        // Lighter face area
        ctx.fillStyle = '#D2B48C'; // Tan color for monkey face
        ctx.beginPath();
        ctx.ellipse(player.x + player.width/2, playerDrawY + playerDrawHeight/2 - 5, 20, 25, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(player.x + 15, playerDrawY + 15, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(player.x + 35, playerDrawY + 15, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Nose
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(player.x + player.width/2, playerDrawY + 25, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Mouth
        ctx.beginPath();
        ctx.moveTo(player.x + 15, playerDrawY + 35);
        ctx.quadraticCurveTo(player.x + player.width/2, playerDrawY + 40, player.x + 35, playerDrawY + 35);
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Ears
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.ellipse(player.x + 5, playerDrawY + 5, 8, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(player.x + player.width - 5, playerDrawY + 5, 8, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw punch if punching
        if (player.isPunching) {
            ctx.fillStyle = '#e67e22'; // Orange arm color to match player
            if (lastDirection > 0) {
                ctx.fillRect(player.x + player.width, playerDrawY + 20, 90, 15); // Longer arm
            } else {
                ctx.fillRect(player.x - 90, playerDrawY + 20, 90, 15); // Longer arm
            }
        }
        
        // Draw health bar (relative to original player.y for consistency)
        const healthPercentage = player.health / player.maxHealth;
        
        // Change health bar color based on regeneration status
        if (lastDamageTime >= healthRegenDelay && player.health < player.maxHealth) {
            // Pulsing green effect during regeneration
            const pulseIntensity = 0.7 + 0.3 * Math.sin(Date.now() * 0.01);
            ctx.fillStyle = `rgba(46, 204, 113, ${pulseIntensity})`;
        } else {
            ctx.fillStyle = '#2ecc71';
        }
        
        ctx.fillRect(player.x, player.y - 15, player.width * healthPercentage, 5); // Use original player.y for health bar position
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(player.x, player.y - 15, player.width, 5);
        
        // Show regeneration indicator
        if (lastDamageTime >= healthRegenDelay && player.health < player.maxHealth) {
            ctx.fillStyle = '#2ecc71';
            ctx.beginPath();
            ctx.arc(player.x + player.width * healthPercentage + 5, player.y - 12.5, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    function drawEnemies() {
        enemies.forEach(enemy => {
            ctx.save();
            
            ctx.fillStyle = enemy.color;
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            
            if (enemy.type === 'ground') {
                // Visual indicator for jump cooldown (only for ground enemies)
                if (!enemy.isJumping && enemy.jumpCooldown < enemy.maxJumpCooldown * 0.3) {
                    ctx.fillStyle = 'yellow';
                    ctx.beginPath();
                    ctx.arc(enemy.x + enemy.width/2, enemy.y - 10, 5, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Draw face (ground enemy)
                ctx.fillStyle = '#000';
                ctx.fillRect(enemy.x + 8, enemy.y + 12, 8, 8); // Eyes
                ctx.fillRect(enemy.x + 24, enemy.y + 12, 8, 8);
                ctx.beginPath(); // Mouth
                ctx.moveTo(enemy.x + 10, enemy.y + 35);
                ctx.lineTo(enemy.x + 20, enemy.y + 40);
                ctx.lineTo(enemy.x + 30, enemy.y + 35);
                ctx.lineWidth = 2;
                ctx.stroke();
            } else if (enemy.type === 'flying') {
                // Draw a simple "wing" or different face for flying enemy
                ctx.fillStyle = '#a2d5f2'; // Lighter blue for wings
                // Left Wing
                ctx.beginPath();
                ctx.moveTo(enemy.x, enemy.y + enemy.height / 2);
                ctx.lineTo(enemy.x - 20, enemy.y);
                ctx.lineTo(enemy.x - 20, enemy.y + enemy.height);
                ctx.closePath();
                ctx.fill();
                // Right Wing
                ctx.beginPath();
                ctx.moveTo(enemy.x + enemy.width, enemy.y + enemy.height / 2);
                ctx.lineTo(enemy.x + enemy.width + 20, enemy.y);
                ctx.lineTo(enemy.x + enemy.width + 20, enemy.y + enemy.height);
                ctx.closePath();
                ctx.fill();

                // Simple face for flying enemy
                ctx.fillStyle = '#000';
                ctx.beginPath(); // Eye 1
                ctx.arc(enemy.x + enemy.width/3, enemy.y + enemy.height/2, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath(); // Eye 2
                ctx.arc(enemy.x + (enemy.width*2)/3, enemy.y + enemy.height/2, 4, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Health bar (common for all enemies)
            const healthPercentage = enemy.health / enemy.maxHealth;
            ctx.fillStyle = enemy.health < enemy.maxHealth * 0.3 ? '#f1c40f' : '#e74c3c'; // Yellow if low health
            ctx.fillRect(enemy.x, enemy.y - 15, enemy.width * healthPercentage, 5);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(enemy.x, enemy.y - 15, enemy.width, 5);
            
            ctx.restore();
        });
    }
    
    function drawCoins() {
        coins3D.forEach(coin => {
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
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath();
            ctx.arc(0, 0, coin.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
            
            // Dollar sign
            ctx.fillStyle = '#fff';
            ctx.font = '15px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', 0, 0);
            
            // Draw magnetic effect if attracted
            if (coin.attracted) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, coin.radius + 5, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            ctx.restore();
        });
    }
    
    function drawDeathAnimations() {
        deathAnimations.forEach(anim => {
            anim.particles.forEach(particle => {
                ctx.save();
                ctx.globalAlpha = particle.alpha;
                ctx.translate(particle.x, particle.y);
                ctx.rotate(particle.rotation);
                
                ctx.fillStyle = particle.color;
                ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
                
                ctx.restore();
            });
        });
    }
    
    function drawGraveAnimations() {
        graveAnimations.forEach(grave => {
            ctx.save();
            ctx.globalAlpha = grave.alpha;
            
            // Draw the grave
            // Tombstone
            ctx.fillStyle = '#7f8c8d';
            ctx.fillRect(grave.x, grave.y + grave.yOffset, grave.width, grave.height - 10);
            
            // Rounded top
            ctx.beginPath();
            ctx.arc(grave.x + grave.width/2, grave.y + grave.yOffset, grave.width/2, Math.PI, 2 * Math.PI);
            ctx.fill();
            
            // Cross or RIP text
            ctx.fillStyle = '#34495e';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('RIP', grave.x + grave.width/2, grave.y + grave.yOffset + 15);
            
            // Dirt mound at base
            ctx.fillStyle = '#795548';
            ctx.beginPath();
            ctx.ellipse(grave.x + grave.width/2, grave.y + grave.height + grave.yOffset, grave.width/1.5, 10, 0, 0, Math.PI * 2);
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
        updateHighScore(); // Ensure high score is updated before showing death screen
        for (let i = 0; i < 40; i++) { // Doubled the number of particles
            // Add color variation for blood particles
            const bloodColors = ['#e74c3c', '#c0392b', '#a93226', '#922b21', '#7b241c'];
            const randomBloodColor = bloodColors[Math.floor(Math.random() * bloodColors.length)];
            
            player.deathAnimation.particles.push({
                x: player.x + Math.random() * player.width,
                y: player.y + Math.random() * player.height,
                vx: (Math.random() - 0.5) * 12, // Increased spread
                vy: (Math.random() - 0.5) * 12, // Increased spread
                size: Math.random() * 15 + 5,
                color: randomBloodColor, // Use varied blood colors
                alpha: 1,
                rotation: Math.random() * Math.PI * 2
            });
        }
        
        // Create a grave at the player's position
        createGraveAnimation(player.x, player.y);
        
        // Show death screen after a delay
        setTimeout(() => {
            isPaused = true;
            deathScreen.style.display = 'block';
            overlay.style.display = 'block';
        }, 2000);
    }
    
    function updatePlayerDeathAnimation() {
        if (!player.deathAnimation.active) return;
        
        player.deathAnimation.timer++;
        
        // Update particles
        player.deathAnimation.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.1; // Gravity
            particle.alpha = 1 - (player.deathAnimation.timer / player.deathAnimation.maxTime);
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
        player.deathAnimation.particles.forEach(particle => {
            ctx.save();
            ctx.globalAlpha = particle.alpha;
            ctx.translate(particle.x, particle.y);
            ctx.rotate(particle.rotation);
            
            ctx.fillStyle = particle.color;
            ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
            
            ctx.restore();
        });
        
        // Draw game over text
        if (player.deathAnimation.timer > 30) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 0, 0, ' + Math.min(1, (player.deathAnimation.timer - 30) / 60) + ')';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
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
            color: damage >= 15 ? '#ff0000' : '#ffffff', // Red for high damage, white for normal
            size: 12 + Math.min(damage, 20) / 2 // Size scales with damage
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
        damageIndicators.forEach(indicator => {
            ctx.save();
            
            // Calculate alpha based on timer
            const alpha = 1 - (indicator.timer / indicator.maxTime);
            
            // Draw damage text
            ctx.fillStyle = indicator.color;
            ctx.globalAlpha = alpha;
            ctx.font = `bold ${indicator.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(indicator.value.toString(), indicator.x, indicator.y);
            
            ctx.restore();
        });
    }
    
    // Function to handle round transitions
    function startRoundTransition() {
        isRoundTransition = true;
        roundTransitionTimer = 0;
        currentRound++;
        enemiesRemaining = Math.floor(4 + currentRound * 1.5); // Adjusted enemies per round
        
        // Reset progress bar during round transition
        document.getElementById('roundProgressBar').style.width = '0%';

        // Handle temporary damage boost
        if (player.tempDamageBoostActive) {
            player.tempDamageBoostRounds--;
            if (player.tempDamageBoostRounds <= 0) {
                player.tempDamageBoostActive = false;
                player.punchDamage = player.initialPunchDamage; // Reset to base damage
                const tempBoostButton = document.querySelector('button[data-item="tempDamageBoost"]');
                if (tempBoostButton) {
                    const cost = parseInt(tempBoostButton.getAttribute('data-cost'));
                    tempBoostButton.textContent = `Buy (${cost} coins)`;
                    tempBoostButton.disabled = false;
                }
            }
        }

        // Background Transition Logic (handled before potential boss spawn)
        const oldBackgroundSet = currentBackgroundSet;
        if (currentRound >= 4 && currentRound < 7 && currentBackgroundSet !== 1) {
            prevBackgroundSet = currentBackgroundSet;
            currentBackgroundSet = 1; // Evening
            backgroundTransitionTimer = backgroundTransitionDuration;
        } else if (currentRound >= 7 && currentBackgroundSet !== 2) {
            prevBackgroundSet = currentBackgroundSet;
            currentBackgroundSet = 2; // Night
            backgroundTransitionTimer = backgroundTransitionDuration;
        }
        if (oldBackgroundSet !== currentBackgroundSet && backgroundTransitionTimer > 0) {
            // prevBackgroundSet is set
        } else if (backgroundTransitionTimer <= 0) {
            prevBackgroundSet = currentBackgroundSet;
        }

        // Boss Spawning Logic
        if (currentRound === bossSpawnRound && !bossActive) {
            spawnBoss();
            bossActive = true;
            enemiesRemaining = 0; // No normal enemies during boss fight
            if(bossHealthContainer) bossHealthContainer.style.display = 'block';
            document.getElementById('roundProgressContainer').style.display = 'none'; // Hide round progress
        } else if (bossActive) {
            // If boss is active, ensure no normal enemies spawn and UI is for boss
            enemiesRemaining = 0;
            if(bossHealthContainer) bossHealthContainer.style.display = 'block';
            document.getElementById('roundProgressContainer').style.display = 'none';
        } else {
            // Normal round progression
            if(bossHealthContainer) bossHealthContainer.style.display = 'none';
            document.getElementById('roundProgressContainer').style.display = 'block';
        }

         // Ensure shop buttons are correctly updated (especially for temp boost)
        if (isShopOpen) {
            initializeShopButtons();
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
        ctx.fillStyle = '#ffffff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Fade in and out effect
        let alpha = 1;
        if (roundTransitionTimer < 30) {
            alpha = roundTransitionTimer / 30;
        } else if (roundTransitionTimer > roundTransitionDuration - 30) {
            alpha = (roundTransitionDuration - roundTransitionTimer) / 30;
        }
        
        ctx.globalAlpha = alpha;
        ctx.fillText(`ROUND ${currentRound}`, canvas.width/2, canvas.height/2);
        
        ctx.restore();
    }
    
    // Helper function to trigger screen shake
    function triggerScreenShake(magnitude, duration) {
        screenShakeMagnitude = Math.max(screenShakeMagnitude, magnitude); // Prevent smaller shakes from overriding larger ones
        screenShakeDuration = Math.max(screenShakeDuration, duration);   // Take the longer duration
        screenShakeTimer = screenShakeDuration;
    }

    function gameLoop() {
        let shakeAppliedThisFrame = false;
        if (screenShakeTimer > 0) {
            shakeAppliedThisFrame = true;
            // Gradually reduce magnitude for a smoother stop
            const currentShakeMagnitude = screenShakeMagnitude * (screenShakeTimer / screenShakeDuration);
            const offsetX = (Math.random() - 0.5) * currentShakeMagnitude * 2;
            const offsetY = (Math.random() - 0.5) * currentShakeMagnitude * 2;

            ctx.save();
            ctx.translate(offsetX, offsetY);
            screenShakeTimer--;
        } else {
            screenShakeMagnitude = 0; // Reset magnitude only when timer is up
            screenShakeDuration = 0;  // Reset duration
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawDynamicBackground(); // New call for dynamic backgrounds
        
        if (gameStarted && !isPaused && !isShopOpen) {
            // Draw other game elements (potentially shaken)
            drawGraveAnimations();
            drawJumpParticles();
            drawImpactParticles();
            drawCoins();
            drawDeathAnimations();
            drawPlayer();
            drawPlayerDeathAnimation();
            
            if (bossActive) {
                drawBoss();
                drawBossProjectiles(); // Draw boss projectiles
            } else {
                drawEnemies();
            }

            drawDamageIndicators();
            drawRoundTransition(); // Draw round transition (potentially shaken)

            // Update game state (not affected by shake visuals)
            updatePlayer();
            updatePlayerDeathAnimation();

            if (bossActive) {
                updateBoss();
                updateBossProjectiles(); // Update boss projectiles
            } else {
                updateEnemies();
            }

            updateCoins();
            updateDeathAnimations();
            updateGraveAnimations();
            updateDamageIndicators();
            updateRoundTransition();
            updateJumpParticles();
            updateImpactParticles();
            updateBlinkAnimation();
        } else { // If game not active, just draw what's necessary (e.g. menus)
            if (isPaused && gameStarted) { // Only draw game elements if game has started before pause
                drawGraveAnimations(); drawJumpParticles(); drawImpactParticles(); drawCoins();
                drawDeathAnimations(); drawPlayer(); drawPlayerDeathAnimation();
                if(bossActive) { drawBoss(); drawBossProjectiles(); } else { drawEnemies(); }
                drawDamageIndicators();
            } else if (isShopOpen && gameStarted) {
                drawGraveAnimations(); drawJumpParticles(); drawImpactParticles(); drawCoins();
                drawDeathAnimations(); drawPlayer(); drawPlayerDeathAnimation();
                if(bossActive) { drawBoss(); drawBossProjectiles(); } else { drawEnemies(); }
                drawDamageIndicators();
            }
            // Menus themselves are HTML, not on canvas, so not shaken by ctx.translate
        }

        if (shakeAppliedThisFrame) {
            ctx.restore();
        }
        
        requestAnimationFrame(gameLoop);
    }
    
    // Background animation variables
    let backgroundTime = 0;
    const clouds = []; // Cloud objects will be initialized in initClouds

    function initClouds() {
        clouds.length = 0; // Clear existing clouds if any
        for (let i = 0; i < 5; i++) {
            clouds.push({
                x: Math.random() * canvas.width,
                y: 50 + Math.random() * 100,
                width: 60 + Math.random() * 40,
                height: 30 + Math.random() * 20,
                speed: 0.2 + Math.random() * 0.3,
                opacity: 0.6 + Math.random() * 0.3
            });
        }
    }
    // Initialize clouds
    for (let i = 0; i < 5; i++) {
        clouds.push({
            x: Math.random() * canvas.width,
            y: 50 + Math.random() * 100,
            width: 60 + Math.random() * 40,
            height: 30 + Math.random() * 20,
            speed: 0.2 + Math.random() * 0.3,
            opacity: 0.6 + Math.random() * 0.3
        });
    }
    
    // Define an animated background function
    function drawBackground(themeSet) {
        backgroundTime += 0.01;
        let skyColor1, skyColor2, groundColor, grassColor, cloudColor, cloudOpacityFactor;

        switch(themeSet) {
            case 1: // Evening/Sunset
                skyColor1 = `hsl(${25 + Math.sin(backgroundTime * 0.8) * 10}, 70%, 55%)`; // Oranges/Pinks
                skyColor2 = `hsl(${300 + Math.sin(backgroundTime * 0.4) * 15}, 60%, 45%)`; // Purples
                groundColor = '#5d4037'; // Darker brown/green
                grassColor = '#4e342e';
                cloudColor = '#bdc3c7'; // Darker clouds
                cloudOpacityFactor = 0.7;
                break;
            case 2: // Night
                skyColor1 = `hsl(240, 60%, 20%)`; // Dark blue
                skyColor2 = `hsl(240, 50%, 10%)`; // Almost black
                groundColor = '#2c3e50'; // Very dark blue/grey
                grassColor = '#233140';
                cloudColor = '#7f8c8d'; // Wispy, dark clouds
                cloudOpacityFactor = 0.4;
                // TODO: Add moon and stars for night theme
                break;
            default: // Day (Theme 0)
                skyColor1 = `hsl(${180 + Math.sin(backgroundTime) * 10}, 70%, 60%)`;
                skyColor2 = `hsl(${210 + Math.sin(backgroundTime * 0.5) * 5}, 70%, 50%)`;
                groundColor = '#2ecc71';
                grassColor = '#27ae60';
                cloudColor = '#ffffff';
                cloudOpacityFactor = 1.0;
                break;
        }

        const skyGradient = ctx.createLinearGradient(0, 0, 0, ground);
        skyGradient.addColorStop(0, skyColor1);
        skyGradient.addColorStop(1, skyColor2);
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, canvas.width, ground);

        // Draw animated clouds (color and opacity adjusted by theme)
        ctx.fillStyle = cloudColor;
        clouds.forEach(cloud => {
            cloud.x += cloud.speed * (themeSet === 2 ? 0.5 : 1); // Slower clouds at night
            if (cloud.x > canvas.width + cloud.width) {
                cloud.x = -cloud.width;
                cloud.y = 50 + Math.random() * 100;
            }
            ctx.save();
            ctx.globalAlpha = cloud.opacity * cloudOpacityFactor;
            ctx.beginPath();
            ctx.ellipse(cloud.x, cloud.y, cloud.width/2, cloud.height/2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cloud.x + cloud.width * 0.3, cloud.y - cloud.height * 0.2, cloud.width/3, cloud.height/2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cloud.x - cloud.width * 0.2, cloud.y - cloud.height * 0.1, cloud.width/4, cloud.height/3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        
        // Ground
        ctx.fillStyle = groundColor;
        ctx.fillRect(0, ground, canvas.width, canvas.height - ground);
        
        // Grass details (color adjusted by theme)
        ctx.fillStyle = grassColor;
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

    // Wrapper for drawing background with transition
    function drawDynamicBackground() {
        if (backgroundTransitionTimer > 0) {
            const alpha = 1 - (backgroundTransitionTimer / backgroundTransitionDuration); // Alpha for new background

            // Draw old background with full opacity
            drawBackground(prevBackgroundSet);

            // Draw new background on top with increasing opacity
            ctx.save();
            ctx.globalAlpha = alpha;
            drawBackground(currentBackgroundSet);
            ctx.restore();

            backgroundTransitionTimer--;
        } else {
            drawBackground(currentBackgroundSet); // Draw current theme normally
        }
    }
    
    // Function to start the game
    function startGame() {
        gameStarted = true;
        currentRound = 1;
        // enemiesRemaining = 5; // This will be set by startRoundTransition or its logic
        startMenu.style.display = 'none';

        initializeTutorialMessages();
        // For this task, tutorial always shows on new game start.
        // if (localStorage.getItem('tutorialCompleted') !== 'true') {
        tutorialActive = true;
        tutorialStep = 0;
        showTutorialStep(); // This will also set overlay & pause
        // } else {
        //    tutorialActive = false;
        //    overlay.style.display = 'none'; // Ensure overlay is off if no tutorial
        // }

        // Reset progress bar
        document.getElementById('roundProgressBar').style.width = '0%';
        // Initialize first round values
        enemiesRemaining = Math.floor(4 + currentRound * 1.5);
        if(bossHealthContainer) bossHealthContainer.style.display = 'none'; // Ensure boss health is hidden
        document.getElementById('roundProgressContainer').style.display = 'block'; // Ensure round progress is shown
        initClouds(); // Initialize clouds for the background
        loadHighScore(); // Load and display high score when game starts
    }

    // High Score Functions
    function loadHighScore() {
        const savedHighScore = localStorage.getItem('monkeyGameHighScore');
        if (savedHighScore) {
            highScore = parseInt(savedHighScore, 10);
        }
        const highScoreDisplayElement = document.getElementById('highScoreDisplay');
        if(highScoreDisplayElement) highScoreDisplayElement.textContent = highScore;
    }

    function updateHighScore() {
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('monkeyGameHighScore', highScore.toString());
            const highScoreDisplayElement = document.getElementById('highScoreDisplay');
            if(highScoreDisplayElement) highScoreDisplayElement.textContent = highScore;
        }
    }

    // Boss Functions
    function spawnBoss() {
        boss = {
            x: canvas.width, // Start off-screen right
            y: ground - 200, // Higher up
            width: 150,
            height: 150,
            health: 500,
            maxHealth: 500,
            speed: 1,
            color: '#8e44ad', // Purple boss
            phase: 1,
            attackCooldown: 120, // 2 seconds
            currentAttack: null,
            vulnerable: true,
            patterns: ['shoot', 'charge'], // Simple patterns for now
            velocityX: -1, // Moving left initially
            direction: -1, // Facing left
        };
        if(bossNameElement) bossNameElement.textContent = "ROBO-GORILLA"; // Example name
        if(bossHealthBar) bossHealthBar.style.width = '100%';
    }

    function updateBoss() {
        if (!bossActive || player.isDead) return;
        // Basic movement: patrol left and right
        boss.x += boss.velocityX * boss.speed;
        if (boss.x + boss.width > canvas.width && boss.velocityX > 0) {
            boss.velocityX = -1; // Turn around
            boss.direction = -1;
        } else if (boss.x < 0 && boss.velocityX < 0) {
            boss.velocityX = 1;
            boss.direction = 1;
        }

        // Attack Logic
        if (boss.attackCooldown > 0) {
            boss.attackCooldown--;
        } else if (boss.vulnerable && Object.keys(boss).length > 0 && player && !player.isDead) { // Ensure boss object is initialized and player is alive
            // Choose an attack (simple sequence for now, then random)
            // For now, only 'shoot' attack will be implemented fully
            boss.currentAttack = 'shoot';

            if (boss.currentAttack === 'shoot') {
                 const projectileSpeed = 4;
                 const angleToPlayer = Math.atan2( (player.y + player.height/2) - (boss.y + boss.height/2),
                                                  (player.x + player.width/2) - (boss.x + boss.width/2) );

                 bossProjectiles.push({
                     x: boss.x + boss.width / 2,
                     y: boss.y + boss.height / 2,
                     radius: 10,
                     color: '#d35400',
                     vx: Math.cos(angleToPlayer) * projectileSpeed,
                     vy: Math.sin(angleToPlayer) * projectileSpeed,
                     damage: 15
                 });
                 boss.attackCooldown = 150; // Reset cooldown (2.5 seconds)
            }
            // TODO: Implement 'charge' or other attacks from boss.patterns
        }
    }

    function updateBossProjectiles() {
        for (let i = bossProjectiles.length - 1; i >= 0; i--) {
            const p = bossProjectiles[i];
            p.x += p.vx;
            p.y += p.vy;

            // Check collision with player
            if (!player.isDead &&
                p.x - p.radius < player.x + player.width &&
                p.x + p.radius > player.x &&
                p.y - p.radius < player.y + player.height &&
                p.y + p.radius > player.y) {

                player.health -= p.damage;
                lastDamageTime = 0;
                playerBlinking = true;
                blinkTimer = 0;
                triggerScreenShake(4, 12);
                bossProjectiles.splice(i, 1);
                if (player.health <= 0) {
                    startPlayerDeathAnimation();
                }
                continue;
            }

            // Remove if off-screen
            if (p.x + p.radius < 0 || p.x - p.radius > canvas.width || p.y + p.radius < 0 || p.y - p.radius > canvas.height) {
                bossProjectiles.splice(i, 1);
            }
        }
    }

    function drawBossProjectiles() {
        bossProjectiles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function drawBoss() {
        if (!bossActive || !boss.health) return; // Don't draw if not active or no health
        ctx.fillStyle = boss.color;
        ctx.fillRect(boss.x, boss.y, boss.width, boss.height);

        // Update boss health bar UI
        if (bossHealthBar) {
            const healthPercentage = (boss.health / boss.maxHealth) * 100;
            bossHealthBar.style.width = `${healthPercentage}%`;
        }
        // TODO: Draw boss projectiles
    }
    
    // Initialize game
    if (coinsElement){
        coinsElement.textContent = coins;
    }
    loadHighScore(); // Load high score when the script is first parsed and DOM is ready
    
    // Show start menu when game loads
    startMenu.style.display = 'block';
    overlay.style.display = 'block';
    
    // Start the game loop (will only render active elements when gameStarted is true)
    gameLoop();
}); // End of DOMContentLoaded event listener
