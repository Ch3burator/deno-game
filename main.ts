import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const kv = await Deno.openKv();

serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Сохранение результата
  if (req.method === "POST" && pathname === "/save-score") {
    try {
      const { player, score } = await req.json();
      if (typeof player !== "string" || !player.trim()) {
        return new Response(JSON.stringify({ error: "Player must be a non-empty string" }), {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        });
      }
      if (typeof score !== "number" || isNaN(score)) {
        return new Response(JSON.stringify({ error: "Score must be a valid number" }), {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        });
      }
      const sanitizedPlayer = player.trim().slice(0, 50);
      await kv.set(["scores", sanitizedPlayer], score);
      return new Response(JSON.stringify({ status: "success" }), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    } catch (error) {
      console.error("Error in /save-score:", error);
      return new Response(JSON.stringify({ error: "Server error: " + error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
  }

  // Получение таблицы лидеров
  if (req.method === "GET" && pathname === "/leaderboard") {
    try {
      const scores: { player: string; score: number }[] = [];
      for await (const entry of kv.list({ prefix: ["scores"] })) {
        scores.push({ player: entry.key[1] as string, score: entry.value as number });
      }
      scores.sort((a, b) => b.score - a.score);
      return new Response(JSON.stringify(scores), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    } catch (error) {
      console.error("Error in /leaderboard:", error);
      return new Response(JSON.stringify({ error: "Server error: " + error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
  }

  // Главная страница с игрой
  if (pathname === "/") {
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Flappy Bird</title>
          <style>
            body { margin: 0; font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; }
            canvas { border: 1px solid black; }
            #ui { margin-top: 10px; text-align: center; }
            #score { font-size: 24px; margin: 10px 0; }
            form { margin: 10px 0; }
            input, button { padding: 8px; margin: 5px; }
            table { width: 300px; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <canvas id="gameCanvas" width="400" height="600"></canvas>
          <div id="ui">
            <div id="score">Счёт: 0</div>
            <form id="scoreForm" style="display: none;">
              <input type="text" id="player" placeholder="Имя игрока" required />
              <input type="number" id="finalScore" readonly />
              <button type="submit">Сохранить результат</button>
            </form>
            <h2>Таблица лидеров</h2>
            <table id="leaderboard">
              <thead>
                <tr><th>Игрок</th><th>Очки</th></tr>
              </thead>
              <tbody id="leaderboardBody"></tbody>
            </table>
          </div>
          <script type="module">
            import * as THREE from 'https://esm.sh/three@0.168.0';

            const canvas = document.getElementById('gameCanvas');
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, 400 / 600, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ canvas });
            camera.position.z = 5;

            // Птица
            const birdGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
            const birdMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            const bird = new THREE.Mesh(birdGeometry, birdMaterial);
            bird.position.set(-1, 0, 0);
            scene.add(bird);

            // Земля
            const groundGeometry = new THREE.PlaneGeometry(10, 1);
            const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            const ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.position.set(0, -3, 0);
            scene.add(ground);

            // Параметры игры
            let velocityY = 0;
            let gravity = -0.01;
            let jump = 0.2;
            let pipes = [];
            let score = 0;
            let gameOver = false;
            let lastPipeX = 5;

            // Создание трубы
            function createPipe() {
              const gap = 1.5;
              const gapY = (Math.random() * 2) - 1;
              const topHeight = 3 + gapY + gap / 2;
              const bottomHeight = 3 - gapY - gap / 2;

              const topGeometry = new THREE.BoxGeometry(0.5, topHeight, 0.2);
              const bottomGeometry = new THREE.BoxGeometry(0.5, bottomHeight, 0.2);
              const pipeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });

              const topPipe = new THREE.Mesh(topGeometry, pipeMaterial);
              const bottomPipe = new THREE.Mesh(bottomGeometry, pipeMaterial);
              topPipe.position.set(lastPipeX, topHeight / 2, 0);
              bottomPipe.position.set(lastPipeX, -bottomHeight / 2, 0);

              scene.add(topPipe, bottomPipe);
              pipes.push({ top: topPipe, bottom: bottomPipe, scored: false });
              lastPipeX += 3;
            }

            // Проверка столкновений
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

            // Обработка прыжка
            document.addEventListener('keydown', (event) => {
              if (event.code === 'Space' && !gameOver) {
                velocityY = jump;
              }
            });

            // Основной игровой цикл
            function animate() {
              if (gameOver) return;

              requestAnimationFrame(animate);

              // Движение птицы
              velocityY += gravity;
              bird.position.y += velocityY;

              // Движение труб
              pipes.forEach((pipe) => {
                pipe.top.position.x -= 0.05;
                pipe.bottom.position.x -= 0.05;
                if (pipe.top.position.x < -1 && !pipe.scored) {
                  score++;
                  pipe.scored = true;
                  document.getElementById('score').textContent = 'Счёт: ' + score;
                }
              });

              // Удаление труб за экраном
              pipes = pipes.filter((pipe) => pipe.top.position.x > -5);

              // Создание новых труб
              if (Math.random() < 0.02) {
                createPipe();
              }

              // Проверка столкновений
              if (checkCollision()) {
                gameOver = true;
                document.getElementById('scoreForm').style.display = 'block';
                document.getElementById('finalScore').value = score;
              }

              renderer.render(scene, camera);
            }

            // Сброс игры
            function resetGame() {
              bird.position.set(-1, 0, 0);
              velocityY = 0;
              score = 0;
              gameOver = false;
              pipes.forEach((pipe) => {
                scene.remove(pipe.top);
                scene.remove(pipe.bottom);
              });
              pipes = [];
              lastPipeX = 5;
              document.get Three.js
              document.getElementById('score').textContent = 'Счёт: 0';
              document.getElementById('scoreForm').style.display = 'none';
              animate();
            }

            // Отправка результата
            document.getElementById('scoreForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              const player = document.getElementById('player').value;
              const score = parseInt(document.getElementById('finalScore').value); // Гарантируем число
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

            // Загрузка таблицы лидеров
            async function loadLeaderboard() {
              try {
                const response = await fetch('/leaderboard');
                const scores = await response.json();
                const tbody = document.getElementById('leaderboardBody');
                tbody.innerHTML = '';
                scores.forEach(({ player, score }) => {
                  const row = document.createElement('tr');
                  row.innerHTML = \`<td>\${player}</td><td>\${score}</td>\`;
                  tbody.appendChild(row);
                });
              } catch (error) {
                console.error('Error loading leaderboard:', error);
              }
            }

            // Начало игры
            loadLeaderboard();
            animate();
          </script>
        </body>
      </html>
      `,
      {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

  return new Response("Not Found", { status: 404 });
});