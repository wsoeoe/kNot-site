// kNot WARP Generator — UI logic

document.addEventListener("DOMContentLoaded", () => {
    const generateBtn = document.getElementById("generateBtn");
    const downloadSection = document.getElementById("downloadSection");
    const configPreview = document.getElementById("configPreview");
    const downloadBtn = document.getElementById("downloadBtn");
    const status = document.getElementById("status");

    let currentConfig = "";

    generateBtn.addEventListener("click", async () => {
        generateBtn.disabled = true;
        status.innerHTML = '<span class="spinner"></span>Генерация конфига...';

        try {
            const options = {
                dns: document.getElementById("dnsSelect").value,
                ipv6: document.getElementById("ipv6Check").checked,
                keepalive: document.getElementById("keepaliveCheck").checked 
                    ? parseInt(document.getElementById("keepaliveValue").value) || 25 
                    : 0,
                endpoint: document.getElementById("endpointSelect").value,
            };

            const config = await generateWarpConfig(options);
            currentConfig = config;
            
            configPreview.textContent = config;
            downloadSection.style.display = "block";
            status.innerHTML = '<span style="color: #3fb950;">✓ Конфиг готов!</span>';
        } catch (e) {
            status.innerHTML = `<span style="color: #f85149;">✗ Ошибка: ${e.message}</span>`;
            console.error(e);
        } finally {
            generateBtn.disabled = false;
        }
    });

    downloadBtn.addEventListener("click", () => {
        if (!currentConfig) return;
        
        const blob = new Blob([currentConfig], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "kNot.conf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
});
