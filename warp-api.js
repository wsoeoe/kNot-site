// WARP API — регистрация устройства в Cloudflare WARP

const WARP_API = "https://api.cloudflareclient.com/v0a4005/reg";

async function generateWarpConfig(options) {
    // Load TweetNaCl
    await loadNaCl();

    // 1. Generate WireGuard key pair (X25519 / Curve25519)
    const privKey = window.nacl.randomBytes(32);
    const pubKey = window.nacl.scalarMult.base(privKey);
    
    const privateKeyB64 = bytesToBase64(privKey);
    const publicKeyB64 = bytesToBase64(pubKey);

    // 2. Register device with WARP API
    const registration = await registerDevice(publicKeyB64);
    
    // 3. Build config
    return buildConfig(privateKeyB64, registration, options);
}

function bytesToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToBytes(str) {
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

async function loadNaCl() {
    if (window.nacl) return;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/tweetnacl@1.0.3/nacl.min.js";
        script.onload = resolve;
        script.onerror = () => reject(new Error("Failed to load TweetNaCl"));
        document.head.appendChild(script);
    });
}

async function registerDevice(publicKeyB64) {
    const body = {
        key: publicKeyB64,
        install_id: "",
        fcm_token: "",
        tos: new Date().toISOString(),
        model: "PC",
        serial_number: generateSerial(),
        locale: "ru_RU",
    };

    const response = await fetch(WARP_API, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "User-Agent": "okhttp/3.12.1",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`WARP API: ${response.status} ${text}`);
    }

    return await response.json();
}

function generateSerial() {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let serial = "";
    for (let i = 0; i < 16; i++) {
        serial += chars[Math.floor(Math.random() * chars.length)];
    }
    return serial;
}

function buildConfig(privateKeyB64, registration, options) {
    const peerPublicKey = registration.config.peer_public_key;
    const endpoint = options.endpoint === "auto" 
        ? "engage.cloudflareclient.com:2408" 
        : options.endpoint;
    
    const ipv4 = registration.config.interface.addresses.v4;
    const ipv6 = registration.config.interface.addresses.v6;
    
    let config = `[Interface]
PrivateKey = ${privateKeyB64}
Address = ${ipv4}, ${ipv6}
DNS = ${options.dns}
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
PublicKey = ${peerPublicKey}
AllowedIPs = 0.0.0.0/0, ::/0
Endpoint = ${endpoint}`;

    if (options.keepalive > 0) {
        config += `\nPersistentKeepalive = ${options.keepalive}`;
    }
    
    return config;
}
