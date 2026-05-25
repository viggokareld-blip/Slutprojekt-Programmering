const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// fiende sprite (3 frames: (0,0), (64,0), (0,64))
const enemySprite = new Image();
enemySprite.src = './dronedog.png';
const spriteFrames = [ { x: 0, y: 0 }, { x: 64, y: 0 }, { x: 0, y: 64 } ];
let spriteFrameIndex = 0;
let spriteTick = 0;
const spriteTicksPerFrame = 10; // skiftar frame var 10:e tick

function updateSprite() {
  spriteTick++;
  if (spriteTick >= spriteTicksPerFrame) {
    spriteTick = 0;
    spriteFrameIndex = (spriteFrameIndex + 1) % spriteFrames.length;
  }
}

const Engine = Matter.Engine,
      World = Matter.World,
      Bodies = Matter.Bodies,
      Body = Matter.Body;

const engine = Engine.create();
engine.gravity.x = 0;
engine.gravity.y = 1;
const world = engine.world;

const radius = 20;
const playerHitboxRadius = radius + 14;
const enemyHitboxRadius = radius + 14;
const projectileRadius = 3;
const enemyProjectileSpeed = 4;
const playerProjectileSpeed = 10;
const projectileLife = 120;
const homingStrength = 0.08;
const playerHomingStrength = 0.12;
const shotInterval = 60;
const maxHealth = 5;
const maxEnemyHealth = 3;
const enemyBallSpeed = 2.5;
const playerBallSpeed = enemyBallSpeed;
const playerForce = 0.0006;
const playerJumpForce = 18;
const playerMaxSpeed = 6;
const groundHeight = 60;
const maxJumpTime = 30;
const jumpForcePerFrame = 0.0011;

const enemies = [];
let gameStarted = false;
let jumpActive = false;
let jumpTime = 0;

const playerBody = Bodies.circle(50, 120, radius, {
  frictionAir: 0,
  restitution: 0,
  label: "player"
});

const controlBarrier = Bodies.rectangle(canvas.width / 2, 44, 380, 70, {
  isStatic: true,
  render: { visible: false },
  label: "controlBarrier"
});

const ground = Bodies.rectangle(canvas.width / 2, canvas.height - groundHeight / 2, canvas.width, groundHeight, {
  isStatic: true,
  render: { visible: false },
  label: "ground"
});

const enemyBarrier = {
  x: canvas.width / 2,
  y: 44,
  halfWidth: 190,
  halfHeight: 35
};

World.add(world, [
  playerBody,
  controlBarrier,
  ground,
  Bodies.rectangle(canvas.width / 2, -25, canvas.width + 50, 50, { isStatic: true }),
  Bodies.rectangle(-25, canvas.height / 2, 50, canvas.height + 50, { isStatic: true }),
  Bodies.rectangle(canvas.width + 25, canvas.height / 2, 50, canvas.height + 50, { isStatic: true })
]);

let keys = { w: false, a: false, d: false };
let pointerX = canvas.width / 2;
let pointerY = canvas.height / 2;
let shotTimer = 0;

let playerHealth = maxHealth;
let score = 0;
let running = false;
let animationId = null;

const enemyProjectiles = [];
const playerProjectiles = [];

const scoreValue = document.getElementById("scoreValue");
const healthFill = document.getElementById("healthFill");
const healthText = document.getElementById("healthText");

function drawEnemy() {
  enemies.forEach((enemy) => {
    if (!enemy.alive) return;
    // rita fiende med sprite om den är laddad, annars som en cirkel
    const drawW = radius * 4;
    const drawH = radius * 4;
    if (enemySprite && enemySprite.complete) {
      const f = spriteFrames[spriteFrameIndex];
      ctx.drawImage(enemySprite, f.x, f.y, 64, 64, enemy.x - drawW / 2, enemy.y - drawH / 2, drawW, drawH);
    } else {
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "orange";
      ctx.fill();
      ctx.closePath();
    }

    const barWidth = 60;
    const barHeight = 8;
    const healthRatio = enemy.health / maxEnemyHealth;
    const barX = enemy.x - barWidth / 2;
    const barY = enemy.y - radius - 18;

    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = "red";
    ctx.fillRect(barX + 1, barY + 1, (barWidth - 2) * healthRatio, barHeight - 2);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  });
}

