const kv = await Deno.openKv();

export async function handleRoutes(req: Request): Promise<Response> {
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

  // Статические файлы (CSS)
  if (pathname === "/styles.css") {
    try {
      const css = await Deno.readTextFile("./client/styles.css");
      return new Response(css, {
        headers: { "Content-Type": "text/css; charset=utf-8" },
      });
    } catch (error) {
      console.error("Error serving styles.css:", error);
      return new Response("CSS not found", { status: 404 });
    }
  }

  // Статические файлы (JS)
  if (pathname === "/game.js") {
    try {
      const js = await Deno.readTextFile("./client/game.js");
      return new Response(js, {
        headers: { "Content-Type": "application/javascript; charset=utf-8" },
      });
    } catch (error) {
      console.error("Error serving game.js:", error);
      return new Response("JS not found", { status: 404 });
    }
  }

  if (pathname === "/leaderboard.js") {
    try {
      const js = await Deno.readTextFile("./client/leaderboard.js");
      return new Response(js, {
        headers: { "Content-Type": "application/javascript; charset=utf-8" },
      });
    } catch (error) {
      console.error("Error serving leaderboard.js:", error);
      return new Response("JS not found", { status: 404 });
    }
  }

  // Favicon
  if (pathname === "/static/favicon.png") {
    try {
      const favicon = await Deno.readFile("./client/static/favicon.png");
      return new Response(favicon, {
        headers: { "Content-Type": "image/png" },
      });
    } catch (error) {
      console.error("Error serving favicon.png:", error);
      return new Response("Favicon not found", { status: 404 });
    }
  }

  // Главная страница
  if (pathname === "/") {
    try {
      const html = await Deno.readTextFile("./client/index.html");
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch (error) {
      console.error("Error serving index.html:", error);
      return new Response("HTML not found", { status: 404 });
    }
  }

  return new Response("Not Found", { status: 404 });
}