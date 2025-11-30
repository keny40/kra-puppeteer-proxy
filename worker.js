export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get("url");

    if (!target) {
      return new Response(
        JSON.stringify({ error: "Missing ?url=" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    try {
      const response = await fetch(target, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json,text/plain,*/*"
        }
      });

      const text = await response.text();

      return new Response(text, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Content-Type": response.headers.get("content-type") || "text/plain"
        }
      });

    } catch (err) {
      return new Response(
        JSON.stringify({ error: true, message: err.toString() }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }
};
