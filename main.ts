import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const kv = await Deno.openKv();

serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Сохранение результата
  if (req.method === "POST" && pathname === "/save-score") {
    const { player, score } = await req.json();
    if (player && typeof score === "number") {
      await kv.set(["scores", player], score);
      return new Response(JSON.stringify({ status: "success" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Invalid data" }), { status: 400 });
  }

  // Получение таблицы лидеров
  if (req.method === "GET" && pathname === "/leaderboard") {
    const scores: { player: string; score: number }[] = [];
    for await (const entry of kv.list({ prefix: ["scores"] })) {
      scores.push({ player: entry.key[1] as string, score: entry.value as number });
    }
    scores.sort((a, b) => b.score - a.score); // Сортировка по убыванию очков
    return new Response(JSON.stringify(scores), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Главная страница
if (pathname === "/") {
  return new Response(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Игра: Таблица лидеров</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { text-align: center; }
          form { margin-bottom: 20px; }
          input, button { padding: 8px; margin: 5px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>Игра: Таблица лидеров</h1>
        <form id="scoreForm">
          <input type="text" id="player" placeholder="Имя игрока" required />
          <input type="number" id="score" placeholder="Очки" required />
          <button type="submit">Сохранить результат</button>
        </form>
        <h2>Таблица лидеров</h2>
        <table id="leaderboard">
          <thead>
            <tr><th>Игрок</th><th>Очки</th></tr>
          </thead>
          <tbody id="leaderboardBody"></tbody>
        </table>
        <script>
          // Отправка результата
          document.getElementById("scoreForm").addEventListener("submit", async (e) => {
            e.preventDefault();
            const player = document.getElementById("player").value;
            const score = parseInt(document.getElementById("score").value);
            const response = await fetch("/save-score", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ player, score }),
            });
            if (response.ok) {
              alert("Результат сохранён!");
              document.getElementById("scoreForm").reset();
              loadLeaderboard();
            } else {
              alert("Ошибка при сохранении!");
            }
          });

          // Загрузка таблицы лидеров
          async function loadLeaderboard() {
            const response = await fetch("/leaderboard");
            const scores = await response.json();
            const tbody = document.getElementById("leaderboardBody");
            tbody.innerHTML = "";
            scores.forEach(({ player, score }) => {
              const row = document.createElement("tr");
              row.innerHTML = \`<td>\${player}</td><td>\${score}</td>\`;
              tbody.appendChild(row);
            });
          }

          // Загрузка таблицы при открытии страницы
          loadLeaderboard();
        </script>
      </body>
    </html>
    `,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8", // Явно указываем UTF-8
      },
    }
  );
}

  return new Response("Not Found", { status: 404 });
});