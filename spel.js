const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 18,
    speed: 6,
    color: '#f59e0b',
};

const keyState = {
    w: false,
    a: false,
    s: false,
    d: false,
};

function drawBall() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function update() {
    if (keyState.w) ball.y -= ball.speed;
    if (keyState.s) ball.y += ball.speed;
    if (keyState.a) ball.x -= ball.speed;
    if (keyState.d) ball.x += ball.speed;

    ball.x = clamp(ball.x, ball.radius, canvas.width - ball.radius);
    ball.y = clamp(ball.y, ball.radius, canvas.height - ball.radius);

    drawBall();
    requestAnimationFrame(update);
}

window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (keyState.hasOwnProperty(key)) {
        keyState[key] = true;
        event.preventDefault();
    }
});

window.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (keyState.hasOwnProperty(key)) {
        keyState[key] = false;
        event.preventDefault();
    }
});

canvas.addEventListener('mousedown', () => {
    canvas.focus();
});

canvas.setAttribute('tabindex', '0');

update();
