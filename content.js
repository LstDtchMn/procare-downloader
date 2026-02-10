(async function() {
    // 1. SINGLETON GUARD
    if (window.PROCARE_V1_0_ACTIVE) { console.log("Scanner active."); return; }
    window.PROCARE_V1_0_ACTIVE = true;

    if (!chrome.runtime?.id) { console.warn("Orphaned."); return; }
    
    let statusEl, progressBar, statusText;
    let scanLog = [];
    let isScanning = false;
    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    function isConnected() { return !!chrome.runtime?.id; }

    function logEvent(msg, type = "INFO") {
        const time = new Date().toLocaleTimeString();
        scanLog.push(`[${time}] [${type}] ${msg}`);
        console.log(`[${type}] ${msg}`);
    }

    // --- 2. MEMORY SYSTEM ---
    const storage = {
        get: (key) => new Promise((resolve) => {
            if (isConnected()) {
                chrome.storage.local.get([key], (res) => {
                    if (res && Array.isArray(res[key])) resolve({});
                    else resolve(res ? res[key] || {} : {});
                });
            } else resolve({});
        }),
        set: (key, val) => { if (isConnected()) chrome.storage.local.set({ [key]: val }); },
        remove: (key) => { if (isConnected()) chrome.storage.local.remove(key); }
    };

    async function getMemory(key) { return await storage.get(key); }

    async function saveMemory(key, date, type, status, count) { 
        if (!isConnected()) return;
        let mem = await getMemory(key);
        if (!mem[date]) mem[date] = {};
        mem[date][type] = { st: status, ct: count };
        storage.set(key, mem);
        updateCalendarCell(date, mem[date]);
    }

    // --- 3. CALENDAR UI ---
    function getMonthFromStr(dateStr) { return parseInt(dateStr.split('-')[1]) - 1; }

    async function showCalendarMap(storageKey, year) {
        if (!isConnected()) { alert("Connection lost. Refresh page."); return; }
        const mem = await getMemory(storageKey);
        const existing = document.getElementById('v1-map-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'v1-map-overlay';
        overlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 1000000; display: flex; justify-content: center; align-items: flex-start; padding-top: 50px;";
        
        let html = `
            <div style="background: #f8f9fa; width: 950px; max-height: 85vh; overflow-y: auto; padding: 25px; border-radius: 12px; box-shadow: 0 15px 40px rgba(0,0,0,0.4); font-family: sans-serif;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom: 2px solid #ddd; padding-bottom: 10px;">
                <h2 style="margin:0; color: #2c3e50;">📅 Scan Calendar: ${year}</h2>
                <button onclick="document.getElementById('v1-map-overlay').remove()" style="border:none; background:#e74c3c; color:white; padding: 8px 15px; border-radius: 6px; cursor:pointer; font-weight:bold;">Close X</button>
            </div>
            <div style="display:flex; gap: 20px; margin-bottom: 15px; font-size: 12px;">
                <span style="display:flex; align-items:center;"><div style="width:12px; height:12px; background:#2ecc71; margin-right:5px; border-radius:3px;"></div> Found Items</span>
                <span style="display:flex; align-items:center;"><div style="width:12px; height:12px; background:#bdc3c7; margin-right:5px; border-radius:3px;"></div> Scanned (Empty)</span>
                <span style="display:flex; align-items:center;"><div style="width:12px; height:12px; background:white; border:1px solid #ccc; margin-right:5px; border-radius:3px;"></div> Unscanned/Error</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
        `;

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const allRanges = getWeeklyRanges(`${year}-01-01`, `${year}-12-31`);

        months.forEach((monthName, mIndex) => {
            html += `<div style="background:white; padding:10px; border-radius:8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                        <h4 style="margin:0 0 10px 0; text-align:center; color:#34495e;">${monthName}</h4>
                        <div style="display:grid; grid-template-columns: repeat(1, 1fr); gap: 5px;">`;

            const ranges = allRanges.filter(r => getMonthFromStr(r.start) === mIndex);

            ranges.forEach(r => {
                const data = mem[r.start] || {};
                const p = data.photos || {};
                const v = data.videos || {};
                
                let bg = "#fff", color = "#333";
                const isFound = (s) => s === 'found' || s === 'success';

                if (isFound(p.st) || isFound(v.st)) { bg = "#2ecc71"; color = "white"; }
                else if (p.st === 'empty' && v.st === 'empty') { bg = "#bdc3c7"; color = "#333"; }
                
                html += generateCellHTML(r.start, r.end, bg, color, p.ct || 0, v.ct || 0);
            });
            html += `</div></div>`;
        });
        html += `</div></div>`;
        overlay.innerHTML = html;
        document.body.appendChild(overlay);
    }

    function generateCellHTML(start, end, bg, color, pCount, vCount) {
        return `<div id="cal-cell-${start}" 
                 style="background: ${bg}; color: ${color}; padding: 6px; border-radius: 4px; border: 1px solid #ddd; font-size: 10px; text-align: center;">
                <div style="margin-bottom:2px; font-weight:bold;">${start.slice(8)}-${end.slice(8)}</div>
                <div>📸 ${pCount} | 🎥 ${vCount}</div>
            </div>`;
    }

    function updateCalendarCell(date, data) {
        const cell = document.getElementById(`cal-cell-${date}`);
        if (!cell) return;

        const p = data.photos || {};
        const v = data.videos || {};
        
        let bg = "#fff", color = "#333";
        const isFound = (s) => s === 'found' || s === 'success';

        if (isFound(p.st) || isFound(v.st)) { bg = "#2ecc71"; color = "white"; }
        else if (p.st === 'empty' && v.st === 'empty') { bg = "#bdc3c7"; color = "#333"; }

        let endDate = new Date(date); endDate.setDate(endDate.getDate() + 6);
        let endStr = endDate.toISOString().split('T')[0];

        cell.outerHTML = generateCellHTML(date, endStr, bg, color, p.ct || 0, v.ct || 0);
    }

    function createStatusUI(storageKey, year) {
        if (document.getElementById('v1-ui')) return;
        const div = document.createElement('div');
        div.id = 'v1-ui';
        div.style = "position: fixed; bottom: 20px; right: 20px; width: 380px; background: #fff; border: 2px solid #2c3e50; border-radius: 12px; padding: 15px; z-index: 999999; box-shadow: 0 8px 24px rgba(0,0,0,0.25); font-family: monospace; font-size: 12px;";
        div.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; color: #2c3e50;">
                <span>Procare Downloader v1.0</span>
                <button id="v1-map-btn" style="background: #3498db; color: white; border: none; border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 11px; font-weight:bold;">📅 CALENDAR</button>
            </div>
            <div style="width: 100%; background: #eee; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 10px;">
                <div id="v1-bar" style="width: 0%; height: 100%; background: #2c3e50; transition: width 0.3s;"></div>
            </div>
            <div id="v1-status" style="color: #333; margin-bottom: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 6px; background: #f4f4f4; border-radius: 4px;">Ready...</div>
            <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                <button id="v1-skip" style="flex: 1; background: #f39c12; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer;">SKIP</button>
                <button id="v1-stop" style="flex: 1; background: #c0392b; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer;">STOP</button>
                <button id="v1-log" style="flex: 1; background: #7f8c8d; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer;">💾 LOG</button>
            </div>
        `;
        document.body.appendChild(div);
        statusEl = div;
        progressBar = document.getElementById('v1-bar');
        statusText = document.getElementById('v1-status');

        document.getElementById('v1-map-btn').onclick = () => showCalendarMap(storageKey, year);
        document.getElementById('v1-skip').onclick = () => { window.skipSignal = true; };
        document.getElementById('v1-stop').onclick = () => { window.stopSignal = true; };
        document.getElementById('v1-log').onclick = () => {
            const blob = new Blob([scanLog.join('\n')], {type: 'text/plain'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `procare_log.txt`;
            a.click();
        };
    }

    function extractMedia(item) {
        let results = [];
        if (item.is_video === true || item.video_file_url) {
            let vUrl = item.video_file_url || item.main_url || item.url;
            if (vUrl) results.push({ url: vUrl.replace('/thumb/', '/main/'), type: 'video' });
        }
        if (item.main_url || item.url) {
            results.push({ url: (item.main_url || item.url).replace('/thumb/', '/main/'), type: 'photo' });
        }
        if (results.length === 0 && typeof item === 'object' && item !== null) {
            for (let key in item) {
                if (typeof item[key] === 'object') results = results.concat(extractMedia(item[key]));
            }
        }
        return results;
    }

    function getWeeklyRanges(s, e) {
        let cur = new Date(s), end = new Date(e), r = [];
        while (cur <= end) {
            let next = new Date(cur); next.setDate(next.getDate() + 6);
            if (next > end) next = new Date(end);
            r.push({ start: cur.toISOString().split('T')[0], end: next.toISOString().split('T')[0] });
            cur = new Date(next); cur.setDate(cur.getDate() + 1);
        }
        return r;
    }

    // --- 4. SCAN LOGIC ---
    chrome.runtime.onMessage.addListener(async (msg) => {
        if (msg.action === "start_scan") {
            if (isScanning) return;
            isScanning = true;
            window.stopSignal = false;
            window.skipSignal = false;
            scanLog = [];
            
            let kidId = window.location.pathname.split('/').find(p => p.length > 20 && p.includes('-')) || "unknown";
            let year = msg.startDate.split('-')[0];
            let storageKey = `procare_mem_${kidId}_${year}`;

            createStatusUI(storageKey, year);
            await startScan(msg.startDate, msg.endDate, msg.mediaType, storageKey, kidId, msg.folder);
            isScanning = false;
        }
    });

    async function startScan(start, end, type, storageKey, kidId, folderName) {
        if (!isConnected()) { alert("Refresh page!"); return; }
        const ranges = getWeeklyRanges(start, end);
        const uniqueMap = new Map();
        const endpoints = type === 'all' ? ["photos", "videos", "daily_activities"] : [type + "s"];
        let completedMem = await getMemory(storageKey);
        const today = new Date();

        outerLoop:
        for (const ep of endpoints) {
            for (let i = 0; i < ranges.length; i++) {
                if (!isConnected()) { if(statusText) statusText.innerText = "Connection Lost"; break outerLoop; }
                
                // STOP Check 1: Start of loop
                if (window.stopSignal) break outerLoop;

                // Future Check
                if (new Date(ranges[i].start) > today) {
                    if(statusText) statusText.innerText = "Reached future date. Stopping.";
                    break outerLoop; 
                }

                let pct = Math.round(((endpoints.indexOf(ep) * ranges.length + i) / (endpoints.length * ranges.length)) * 100);
                if (progressBar) progressBar.style.width = pct + "%";
                
                let date = ranges[i].start;
                let typeKey = ep; 
                let weekData = completedMem[date] || {};
                
                const status = weekData[typeKey]?.st;
                if (status === 'found' || status === 'success' || status === 'empty') {
                    if(statusText) statusText.innerText = `Skipping ${date} (Done)`;
                    updateCalendarCell(date, weekData);
                    await delay(10); 
                    continue;
                }

                if(statusText) statusText.innerText = `Scanning ${ep} | ${date}`;
                const result = await scanWeek(ep, ranges[i], uniqueMap, kidId, new Date(start), new Date(end), type);
                
                // STOP Check 2: Immediately after scanWeek
                if (window.stopSignal) break outerLoop;

                await saveMemory(storageKey, date, typeKey, result.status, result.count);
                completedMem = await getMemory(storageKey); 
                await delay(1000); 
            }
        }

        // === FINAL REPORT LOGIC (UPDATED) ===
        if (uniqueMap.size > 0) {
            if(statusText) statusText.innerText = window.stopSignal ? "Stopped! Downloading..." : "Done! Downloading...";
            
            // Customize the prompt based on whether they stopped or finished
            let msg = window.stopSignal 
                ? `Scan Stopped.\nFound ${uniqueMap.size} items so far.\nDownload them now?` 
                : `Scan Finished!\nFound ${uniqueMap.size} items.\nDownload now?`;

            if (confirm(msg)) {
                chrome.runtime.sendMessage({ 
                    action: "download", 
                    files: Array.from(uniqueMap.values()),
                    folder: folderName 
                });
            }
        } else {
            if(statusText) statusText.innerText = window.stopSignal ? "Stopped" : "Complete";
            alert(window.stopSignal ? "Scan stopped. No items found." : "Scan complete. No new items.");
        }
        if (statusEl) statusEl.remove();
    }

    async function scanWeek(ep, range, map, kidId, sLimit, eLimit, targetType) {
        let page = 1, keep = true, errorChain = 0;
        let filter = ep === 'photos' ? 'photo' : ep === 'videos' ? 'video' : 'daily_activity';
        let weekCount = 0;

        while (keep) {
            if (window.stopSignal) return { status: "stopped", count: 0 };
            if (window.skipSignal) { window.skipSignal = false; return { status: "skipped", count: 0 }; }

            let url = `https://api-school.procareconnect.com/api/web/parent/${ep}/?page=${page}&per_page=50&filters%5B${filter}%5D%5Bdatetime_from%5D=${range.start}%2000%3A00&filters%5B${filter}%5D%5Bdatetime_to%5D=${range.end}%2023%3A59`;
            if (ep === 'daily_activities' && kidId) url += `&filters%5B${filter}%5D%5Bkid_id%5D=${kidId}`;

            if(statusText) statusText.innerText = `${ep} | ${range.start} | Pg ${page}`;

            try {
                const res = await chrome.runtime.sendMessage({ action: "fetch_page", url });
                if (!res || !res.success) {
                    if (res.error && (res.error.includes("403") || res.error.includes("400"))) {
                        if (page === 1) return { status: "empty", count: 0 };
                        window.stopSignal = true; return { status: "error", count: 0 };
                    }
                    errorChain++;
                    await delay(2000 * errorChain);
                    if (errorChain >= 3) return { status: "error", count: 0 };
                    continue;
                }
                
                errorChain = 0;
                let items = res.data[ep] || res.data.results || Object.values(res.data).find(Array.isArray) || [];
                
                if (items.length === 0) keep = false;
                else {
                    items.forEach(item => {
                        let dStr = item.created_at || item.date || new Date().toISOString();
                        extractMedia(item).forEach(m => {
                            if (targetType !== 'all' && m.type !== targetType) return;
                            if (!map.has(m.url)) {
                                map.set(m.url, { url: m.url, date: dStr, type: m.type });
                                weekCount++; 
                            }
                        });
                    });
                    page++; 
                    await delay(1000);
                }
            } catch (e) { return { status: "error", count: 0 }; }
        }
        return { status: weekCount > 0 ? "found" : "empty", count: weekCount };
    }
})();