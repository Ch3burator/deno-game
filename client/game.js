import * as THREE from 'https://esm.sh/three@0.168.0';
import { loadLeaderboard } from './leaderboard.js';

const canvas = document.getElementById('gameCanvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 500 / 750, 0.1, 1000); // Обновлено соотношение сторон
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
renderer.setClearColor(0x000000, 0);
camera.position.z = 5;

// Направленный свет для теней под углом 30 градусов из правого верхнего угла
const light = new THREE.DirectionalLight(0xffffff, 0.8);
light.position.set(5, 5, 2);
light.castShadow = true;
light.shadow.mapSize.width = 512;
light.shadow.mapSize.height = 512;
light.shadow.camera.left = -5;
light.shadow.camera.right = 5;
light.shadow.camera.top = 5;
light.shadow.camera.bottom = -5;
light.shadow.camera.near = 0.5;
light.shadow.camera.far = 15;
scene.add(light);

// Дополнительный рассеянный свет для большей яркости
const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambientLight);

// Включаем тени в рендерере
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Небо (однородный голубой фон, чуть ярче)
const skyGeometry = new THREE.PlaneGeometry(20, 20);
const skyMaterial = new THREE.MeshBasicMaterial({ color: 0xB0E0E6, side: THREE.DoubleSide });
const sky = new THREE.Mesh(skyGeometry, skyMaterial);
sky.position.set(0, 0, -5);
scene.add(sky);

// Птица
const birdGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
const birdMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00 });
const bird = new THREE.Mesh(birdGeometry, birdMaterial);
bird.position.set(-1, 0, 0);
bird.castShadow = true;
scene.add(bird);

// Земля (чуть светлее)
const groundGeometry = new THREE.PlaneGeometry(10, 1);
const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x228B22 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.position.set(0, -3.5, 0);
ground.receiveShadow = true;
scene.add(ground);

// Облака
const clouds = [];
function createCloud() {
    const cloudGeometry = new THREE.BoxGeometry(1, 0.5, 0.2);
    const cloudMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
    const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
    cloud.position.set(5 + Math.random() * 10, 2 + Math.random() * 2, -1);
    cloud.castShadow = false;
    cloud.receiveShadow = false;
    scene.add(cloud);
    clouds.push(cloud);
}
for (let i = 0; i < 5; i++) createCloud();

// Параметры игры
let velocityY = 0;
let gravity = -0.01;
let jump = 0.2;
let pipes = [];
let score = 0;
let gameOver = false;
let paused = true;
let lastPipeX = 5;
const maxBirdY = 4;

// Показываем кнопку Play при загрузке
document.getElementById('restartButton').style.display = 'block';

// Добавляем элемент для отображения результата
const gameOverText = document.createElement('div');
gameOverText.id = 'gameOverText';
gameOverText.style.position = 'absolute';
gameOverText.style.top = '150px';
gameOverText.style.left = '50%';
gameOverText.style.transform = 'translateX(-50%)';
gameOverText.style.color = 'white';
gameOverText.style.fontSize = '24px';
gameOverText.style.fontFamily = 'Arial';
gameOverText.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
gameOverText.style.display = 'none';
document.querySelector('.game-container').appendChild(gameOverText);

function createPipe() {
    const gap = 4;
    const minHeight = 1.0;
    const maxHeight = 6 - gap;
    const gapY = Math.random() * (maxHeight - minHeight) + minHeight;

    const bottomHeight = gapY + 3;
    const topHeight = 9 - gapY - gap;

    const topGeometry = new THREE.BoxGeometry(0.5, topHeight, 0.2);
    const bottomGeometry = new THREE.BoxGeometry(0.5, bottomHeight, 0.2);
    const pipeMaterial = new THREE.MeshPhongMaterial({ color: 0x00ffff });
    const pipeMaterial2 = new THREE.MeshPhongMaterial({ color: 0x00ff00 });

    const topPipe = new THREE.Mesh(topGeometry, pipeMaterial);
    const bottomPipe = new THREE.Mesh(bottomGeometry, pipeMaterial2);

    bottomPipe.position.set(lastPipeX, -4 + bottomHeight / 2, 0);
    topPipe.position.set(lastPipeX, 6 - topHeight / 2, 0);

    topPipe.castShadow = true;
    bottomPipe.castShadow = true;
    topPipe.receiveShadow = true;
    bottomPipe.receiveShadow = true;

    scene.add(topPipe, bottomPipe);
    pipes.push({ top: topPipe, bottom: bottomPipe, scored: false });
    lastPipeX += 3;
}

