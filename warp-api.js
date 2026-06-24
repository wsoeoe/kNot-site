// WARP API — регистрация устройства в Cloudflare WARP
// Возвращает {config: WireGuardConf, privateKey, publicKey, endpoint}

const WARP_API = "https://api.cloudflareclient.com/v0a4005/reg";

async function generateWarpConfig(options) {
    // 1. Generate WireGuard key pair
    const keyPair = await generateWireGuardKeys();
    
    // 2. Register device with Cloudflare WARP API
    const installToken = await getInstallToken();
    const registration = await registerDevice(keyPair.publicKey, installToken);
    
    // 3. Build config
    const config = buildConfig(keyPair, registration, options);
    return config;
}

async function generateWireGuardKeys() {
    // Use Web Crypto API for X25519 key generation
    // WireGuard uses Curve25519
    const keyPair = await window.crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" }, // Fallback - will use below
        true, ["deriveKey", "deriveBits"]
    );
    
    // Actually WireGuard uses Curve25519 (X25519)
    // We need to generate it manually or use a library
    // For now, use the WARP API which can generate keys for us
    
    // Alternative: generate random 32-byte key (WireGuard private key)
    const privateKeyBytes = crypto.getRandomValues(new Uint8Array(32));
    const privateKey = base64Encode(privateKeyBytes);
    
    // Public key = Curve25519(privateKey, basepoint)
    // We'll use the WARP API to register and get the peer public key
    return { privateKey };
}

function base64Encode(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64Decode(str) {
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

async function getInstallToken() {
    // WARP install token — public, same for all free users
    return "7a45bfba-5e35-4c29-bd14-dfe26c76f7e5";
}

async function registerDevice(privateKey, installToken) {
    const publicKey = await derivePublicKey(privateKey);
    
    const body = {
        key: publicKey,
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
        throw new Error(`WARP API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
}

async function derivePublicKey(privateKey) {
    // X25519 scalar multiplication with the base point
    // UsingTweetNaCl or manual implementation
    // For simplicity, we'll use a minimal Curve25519 implementation
    
    // Import nacl from CDN
    if (!window.nacl) {
        await loadNaCl();
    }
    
    const privKeyBytes = base64Decode(privateKey);
    const pubKeyBytes = window.nacl.scalarMult.base(privKeyBytes);
    return base64Encode(pubKeyBytes);
}

async function loadNaCl() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/tweetnacl@1.0.3/nacl.min.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function generateSerial() {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let serial = "";
    for (let i = 0; i < 16; i++) {
        serial += chars[Math.floor(Math.random() * chars.length)];
    }
    return serial;
}

function buildConfig(keyPair, registration, options) {
    const peerPublicKey = registration.config.peer_public_key;
    const endpoint = options.endpoint === "auto" 
        ? "engage.cloudflareclient.com:2408" 
        : options.endpoint;
    
    const ipv4 = registration.config.interface.addresses.v4;
    const ipv6 = registration.config.interface.addresses.v6;
    const dns = options.dns;
    
    // AmneziaWG parameters (WARP free uses these fixed values)
    let config = `[Interface]
PrivateKey = ${keyPair.privateKey}
Address = ${ipv4}, ${ipv6}
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
PublicKey = ${peerPublicKey}
AllowedIPs = 0.0.0.0/0, ::/0
Endpoint = ${endpoint}`;

    if (options.keepalive) {
        config += `\nPersistentKeepalive = ${options.keepalive}`;
    }
    
    return config;
}
