let authToken = null;

chrome.webRequest.onBeforeSendHeaders.addListener(
    (d) => {
        for (let h of d.requestHeaders) {
            if (h.name.toLowerCase() === "authorization") authToken = h.value;
        }
    },
    { urls: ["*://api-school.procareconnect.com/*"] },
    ["requestHeaders"]
);

chrome.runtime.onMessage.addListener((req, sender, sendRes) => {
    if (req.action === "check_token") { sendRes({ hasToken: !!authToken }); return false; }
    
    if (req.action === "fetch_page") {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        fetch(req.url, {
            headers: { "Authorization": authToken, "Accept": "application/json" },
            signal: controller.signal
        })
        .then(r => {
            clearTimeout(timeoutId);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(data => sendRes({ success: true, data }))
        .catch(err => {
            const msg = err.name === 'AbortError' ? 'Timeout' : err.toString();
            sendRes({ success: false, error: msg });
        });
        return true; 
    }

    if (req.action === "download") {
        validateAndDownload(req.files, req.folder);
        return false;
    }
});

async function validateAndDownload(files, folder) {
    const cleanFolder = (folder || "Procare_Media").replace(/^\/+|\/+$/g, '');

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            const res = await fetch(file.url, { method: 'HEAD' });
            const type = res.headers.get('content-type') || '';

            if (res.ok && (type.includes('image') || type.includes('video'))) {
                const d = new Date(file.date);
                const pad = (n) => String(n).padStart(2, '0');
                const filename = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.${file.type === 'video' ? 'mp4' : 'jpg'}`;
                const finalPath = `${cleanFolder}/${filename}`;

                chrome.downloads.download({ url: file.url, filename: finalPath, conflictAction: "uniquify" });
                await new Promise(r => setTimeout(r, 800)); 
            }
        } catch (e) { console.error("Download error:", e); }
    }
}