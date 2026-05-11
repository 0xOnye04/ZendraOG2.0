function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function getTargetUrl(req) {
  const rawTarget = Array.isArray(req.query?.target) ? req.query.target[0] : req.query?.target;
  if (!rawTarget) {
    throw new Error("Missing target URL.");
  }

  const parsed = new URL(rawTarget);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Unsupported target protocol.");
  }

  return parsed.toString();
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  let targetUrl;
  try {
    targetUrl = getTargetUrl(req);
  } catch (error) {
    res.status(400).json({ error: error.message || "Invalid target URL." });
    return;
  }

  try {
    const rawBody = await readRawBody(req);
    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "content-type": req.headers["content-type"] || "application/json",
      },
      body: rawBody,
    });

    const responseText = await upstream.text();
    res.status(upstream.status);
    res.setHeader("cache-control", "no-store");
    res.setHeader("content-type", upstream.headers.get("content-type") || "application/json");
    res.send(responseText);
  } catch (error) {
    res.status(502).json({
      error: error?.message || "Failed to proxy 0G storage node request.",
    });
  }
}
