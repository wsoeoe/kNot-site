// WARP API — получает конфиг с публичного WARP генератор API
// Использует те же endpoints что и warp-generator.github.io

const CONFIG_ENDPOINTS = [
    "https://www.warp-generator.workers.dev",
    "https://warp-gen.netlify.app/",
    "https://warp.sub-aggregator.workers.dev",
    "https://warp-vercel-chi.vercel.app/api/warp-data",
    "https://warp-vercel-murex.vercel.app/api/warp-data",
];

const PORTS = [500, 854, 859, 864, 878, 880, 890, 891, 894, 903, 908, 928, 934, 939, 942, 943, 945, 946, 955, 968, 987, 988, 1002, 1010, 1014, 1018, 1070, 1074, 1180, 1387, 1701, 1843, 2371, 2408, 2506, 3138, 3476, 3581, 3854, 4177, 4198, 4233, 4500, 5279, 5956, 7103, 7152, 7156, 7281, 7559, 8319, 8742, 8854, 8886];

const PREFIXES = [
    "162.159.192.", "162.159.195.", "engage.cloudflareclient.com",
    "8.6.112.", "8.34.70.", "8.34.146.", "8.35.211.", "8.39.125.",
    "8.39.204.", "8.39.214.", "8.47.69.", "188.114.96.", "188.114.97.", "188.114.98."
];

async function generateWarpConfig(options) {
    // Fetch config data from backend
    const configData = await fetchFullConfig();

    // Generate random endpoint
    const endpoint = generateRandomEndpoint(options.endpoint);

    // Build config
    return buildConfig(configData, endpoint, options);
}

async function fetchFullConfig() {
    let lastError;
    for (let i = 0; i < CONFIG_ENDPOINTS.length; i++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(CONFIG_ENDPOINTS[i], { signal: controller.signal });
            clearTimeout(timeout);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            lastError = error;
        }
    }
    throw new Error(`All endpoints failed: ${lastError?.message}`);
}

function generateRandomEndpoint(option) {
    if (option && option !== "auto") return option;
    
    const port = PORTS[Math.floor(Math.random() * PORTS.length)];
    const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
    
    if (prefix === "engage.cloudflareclient.com") {
        return `${prefix}:${port}`;
    }
    const num = Math.floor(Math.random() * 10) + 1;
    return `${prefix}${num}:${port}`;
}

function buildConfig(configData, endpoint, options) {
    let address = configData.client_ipv4;
    let dns = options.dns;

    if (options.ipv6) {
        address = `${configData.client_ipv4}, ${configData.client_ipv6}`;
    } else {
        dns = dns.split(',').filter(ip => !ip.includes(':')).join(',');
    }

    let config = `[Interface]
PrivateKey = ${configData.privKey}
Address = ${address}
DNS = ${dns}
MTU = 1380
S1 = 0
S2 = 0
S3 = 0
S4 = 0
Jc = 4
Jmin = 40
Jmax = 70
H1 = 1
H2 = 2
H3 = 3
H4 = 4

[Peer]
PublicKey = ${configData.peer_pub}
AllowedIPs = 0.0.0.0/0, ::/0
Endpoint = ${endpoint}`;

    if (options.keepalive > 0) {
        config += `\nPersistentKeepalive = ${options.keepalive}`;
    }

    return config;
}
