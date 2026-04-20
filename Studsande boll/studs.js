const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

// Bollens egenskaper
let x = canvas.width / 2;
let y = canvas.height / 2;
let dx = 2; 
let dy = 3; 
const radius = 10;

let running = true;

function drawBall() {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "black";
  ctx.fill();
  ctx.closePath();
}

function draw() {
  if (!running) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBall();

  // Studs mot kanterna
  if (x + dx > canvas.width - radius || x + dx < radius) {
    dx = -dx;
  }
  if (y + dy > canvas.height - radius || y + dy < radius) {
    dy = -dy;
  }

  x += dx;
  y += dy;

  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);

// Start-knappen
document.getElementById("startBtn").addEventListener("click", () => {
  if (!running) {
    running = true;
    animationId = requestAnimationFrame(draw);
  }
  
});
// Stop-knapp
document.getElementById("stopBtn").addEventListener("click", () => {
  running = false;
});