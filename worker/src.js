// Cloudflare Worker — CORS proxy for WARP API
// Deploy: wrangler deploy

export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // Only allow POST to /reg
    if (url.pathname === "/reg") {
      const body = await request.text();
      
      const resp = await fetch("https://api.cloudflareclient.com/v0a4005/reg", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "okhttp/3.12.1",
        },
        body: body,
      });

      const data = await resp.text();
      
      return new Response(data, {
        status: resp.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
    
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    return new Response("kNot WARP Proxy", { status: 200 });
  },
};