function drawPlayer() {
  ctx.beginPath();
  ctx.arc(playerBody.position.x, playerBody.position.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "blue";
  ctx.fill();
  ctx.closePath();
}

function updateHud() {
  scoreValue.textContent = score;
  const healthPercent = Math.max(0, playerHealth) / maxHealth;
  healthFill.style.width = `${healthPercent * 100}%`;
  healthFill.style.background = playerHealth > 2 ? "#0f0" : playerHealth > 1 ? "#ff0" : "#f00";
  healthText.textContent = `Health: ${playerHealth} / ${maxHealth}`;
}

function isPlayerGrounded() {
  return playerBody.position.y >= canvas.height - groundHeight - radius - 1 && Math.abs(playerBody.velocity.y) < 2;
}

function getRandomPosition(min, max) {
  return Math.random() * (max - min) + min;
}

function createEnemy() {
  const margin = radius * 3;
  const maxY = canvas.height - groundHeight - margin;
  let newX;
  let newY;
  let safeDistance = false;

  while (!safeDistance) {
    newX = getRandomPosition(margin, canvas.width - margin);
    newY = getRandomPosition(margin, maxY);
    const dxPlayer = newX - playerBody.position.x;
    const dyPlayer = newY - playerBody.position.y;
    const currentDistance = Math.sqrt(dxPlayer * dxPlayer + dyPlayer * dyPlayer);
    const enemySafe = enemies.every((enemy) => {
      const dxEnemy = newX - enemy.x;
      const dyEnemy = newY - enemy.y;
      return Math.sqrt(dxEnemy * dxEnemy + dyEnemy * dyEnemy) > 100;
    });
    safeDistance = currentDistance > 100 && enemySafe;
  }

  return {
    x: newX,
    y: newY,
    dx: Math.sign(Math.random() - 0.5) * enemyBallSpeed || enemyBallSpeed,
    dy: Math.sign(Math.random() - 0.5) * enemyBallSpeed || enemyBallSpeed,
    health: maxEnemyHealth,
    alive: true
  };
}

function spawnEnemy() {
  enemies.push(createEnemy());
}

function createProjectile(startX, startY, dirX, dirY, type = "enemy") {
  const speed = type === "player" ? playerProjectileSpeed : enemyProjectileSpeed;
  const length = Math.sqrt(dirX * dirX + dirY * dirY);
  const normalizedDx = length === 0 ? speed : (dirX / length) * speed;
  const normalizedDy = length === 0 ? 0 : (dirY / length) * speed;

  return {
    x: startX,
    y: startY,
    dx: normalizedDx,
    dy: normalizedDy,
    life: projectileLife,
    active: true,
    type,
    bounces: 0,
    maxBounces: type === "player" ? 1 : 0
  };
}

function collides(ax, ay, ar, bx, by, br) {
  const distance = Math.hypot(ax - bx, ay - by);
  return distance <= ar + br;
}

function drawGameOver() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = "28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 10);
  ctx.font = "18px sans-serif";
  ctx.fillText(`Final score: ${score}`, canvas.width / 2, canvas.height / 2 + 24);
}

function resetGame() {
  playerHealth = maxHealth;
  score = 0;
  running = false;
  shotTimer = 0;
  enemyProjectiles.length = 0;
  playerProjectiles.length = 0;
  enemies.length = 0;
  Body.setPosition(playerBody, { x: canvas.width / 2, y: 120 });
  Body.setVelocity(playerBody, { x: 0, y: 0 });
  keys = { w: false, a: false, s: false, d: false };
  jumpActive = false;
  jumpTime = 0;
  spawnEnemy();
  updateHud();
  drawScene();
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0a0";
  ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);
  updateSprite();
  drawPlayer();
  drawEnemy();
}