function checkCollision() {
    const birdBox = new THREE.Box3().setFromObject(bird);
    for (const pipe of pipes) {
        const topBox = new THREE.Box3().setFromObject(pipe.top);
        const bottomBox = new THREE.Box3().setFromObject(pipe.bottom);
        if (birdBox.intersectsBox(topBox) || birdBox.intersectsBox(bottomBox)) {
            return true;
        }
    }
    if (bird.position.y < -2.9) {
        return true;
    }
    return false;
}

function startGame() {
    if (paused && !gameOver) {
        paused = false;
        velocityY = jump;
        document.getElementById('restartButton').style.display = 'none';
        gameOverText.style.display = 'none';
    }
}

function jumpBird() {
    if (!gameOver) {
        velocityY = jump;
    }
}

document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        if (paused && !gameOver) {
            startGame();
        }
        jumpBird();
    }
});

canvas.addEventListener('click', () => {
    if (paused && !gameOver) {
        startGame();
    }
    jumpBird();
});

document.getElementById('restartButton').addEventListener('click', () => {
    if (gameOver) {
        resetGame();
    }
    startGame();
});

function animate() {
    requestAnimationFrame(animate);

    if (gameOver || paused) {
        renderer.render(scene, camera);
        return;
    }

    velocityY += gravity;
    bird.position.y += velocityY;

    if (bird.position.y > maxBirdY) {
        bird.position.y = maxBirdY;
        velocityY = 0;
    }

    pipes.forEach((pipe) => {
        pipe.top.position.x -= 0.05;
        pipe.bottom.position.x -= 0.05;
        if (pipe.top.position.x < -1 && !pipe.scored) {
            score++;
            pipe.scored = true;
            document.getElementById('score').textContent = 'Счёт: ' + score;
        }
    });

    clouds.forEach((cloud) => {
        cloud.position.x -= 0.03;
        if (cloud.position.x < -5) {
            cloud.position.x = 5 + Math.random() * 10;
            cloud.position.y = 2 + Math.random() * 2;
        }
    });

    pipes = pipes.filter((pipe) => pipe.top.position.x > -5);

    if (Math.random() < 0.02) {
        createPipe();
    }

    if (checkCollision()) {
        gameOver = true;
        document.getElementById('scoreForm').style.display = 'block';
        document.getElementById('restartButton').style.display = 'block';
        document.getElementById('finalScore').value = score;
        gameOverText.style.display = 'block';
        gameOverText.textContent = `Игра окончена! Ваш счёт: ${score}`;
    }

    renderer.render(scene, camera);
}

function resetGame() {
    bird.position.set(-1, 0, 0);
    velocityY = 0;
    score = 0;
    gameOver = false;
    paused = true;
    pipes.forEach((pipe) => {
        scene.remove(pipe.top);
        scene.remove(pipe.bottom);
    });
    pipes = [];
    lastPipeX = 5;
    document.getElementById('score').textContent = 'Счёт: 0';
    document.getElementById('scoreForm').style.display = 'none';
    document.getElementById('restartButton').style.display = 'block';
    gameOverText.style.display = 'none';
}

document.getElementById('scoreForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const player = document.getElementById('player').value;
    const score = parseInt(document.getElementById('finalScore').value);
    const response = await fetch('/save-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player, score }),
    });
    const result = await response.json();
    if (response.ok) {
        alert('Результат сохранён!');
        document.getElementById('scoreForm').reset();
        loadLeaderboard();
        resetGame();
    } else {
        alert('Ошибка при сохранении: ' + result.error);
    }
});

function initGame() {
    loadLeaderboard();
}

export { initGame, animate, resetGame };