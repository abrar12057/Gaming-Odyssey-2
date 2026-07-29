const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const bird = { x: 82, y: 300, size: 28, vy: 0, gravity: 0.42, jump: -7.4, tilt: 0 };
let pipes = [];
let coins = [];
let score = 0;
let bestScore = Number(localStorage.getItem('aeroDodgeBest')) || 0;
let frame = 0;
let gameOver = false;
let gameStarted = false;
let worldOffset = 0;

function endGame() {
    if (gameOver) return;
    gameOver = true;
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('aeroDodgeBest', bestScore);
    }
}

function reset() {
    Object.assign(bird, { y: 300, vy: 0, tilt: 0 });
    pipes = [];
    coins = [];
    score = 0;
    frame = 0;
    worldOffset = 0;
    gameOver = false;
    gameStarted = true;
}

function flap() {
    if (gameOver) reset();
    else if (!gameStarted) gameStarted = true;
    bird.vy = bird.jump;
}

window.addEventListener('keydown', event => {
    if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault();
        flap();
    }
});
window.addEventListener('pointerdown', flap);

function createPipe() {
    const gap = Math.max(118, 150 - score * 1.2);
    const top = Math.random() * (canvas.height - gap - 150) + 70;
    pipes.push({ x: canvas.width + 20, top, bottom: canvas.height - top - gap, passed: false });
    coins.push({ x: canvas.width + 45, y: top + gap / 2, collected: false });
}

function update() {
    if (!gameStarted || gameOver) return;

    const speed = Math.min(3.2 + score * 0.08, 6.2);
    worldOffset = (worldOffset + speed * 0.35) % canvas.width;
    bird.vy += bird.gravity;
    bird.y += bird.vy;
    bird.tilt = Math.max(-0.5, Math.min(0.8, bird.vy * 0.08));

    if (bird.y + bird.size > canvas.height - 34 || bird.y < 0) endGame();
    if (frame % 92 === 0) createPipe();

    pipes.forEach(pipe => {
        pipe.x -= speed;
        if (!pipe.passed && pipe.x + 56 < bird.x) {
            score++;
            pipe.passed = true;
        }
        const overlapsPipe = bird.x < pipe.x + 58 && bird.x + bird.size > pipe.x;
        if (overlapsPipe && (bird.y < pipe.top || bird.y + bird.size > canvas.height - pipe.bottom)) endGame();
    });

    coins.forEach(coin => {
        coin.x -= speed;
        const distance = Math.hypot(bird.x + bird.size / 2 - coin.x, bird.y + bird.size / 2 - coin.y);
        if (!coin.collected && distance < 24) {
            coin.collected = true;
            score += 2;
        }
    });

    pipes = pipes.filter(pipe => pipe.x > -70);
    coins = coins.filter(coin => coin.x > -25 && !coin.collected);
    frame++;
}

function drawCloud(x, y, scale) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    [[0, 10, 18], [20, 0, 24], [43, 12, 16]].forEach(([cx, cy, r]) => {
        ctx.beginPath();
        ctx.arc(x + cx * scale, y + cy * scale, r * scale, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, '#42b7ef');
    sky.addColorStop(0.62, '#a6e7ff');
    sky.addColorStop(1, '#e9fbff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawCloud(50 - worldOffset * 0.25, 100, 0.7);
    drawCloud(255 - worldOffset * 0.18, 175, 0.45);
    drawCloud(420 - worldOffset * 0.25, 70, 0.62);

    ctx.fillStyle = '#82d36d';
    ctx.beginPath();
    ctx.moveTo(0, 510);
    for (let x = 0; x <= canvas.width + 40; x += 40) {
        ctx.quadraticCurveTo(x + 20, 470 + Math.sin((x + worldOffset) * 0.03) * 16, x + 40, 510);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fill();

    ctx.fillStyle = '#5ab354';
    ctx.fillRect(0, canvas.height - 34, canvas.width, 34);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let x = -worldOffset; x < canvas.width; x += 28) ctx.fillRect(x, canvas.height - 34, 14, 5);
}

function drawPipe(pipe) {
    const pipeGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + 58, 0);
    pipeGradient.addColorStop(0, '#167a44');
    pipeGradient.addColorStop(0.28, '#45cb72');
    pipeGradient.addColorStop(0.72, '#2ca95a');
    pipeGradient.addColorStop(1, '#0e6639');
    ctx.fillStyle = pipeGradient;
    ctx.fillRect(pipe.x, 0, 58, pipe.top);
    ctx.fillRect(pipe.x, canvas.height - pipe.bottom, 58, pipe.bottom);
    ctx.fillStyle = '#66dd84';
    ctx.fillRect(pipe.x - 5, pipe.top - 20, 68, 20);
    ctx.fillRect(pipe.x - 5, canvas.height - pipe.bottom, 68, 20);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 3;
    ctx.strokeRect(pipe.x, 0, 58, pipe.top);
    ctx.strokeRect(pipe.x, canvas.height - pipe.bottom, 58, pipe.bottom);
}

function drawBird() {
    ctx.save();
    ctx.translate(bird.x + bird.size / 2, bird.y + bird.size / 2);
    ctx.rotate(bird.tilt);
    ctx.fillStyle = '#f9b31a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd75a';
    ctx.beginPath();
    ctx.ellipse(-5, 4, 10, 5, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f47a32';
    ctx.beginPath();
    ctx.moveTo(13, -1); ctx.lineTo(23, 4); ctx.lineTo(13, 7); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(5, -5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d2c3a';
    ctx.beginPath();
    ctx.arc(6, -5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawCoin(coin) {
    ctx.save();
    ctx.translate(coin.x, coin.y);
    ctx.rotate(frame * 0.08);
    ctx.fillStyle = '#ffe269';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d99118';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
}

function drawOverlay(title, subtitle) {
    ctx.fillStyle = 'rgba(7, 32, 55, 0.48)';
    ctx.fillRect(22, 215, canvas.width - 44, 150);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(22, 215, canvas.width - 44, 150);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = '900 34px Arial';
    ctx.fillText(title, canvas.width / 2, 270);
    ctx.font = '600 16px Arial';
    ctx.fillText(subtitle, canvas.width / 2, 305);
    ctx.fillStyle = '#ffe269';
    ctx.font = '700 14px Arial';
    ctx.fillText('COLLECT GOLD COINS FOR BONUS POINTS', canvas.width / 2, 337);
    ctx.textAlign = 'left';
}

function draw() {
    drawBackground();
    pipes.forEach(drawPipe);
    coins.forEach(drawCoin);
    drawBird();
    ctx.fillStyle = '#fff';
    ctx.font = '900 24px Arial';
    ctx.fillText(`SCORE ${score}`, 18, 38);
    ctx.font = '700 14px Arial';
    ctx.fillText(`BEST ${bestScore}`, 20, 61);
    if (!gameStarted) drawOverlay('AERO DODGE', 'Click, tap, or press Space to fly');
    if (gameOver) drawOverlay('FLIGHT OVER', 'Tap, click, or press Space to try again');
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