function draw() {
  if (!running) {
    drawScene();
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0a0";
  ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);

  for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    const proj = enemyProjectiles[i];
    if (!proj.active) {
      enemyProjectiles.splice(i, 1);
      continue;
    }

    proj.life--;
    const targetDx = playerBody.position.x - proj.x;
    const targetDy = playerBody.position.y - proj.y;
    const targetDist = Math.hypot(targetDx, targetDy);
    if (targetDist > 0) {
      proj.dx += (targetDx / targetDist) * homingStrength;
      proj.dy += (targetDy / targetDist) * homingStrength;
      const currentLen = Math.hypot(proj.dx, proj.dy);
      proj.dx = (proj.dx / currentLen) * enemyProjectileSpeed;
      proj.dy = (proj.dy / currentLen) * enemyProjectileSpeed;
    }

    proj.x += proj.dx;
    proj.y += proj.dy;

    if (collides(proj.x, proj.y, projectileRadius, playerBody.position.x, playerBody.position.y, playerHitboxRadius)) {
      playerHealth = Math.max(0, playerHealth - 1);
      proj.active = false;
      updateHud();
      if (playerHealth <= 0) {
        running = false;
        drawGameOver();
        return;
      }
    }

    if (proj.life <= 0 || proj.x - projectileRadius < 0 || proj.x + projectileRadius > canvas.width ||
        proj.y - projectileRadius < 0 || proj.y + projectileRadius > canvas.height) {
      proj.active = false;
    }

    if (proj.active) {
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, projectileRadius, 0, Math.PI * 2);
      ctx.fillStyle = "red";
      ctx.fill();
      ctx.closePath();
    } else {
      enemyProjectiles.splice(i, 1);
    }
  }

  for (let i = playerProjectiles.length - 1; i >= 0; i--) {
    const proj = playerProjectiles[i];
    if (!proj.active) {
      playerProjectiles.splice(i, 1);
      continue;
    }

    proj.life--;
    if (proj.type === "player") {
      const targetEnemy = enemies.reduce((closest, enemy) => {
        if (!enemy.alive) return closest;
        const dxEnemy = enemy.x - proj.x;
        const dyEnemy = enemy.y - proj.y;
        const dist = Math.hypot(dxEnemy, dyEnemy);
        if (!closest || dist < closest.dist) {
          return { enemy, dist, dx: dxEnemy, dy: dyEnemy };
        }
        return closest;
      }, null);
      if (targetEnemy) {
        proj.dx += (targetEnemy.dx / targetEnemy.dist) * playerHomingStrength;
        proj.dy += (targetEnemy.dy / targetEnemy.dist) * playerHomingStrength;
        const len = Math.hypot(proj.dx, proj.dy);
        proj.dx = (proj.dx / len) * playerProjectileSpeed;
        proj.dy = (proj.dy / len) * playerProjectileSpeed;
      }
    }
    proj.x += proj.dx;
    proj.y += proj.dy;

    if (proj.type === "player") {
      if (proj.x - projectileRadius < 0 || proj.x + projectileRadius > canvas.width) {
        proj.dx = -proj.dx;
        proj.bounces++;
        proj.x = Math.max(projectileRadius, Math.min(canvas.width - projectileRadius, proj.x));
      }
      if (proj.y - projectileRadius < 0 || proj.y + projectileRadius > canvas.height) {
        proj.dy = -proj.dy;
        proj.bounces++;
        proj.y = Math.max(projectileRadius, Math.min(canvas.height - projectileRadius, proj.y));
      }
      if (proj.bounces >= proj.maxBounces) {
        proj.active = false;
      }
    }

    enemies.some((enemy) => {
      if (!proj.active || !enemy.alive) return false;
      if (collides(proj.x, proj.y, projectileRadius, enemy.x, enemy.y, enemyHitboxRadius)) {
        enemy.health = Math.max(0, enemy.health - 1);
        proj.active = false;

        if (enemy.health <= 0) {
          score += 1;
          enemy.alive = false;
          enemyProjectiles.length = 0;
          spawnEnemy();
          if (score % 3 === 0) {
            spawnEnemy();
          }
        }

        updateHud();
        return true;
      }
      return false;
    });

    if (proj.life <= 0 || proj.x - projectileRadius < 0 || proj.x + projectileRadius > canvas.width ||
        proj.y - projectileRadius < 0 || proj.y + projectileRadius > canvas.height) {
      proj.active = false;
    }

    if (proj.active) {
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, projectileRadius, 0, Math.PI * 2);
      ctx.fillStyle = "cyan";
      ctx.fill();
      ctx.closePath();
    } else {
      playerProjectiles.splice(i, 1);
    }
  }

  const velocity = playerBody.velocity;
  const grounded = isPlayerGrounded();
  let vx = velocity.x;

  if (keys.a) vx = -playerBallSpeed;
  else if (keys.d) vx = playerBallSpeed;
  else if (grounded) vx = 0;

  if (jumpActive) {
    Body.setVelocity(playerBody, { x: vx, y: -playerJumpForce });
    jumpActive = false;
  } else {
    Body.setVelocity(playerBody, { x: vx, y: velocity.y });
  }

  Engine.update(engine, 1000 / 60);

  updateSprite();

  if (playerBody.position.x - radius < 0) {
    Body.setPosition(playerBody, { x: radius, y: playerBody.position.y });
    Body.setVelocity(playerBody, { x: 0, y: velocity.y });
  }
  if (playerBody.position.x + radius > canvas.width) {
    Body.setPosition(playerBody, { x: canvas.width - radius, y: playerBody.position.y });
    Body.setVelocity(playerBody, { x: 0, y: velocity.y });
  }
  if (playerBody.position.y - radius < 0) {
    Body.setPosition(playerBody, { x: playerBody.position.x, y: radius });
    Body.setVelocity(playerBody, { x: velocity.x, y: 0 });
  }
  if (playerBody.position.y + radius > canvas.height - groundHeight) {
    Body.setPosition(playerBody, { x: playerBody.position.x, y: canvas.height - groundHeight - radius });
    Body.setVelocity(playerBody, { x: velocity.x, y: 0 });
  }

  drawPlayer();
  drawEnemy();

  const groundTop = canvas.height - groundHeight;
  enemies.forEach((enemy) => {
    if (!enemy.alive) return;
    if (enemy.x + enemy.dx > canvas.width - radius || enemy.x + enemy.dx < radius) enemy.dx = -enemy.dx;
    if (enemy.y + enemy.dy > groundTop - radius || enemy.y + enemy.dy < radius) enemy.dy = -enemy.dy;

    const nextX = enemy.x + enemy.dx;
    const nextY = enemy.y + enemy.dy;
    const barrierLeft = enemyBarrier.x - enemyBarrier.halfWidth - radius;
    const barrierRight = enemyBarrier.x + enemyBarrier.halfWidth + radius;
    const barrierTop = enemyBarrier.y - enemyBarrier.halfHeight - radius;
    const barrierBottom = enemyBarrier.y + enemyBarrier.halfHeight + radius;
    if (nextX > barrierLeft && nextX < barrierRight && nextY > barrierTop && nextY < barrierBottom) {
      enemy.dy = Math.abs(enemy.dy);
    }

    enemy.x += enemy.dx;
    enemy.y += enemy.dy;
  });

  shotTimer++;
  if (shotTimer >= shotInterval) {
    enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      enemyProjectiles.push(createProjectile(enemy.x, enemy.y, playerBody.position.x - enemy.x, playerBody.position.y - enemy.y));
    });
    shotTimer = 0;
  }

  requestAnimationFrame(draw);
}

