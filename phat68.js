// YT Player PRO - All-in-one JS Module
(function() {
    const style = document.createElement('style');
    style.textContent = `
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#000;font-family:system-ui, -apple-system, sans-serif;color:#fff}

        .container{
            max-width:900px;
            margin:auto;
            padding:8px;
            border:3px solid red;
            border-radius:10px;
            position:relative;
            background:#0a0a0a;
            transition: all 0.2s;
        }

        .player-wrap{
            position:relative;
            width:100%;
            aspect-ratio:16/9;
            background:#000;
            border-radius:6px;
            overflow:hidden;
        }

        #player{width:100%;height:100%;position:relative;z-index:1}

        .overlay{
            position:absolute;top:0;left:0;width:100%;height:100%;
            z-index:2;pointer-events:none;
        }
        .swipe{
            position:absolute;top:0;left:0;width:100%;height:100%;
            display:flex;z-index:3;pointer-events:auto;
        }
        .swipe div{flex:1}

        .controls-container{
            position:absolute;bottom:12px;left:12px;right:12px;
            z-index:20;pointer-events:auto;display:flex;
            align-items:center;gap:10px;
        }

        .buttons-group{display:flex;gap:6px;flex-shrink:0}

        .btn{
            background:rgba(0,0,0,0.55);color:#fff;border:none;
            cursor:pointer;border-radius:50%;font-size:14px;
            min-width:36px;min-height:36px;display:flex;
            align-items:center;justify-content:center;
            transition:all 0.2s ease;backdrop-filter:blur(5px);
            box-shadow:0 1px 3px rgba(0,0,0,0.3);
        }
        .btn:active{transform:scale(0.95)}
        .btn-play{background:rgba(255,0,0,0.75);min-width:42px;min-height:42px;font-size:18px}
        .btn-home{background:rgba(0,150,255,0.7)}

        .progress-wrapper{flex:1;min-width:0}
        .progress-bar-wrap{display:flex;align-items:center;gap:8px;width:100%}
        .time-current, .time-duration{
            font-size:11px;font-family:monospace;min-width:38px;
            text-align:center;text-shadow:0 1px 2px rgba(0,0,0,0.5);
            background:rgba(0,0,0,0.4);padding:2px 5px;border-radius:12px;
        }
        .progress-bar{
            flex:1;height:4px;background:rgba(255,255,255,0.4);
            border-radius:3px;cursor:pointer;position:relative;
        }
        .progress-filled{
            height:100%;width:0%;background:linear-gradient(90deg, #ff0000, #ff6b6b);
            border-radius:3px;transition:width 0.1s linear;
        }
        .progress-handle{
            position:absolute;top:50%;transform:translate(-50%, -50%);
            width:12px;height:12px;background:#fff;border-radius:50%;
            border:2px solid #ff0000;opacity:0;transition:opacity 0.2s;
        }
        .progress-bar:hover .progress-handle{opacity:1}

        .playlist-section {
            transition: all 0.3s ease;
        }
        .playlist{
            display:flex;overflow-x:auto;gap:8px;margin-top:10px;
            scroll-behavior:smooth;padding:4px 0;z-index:10;
        }
        .playlist::-webkit-scrollbar{height:4px}
        .playlist::-webkit-scrollbar-thumb{background:#ff0000;border-radius:4px}
        .item{
            width:140px;flex-shrink:0;cursor:pointer;
            border:2px solid #ffaa00;border-radius:6px;
            overflow:hidden;transition:all 0.2s ease;
            background:#111;
        }
        .item img{width:100%;display:block;aspect-ratio:16/9;object-fit:cover}
        .item.active{border-color:#ff0000;box-shadow:0 0 10px rgba(255,0,0,0.5)}

        .pagination{
            text-align:center;margin-top:10px;display:flex;
            flex-wrap:wrap;justify-content:center;gap:5px;
        }
        .page{
            background:#222;color:#fff;border:none;padding:5px 12px;
            cursor:pointer;border-radius:6px;font-size:12px;transition:0.2s;
        }
        .page.active{background:#ff0000}
        .page:hover{background:#ff4444}

        .container.full{
            position:fixed !important;
            top:0 !important;
            left:0 !important;
            width:100vw !important;
            height:100vh !important;
            z-index:9999 !important;
            background:#000 !important;
            padding:0 !important;
            border:none !important;
            max-width:100% !important;
            border-radius:0 !important;
        }
        .container.full .player-wrap{
            height:100% !important;
            aspect-ratio:auto !important;
            border-radius:0 !important;
        }
        
        .container.full .playlist-section {
            position: absolute;
            bottom: 70px;
            left: 0;
            right: 0;
            background: rgba(0,0,0,0.85);
            backdrop-filter: blur(20px);
            padding: 12px;
            border-radius: 20px 20px 0 0;
            margin: 0;
            transition: transform 0.3s ease, opacity 0.3s ease;
            transform: translateY(100%);
            opacity: 0;
            pointer-events: none;
            z-index: 200;
        }
        
        .container.full .playlist {
            margin-top: 0;
            max-height: 160px;
            overflow-y: auto;
        }
        
        .container.full .pagination {
            margin-top: 8px;
            margin-bottom: 4px;
        }
        
        .container.full.show-playlist .playlist-section {
            transform: translateY(0);
            opacity: 1;
            pointer-events: auto;
        }
        
        .container.full .controls-container {
            background: transparent;
            backdrop-filter: none;
            bottom: 12px;
        }
        
        .container.full .item {
            width: 130px;
        }
        
        @media (max-width: 600px) {
            .item{width:110px}
            .controls-container{bottom:10px;left:10px;right:10px}
            .container.full .item { width: 100px; }
        }
    `;
    document.head.appendChild(style);

    const template = `
        <div class="player-wrap">
            <div id="player"></div>
            <div class="overlay">
                <div class="swipe">
                    <div id="left"></div>
                    <div id="right"></div>
                </div>
            </div>

            <div class="controls-container">
                <div class="buttons-group">
                    <button class="btn btn-home" onclick="window.location.href='/'">🏠</button>
                    <button class="btn" id="prevBtn">⏮</button>
                    <button class="btn btn-play" id="playBtn">▶</button>
                    <button class="btn" id="nextBtn">⏭</button>
                    <button class="btn" id="fullBtn">⛶</button>
                </div>
                
                <div class="progress-wrapper">
                    <div class="progress-bar-wrap">
                        <span class="time-current" id="timeCurrent">0:00</span>
                        <div class="progress-bar" id="progressBar">
                            <div class="progress-filled" id="progressFilled"></div>
                            <div class="progress-handle" id="progressHandle"></div>
                        </div>
                        <span class="time-duration" id="timeDuration">0:00</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="playlist-section">
            <div class="playlist" id="playlist"></div>
            <div class="pagination" id="pagination"></div>
        </div>
    `;

    function initPlayer(container) {
        if (!container) return;
        
        // Thêm HTML vào container
        container.innerHTML = template;

        let player, list = [], index = 0, isFull = false, currentPage = 1;
        let hidePlaylistTimer = null;
        const perPage = 12;

        const inputId = container.getAttribute("data-id");
        let playlistId = inputId;
        
        if (inputId && inputId.startsWith("UC")) {
            playlistId = "UU" + inputId.substring(2);
        }

        console.log("Using playlist ID:", playlistId);

        const playBtn = container.querySelector("#playBtn");
        const prevBtn = container.querySelector("#prevBtn");
        const nextBtn = container.querySelector("#nextBtn");
        const fullBtn = container.querySelector("#fullBtn");
        const progressBar = container.querySelector("#progressBar");
        const progressFilled = container.querySelector("#progressFilled");
        const progressHandle = container.querySelector("#progressHandle");
        const timeCurrent = container.querySelector("#timeCurrent");
        const timeDuration = container.querySelector("#timeDuration");

        function formatTime(s) {
            if (isNaN(s) || s < 0) return "0:00";
            const m = Math.floor(s / 60), r = Math.floor(s % 60);
            return m + ":" + (r < 10 ? "0" : "") + r;
        }

        function showPlaylistInFullscreen() {
            if (!isFull) return;
            container.classList.add("show-playlist");
            if (hidePlaylistTimer) clearTimeout(hidePlaylistTimer);
            hidePlaylistTimer = setTimeout(() => {
                if (isFull) {
                    container.classList.remove("show-playlist");
                }
            }, 3000);
        }

        function hidePlaylistInFullscreen() {
            if (hidePlaylistTimer) clearTimeout(hidePlaylistTimer);
            container.classList.remove("show-playlist");
        }

        function bindFullscreenEvents() {
            if (!isFull) return;
            const playlistSection = container.querySelector('.playlist-section');
            const showHandler = () => showPlaylistInFullscreen();
            const hideHandler = () => {
                if (playlistSection && playlistSection.matches(':hover')) return;
                if (hidePlaylistTimer) clearTimeout(hidePlaylistTimer);
                hidePlaylistTimer = setTimeout(() => {
                    if (isFull && !playlistSection?.matches(':hover')) {
                        container.classList.remove("show-playlist");
                    }
                }, 2000);
            };
            container.addEventListener('mousemove', showHandler);
            container.addEventListener('touchstart', showHandler);
            if (playlistSection) {
                playlistSection.addEventListener('mouseleave', hideHandler);
            }
            container._showHandler = showHandler;
            container._hideHandler = hideHandler;
        }

        function unbindFullscreenEvents() {
            if (container._showHandler) {
                container.removeEventListener('mousemove', container._showHandler);
                container.removeEventListener('touchstart', container._showHandler);
                const playlistSection = container.querySelector('.playlist-section');
                if (playlistSection && container._hideHandler) {
                    playlistSection.removeEventListener('mouseleave', container._hideHandler);
                }
            }
            if (hidePlaylistTimer) clearTimeout(hidePlaylistTimer);
        }

        function onYouTubeIframeAPIReady() {
            player = new YT.Player(container.querySelector("#player"), {
                playerVars: {
                    listType: "playlist",
                    list: playlistId,
                    controls: 0,
                    rel: 0,
                    playsinline: 1,
                    fs: 1
                },
                events: {
                    onReady: (e) => {
                        list = e.target.getPlaylist();
                        if (list && list.length) {
                            renderPage(1);
                            renderPagination();
                            setInterval(updateUI, 500);
                        } else {
                            console.warn("Không lấy được playlist. Kiểm tra ID:", playlistId);
                            container.querySelector("#playlist").innerHTML = '<div style="padding:20px;text-align:center">Không tìm thấy video. Kiểm tra lại ID kênh/playlist.</div>';
                        }
                    },
                    onStateChange: (e) => { if (e.data === 0) next(); }
                }
            });
        }

        function updateUI() {
            if (!player || !player.getCurrentTime) return;
            const cur = player.getCurrentTime(), dur = player.getDuration();
            if (dur > 0 && isFinite(dur)) {
                const p = (cur / dur) * 100;
                progressFilled.style.width = p + "%";
                progressHandle.style.left = p + "%";
                timeCurrent.textContent = formatTime(cur);
                timeDuration.textContent = formatTime(dur);
            }
            playBtn.innerHTML = player.getPlayerState() === 1 ? "⏸" : "▶";
        }

        progressBar.onclick = (e) => {
            const rect = progressBar.getBoundingClientRect();
            let p = (e.clientX - rect.left) / rect.width;
            if (p < 0) p = 0;
            if (p > 1) p = 1;
            if (player && player.seekTo) player.seekTo(p * player.getDuration());
        };

        function load(i) {
            if (!list.length) return;
            index = i;
            if (player && player.loadVideoById) player.loadVideoById(list[index]);
            highlight();
        }

        function next() { if (list.length) { index = (index + 1) % list.length; load(index); } }
        function prev() { if (list.length) { index = (index - 1 + list.length) % list.length; load(index); } }

        playBtn.onclick = () => {
            if (!player) return;
            player.getPlayerState() === 1 ? player.pauseVideo() : player.playVideo();
        };
        prevBtn.onclick = prev;
        nextBtn.onclick = next;

        fullBtn.onclick = async () => {
            if (!isFull) {
                try {
                    if (container.requestFullscreen) await container.requestFullscreen();
                    else if (container.webkitRequestFullscreen) await container.webkitRequestFullscreen();
                    else if (container.msRequestFullscreen) await container.msRequestFullscreen();
                    try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape"); } catch (e) { }
                } catch (err) { console.warn("Fullscreen error:", err); }

                container.classList.add("full");
                fullBtn.innerHTML = "✖";
                isFull = true;
                setTimeout(() => {
                    bindFullscreenEvents();
                    showPlaylistInFullscreen();
                }, 100);
            } else {
                try {
                    if (document.exitFullscreen) await document.exitFullscreen();
                    else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
                    else if (document.msExitFullscreen) await document.msExitFullscreen();
                } catch (err) { console.warn("Exit fullscreen error:", err); }

                container.classList.remove("full");
                fullBtn.innerHTML = "⛶";
                isFull = false;
                hidePlaylistInFullscreen();
                unbindFullscreenEvents();
            }
        };

        document.addEventListener("fullscreenchange", () => {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                if (isFull) {
                    container.classList.remove("full");
                    fullBtn.innerHTML = "⛶";
                    isFull = false;
                    hidePlaylistInFullscreen();
                    unbindFullscreenEvents();
                }
            }
        });
        document.addEventListener("webkitfullscreenchange", () => {
            if (!document.webkitFullscreenElement && isFull) {
                container.classList.remove("full");
                fullBtn.innerHTML = "⛶";
                isFull = false;
                hidePlaylistInFullscreen();
                unbindFullscreenEvents();
            }
        });

        let startX = 0;
        const leftDiv = container.querySelector("#left");
        const rightDiv = container.querySelector("#right");

        if (leftDiv && rightDiv) {
            leftDiv.ontouchstart = rightDiv.ontouchstart = e => { startX = e.touches[0].clientX; };
            leftDiv.ontouchend = rightDiv.ontouchend = e => {
                let endX = e.changedTouches[0].clientX;
                if (endX - startX > 50) prev();
                if (startX - endX > 50) next();
            };
        }

        function renderPage(page) {
            if (!list.length) return;
            currentPage = page;
            let start = (page - 1) * perPage, end = Math.min(start + perPage, list.length);
            const pl = container.querySelector("#playlist");
            if (!pl) return;
            pl.innerHTML = "";
            for (let i = start; i < end; i++) {
                let div = document.createElement("div");
                div.className = "item";
                div.innerHTML = `<img loading="lazy" src="https://img.youtube.com/vi/${list[i]}/mqdefault.jpg" alt="thumbnail">`;
                div.onclick = (function (idx) { return function () { load(idx); }; })(i);
                pl.appendChild(div);
            }
            highlight();
        }

        function renderPagination() {
            if (!list.length) return;
            const total = Math.ceil(list.length / perPage), pag = container.querySelector("#pagination");
            if (!pag) return;
            pag.innerHTML = "";
            for (let i = 1; i <= total; i++) {
                let b = document.createElement("button");
                b.className = "page" + (i === currentPage ? " active" : "");
                b.innerText = i;
                b.onclick = () => {
                    container.querySelectorAll(".page").forEach(btn => btn.classList.remove("active"));
                    b.classList.add("active");
                    renderPage(i);
                };
                pag.appendChild(b);
            }
        }

        function highlight() {
            const items = container.querySelectorAll(".item");
            const startIdx = (currentPage - 1) * perPage;
            items.forEach((el, i) => {
                let globalIdx = startIdx + i;
                if (globalIdx === index) el.classList.add("active");
                else el.classList.remove("active");
            });
        }

        if (window.YT && window.YT.loaded) {
            onYouTubeIframeAPIReady();
        } else {
            window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
        }
    }

    // Auto-init tất cả container có class "container"
    function autoInit() {
        const containers = document.querySelectorAll('.container[data-id]');
        containers.forEach(container => {
            if (!container._playerInit) {
                container._playerInit = true;
                initPlayer(container);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }

    // Export global function nếu cần manual init
    window.YTPlayerPro = { initPlayer };

})();