spawnEnemy();
updateHud();
drawScene();

document.getElementById("startBtn").addEventListener("click", () => {
  if (!running && playerHealth > 0) {
    running = true;
    gameStarted = true;
    animationId = requestAnimationFrame(draw);
  }
});

document.getElementById("stopBtn").addEventListener("click", () => {
  running = false;
});

document.getElementById("restartBtn").addEventListener("click", () => {
  resetGame();
});

document.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  pointerX = event.clientX - rect.left;
  pointerY = event.clientY - rect.top;
});

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if ( event.code === "Space" && playerHealth > 0) {
    playerProjectiles.push(createProjectile(playerBody.position.x,
        playerBody.position.y,
        pointerX - playerBody.position.x,
        pointerY - playerBody.position.y,
        "player"));
    return;
  }

  if (key === "w" && playerHealth > 0 && isPlayerGrounded()) {
    jumpActive = true;
  }

  if (key === "a") keys.a = true;
  else if (key === "d") keys.d = true;
});

document.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  if (key === "w") keys.w = false;
  else if (key === "a") keys.a = false;
  else if (key === "d") keys.d = false;
});

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // Update ground position to match new canvas height
  Body.setPosition(ground, { x: canvas.width / 2, y: canvas.height - groundHeight / 2 });
  // Optionally reposition player if too low
  if (playerBody.position.y > canvas.height - groundHeight - radius) {
    Body.setPosition(playerBody, { x: playerBody.position.x, y: canvas.height - groundHeight - radius });
  }
});