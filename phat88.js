(function() {
    // Chờ DOM load xong
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        const container = document.getElementById('container');
        if (!container) return;

        const playlistIdAttr = container.getAttribute('data-id');
        let playlistId = playlistIdAttr;

        if (playlistIdAttr && playlistIdAttr.startsWith('UC')) {
            playlistId = 'UU' + playlistIdAttr.substring(2);
        }

        // Inject HTML structure
        container.innerHTML = `
            <div class="ytp-player-wrap">
                <div id="player"></div>
                <div class="ytp-overlay">
                    <div class="ytp-swipe">
                        <div class="ytp-swipe-zone" id="left"></div>
                        <div class="ytp-swipe-zone" id="right"></div>
                    </div>
                </div>
                <div class="ytp-controls">
                    <div class="ytp-buttons">
                        <button class="ytp-btn ytp-btn-home" id="homeBtn">🏠</button>
                        <button class="ytp-btn" id="prevBtn">⏮</button>
                        <button class="ytp-btn ytp-btn-play" id="playBtn">▶</button>
                        <button class="ytp-btn" id="nextBtn">⏭</button>
                        <button class="ytp-btn" id="fullBtn">⛶</button>
                    </div>
                    <div class="ytp-progress-wrap">
                        <div class="ytp-progress-row">
                            <span class="ytp-time" id="timeCurrent">0:00</span>
                            <div class="ytp-progress-bar" id="progressBar">
                                <div class="ytp-progress-fill" id="progressFilled"></div>
                                <div class="ytp-progress-handle" id="progressHandle"></div>
                            </div>
                            <span class="ytp-time" id="timeDuration">0:00</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="ytp-playlist-section">
                <div class="ytp-playlist" id="playlist"></div>
                <div class="ytp-pagination" id="pagination"></div>
            </div>
        `;

        // Inject styles
        const style = document.createElement('style');
        style.textContent = `
            /* =========================
               RESET
            ========================= */
            .ytp-pro *,
            .ytp-pro *::before,
            .ytp-pro *::after {
                box-sizing: border-box;
            }

            .ytp-pro {
                max-width: 900px;
                margin: auto;
                padding: 8px;
                border: 3px solid red;
                border-radius: 10px;
                background: #0a0a0a;
                position: relative;
                overflow: hidden;
                transition: all .2s ease;
            }

            .ytp-player-wrap {
                position: relative;
                width: 100%;
                aspect-ratio: 16/9;
                background: #000;
                border-radius: 6px;
                overflow: hidden;
            }

            #player {
                width: 100%;
                height: 100%;
                position: absolute;
                inset: 0;
                z-index: 1;
            }

            .ytp-overlay {
                position: absolute;
                inset: 0;
                z-index: 2;
                pointer-events: none;
            }

            .ytp-swipe {
                position: absolute;
                inset: 0;
                display: flex;
                pointer-events: auto;
            }

            .ytp-swipe-zone {
                flex: 1;
            }

            .ytp-controls {
                position: absolute;
                left: 12px;
                right: 12px;
                bottom: 12px;
                z-index: 20;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .ytp-buttons {
                display: flex;
                align-items: center;
                gap: 6px;
                flex-shrink: 0;
            }

            .ytp-btn {
                border: none;
                outline: none;
                cursor: pointer;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                background: rgba(0,0,0,.55);
                color: #fff;
                font-size: 14px;
                backdrop-filter: blur(5px);
                transition: all .2s ease;
            }

            .ytp-btn:active {
                transform: scale(.95);
            }

            .ytp-btn-play {
                width: 42px;
                height: 42px;
                font-size: 18px;
                background: rgba(255,0,0,.75);
            }

            .ytp-btn-home {
                background: rgba(0,150,255,.7);
            }

            .ytp-progress-wrap {
                flex: 1;
                min-width: 0;
            }

            .ytp-progress-row {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .ytp-time {
                min-width: 40px;
                padding: 2px 5px;
                border-radius: 999px;
                background: rgba(0,0,0,.4);
                text-align: center;
                font-size: 11px;
                font-family: monospace;
                text-shadow: 0 1px 2px rgba(0,0,0,.5);
            }

            .ytp-progress-bar {
                position: relative;
                flex: 1;
                height: 4px;
                border-radius: 999px;
                background: rgba(255,255,255,.4);
                cursor: pointer;
                overflow: visible;
            }

            .ytp-progress-fill {
                width: 0%;
                height: 100%;
                border-radius: 999px;
                background: linear-gradient(90deg,#ff0000,#ff6b6b);
                transition: width .1s linear;
            }

            .ytp-progress-handle {
                position: absolute;
                top: 50%;
                left: 0%;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #fff;
                border: 2px solid #ff0000;
                transform: translate(-50%,-50%);
                opacity: 0;
                transition: opacity .2s ease;
            }

            .ytp-progress-bar:hover .ytp-progress-handle {
                opacity: 1;
            }

            .ytp-playlist-section {
                transition: all .3s ease;
            }

            .ytp-playlist {
                margin-top: 10px;
                padding: 4px 0;
                display: flex;
                gap: 8px;
                overflow-x: auto;
                overflow-y: hidden;
                scroll-behavior: smooth;
            }

            .ytp-playlist::-webkit-scrollbar {
                height: 4px;
            }

            .ytp-playlist::-webkit-scrollbar-thumb {
                background: #ff0000;
                border-radius: 999px;
            }

            .ytp-item {
                width: 140px;
                flex-shrink: 0;
                overflow: hidden;
                border: 2px solid #ffaa00;
                border-radius: 6px;
                background: #111;
                cursor: pointer;
                transition: all .2s ease;
            }

            .ytp-item img {
                width: 100%;
                display: block;
                object-fit: cover;
                aspect-ratio: 16/9;
            }

            .ytp-item.active {
                border-color: #ff0000;
                box-shadow: 0 0 10px rgba(255,0,0,.5);
            }

            .ytp-pagination {
                margin-top: 10px;
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 5px;
            }

            .ytp-page-btn {
                border: none;
                cursor: pointer;
                padding: 5px 12px;
                border-radius: 6px;
                background: #222;
                color: #fff;
                font-size: 12px;
                transition: .2s ease;
            }

            .ytp-page-btn:hover {
                background: #ff4444;
            }

            .ytp-page-btn.active {
                background: #ff0000;
            }

            .ytp-pro.full {
                position: fixed !important;
                inset: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                max-width: none !important;
                padding: 0 !important;
                border: none !important;
                border-radius: 0 !important;
                background: #000 !important;
                z-index: 999999 !important;
            }

            .ytp-pro.full .ytp-player-wrap {
                width: 100%;
                height: 100%;
                aspect-ratio: auto;
                border-radius: 0;
            }

            .ytp-pro.full .ytp-controls {
                bottom: 12px;
                background: transparent;
            }

            .ytp-pro.full .ytp-playlist-section {
                position: absolute;
                left: 0;
                right: 0;
                bottom: 70px;
                padding: 12px;
                background: rgba(0,0,0,.85);
                backdrop-filter: blur(20px);
                border-radius: 20px 20px 0 0;
                transform: translateY(100%);
                opacity: 0;
                pointer-events: none;
                transition: transform .3s ease, opacity .3s ease;
                z-index: 200;
            }

            .ytp-pro.full.show-playlist .ytp-playlist-section {
                transform: translateY(0);
                opacity: 1;
                pointer-events: auto;
            }

            .ytp-pro.full .ytp-playlist {
                margin-top: 0;
                max-height: 160px;
                overflow-y: auto;
            }

            .ytp-pro.full .ytp-item {
                width: 130px;
            }

            @media (max-width:600px) {
                .ytp-item {
                    width: 110px;
                }
                .ytp-controls {
                    left: 10px;
                    right: 10px;
                    bottom: 10px;
                }
                .ytp-pro.full .ytp-item {
                    width: 100px;
                }
            }
        `;
        document.head.appendChild(style);

        // Variables
        let player, list = [], index = 0, isFull = false, currentPage = 1;
        let hidePlaylistTimer = null;
        const perPage = 12;

        // DOM elements
        const playBtn = document.getElementById('playBtn');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const fullBtn = document.getElementById('fullBtn');
        const homeBtn = document.getElementById('homeBtn');
        const progressBarEl = document.getElementById('progressBar');
        const progressFilled = document.getElementById('progressFilled');
        const progressHandle = document.getElementById('progressHandle');
        const timeCurrentSpan = document.getElementById('timeCurrent');
        const timeDurationSpan = document.getElementById('timeDuration');

        // Home button
        if (homeBtn) {
            homeBtn.onclick = () => window.location.href = '/';
        }

        // Helper functions
        function formatTime(s) {
            if (isNaN(s) || s < 0) return '0:00';
            const m = Math.floor(s / 60);
            const r = Math.floor(s % 60);
            return m + ':' + (r < 10 ? '0' : '') + r;
        }

        function showPlaylistInFullscreen() {
            if (!isFull) return;
            container.classList.add('show-playlist');
            clearTimeout(hidePlaylistTimer);
            hidePlaylistTimer = setTimeout(() => {
                if (isFull) container.classList.remove('show-playlist');
            }, 3000);
        }

        function hidePlaylistInFullscreen() {
            clearTimeout(hidePlaylistTimer);
            container.classList.remove('show-playlist');
        }

        function bindFullscreenEvents() {
            if (!isFull) return;
            const playlistSection = container.querySelector('.ytp-playlist-section');
            const showHandler = () => showPlaylistInFullscreen();
            const hideHandler = () => {
                if (playlistSection?.matches(':hover')) return;
                clearTimeout(hidePlaylistTimer);
                hidePlaylistTimer = setTimeout(() => {
                    if (isFull && !playlistSection?.matches(':hover')) {
                        container.classList.remove('show-playlist');
                    }
                }, 2000);
            };
            container.addEventListener('mousemove', showHandler);
            container.addEventListener('touchstart', showHandler);
            playlistSection?.addEventListener('mouseleave', hideHandler);
            container._showHandler = showHandler;
            container._hideHandler = hideHandler;
        }

        function unbindFullscreenEvents() {
            if (container._showHandler) {
                container.removeEventListener('mousemove', container._showHandler);
                container.removeEventListener('touchstart', container._showHandler);
                const playlistSection = container.querySelector('.ytp-playlist-section');
                if (playlistSection && container._hideHandler) {
                    playlistSection.removeEventListener('mouseleave', container._hideHandler);
                }
            }
            clearTimeout(hidePlaylistTimer);
        }

        function updateUI() {
            if (!player || !player.getCurrentTime) return;
            const cur = player.getCurrentTime();
            const dur = player.getDuration();
            if (dur > 0 && isFinite(dur)) {
                const p = (cur / dur) * 100;
                progressFilled.style.width = p + '%';
                progressHandle.style.left = p + '%';
                timeCurrentSpan.textContent = formatTime(cur);
                timeDurationSpan.textContent = formatTime(dur);
            }
            playBtn.innerHTML = player.getPlayerState() === 1 ? '⏸' : '▶';
        }

        function load(i) {
            if (!list.length) return;
            index = i;
            player?.loadVideoById(list[index]);
            highlight();
        }

        function next() {
            if (!list.length) return;
            index = (index + 1) % list.length;
            load(index);
        }

        function prev() {
            if (!list.length) return;
            index = (index - 1 + list.length) % list.length;
            load(index);
        }

        function renderPage(page) {
            if (!list.length) return;
            currentPage = page;
            const start = (page - 1) * perPage;
            const end = Math.min(start + perPage, list.length);
            const playlistDiv = document.getElementById('playlist');
            playlistDiv.innerHTML = '';
            for (let i = start; i < end; i++) {
                const div = document.createElement('div');
                div.className = 'ytp-item';
                div.innerHTML = `<img loading="lazy" src="https://img.youtube.com/vi/${list[i]}/mqdefault.jpg" alt="thumbnail">`;
                div.onclick = () => load(i);
                playlistDiv.appendChild(div);
            }
            highlight();
        }

        function renderPagination() {
            if (!list.length) return;
            const total = Math.ceil(list.length / perPage);
            const pag = document.getElementById('pagination');
            pag.innerHTML = '';
            for (let i = 1; i <= total; i++) {
                const b = document.createElement('button');
                b.className = 'ytp-page-btn' + (i === currentPage ? ' active' : '');
                b.textContent = i;
                b.onclick = () => {
                    document.querySelectorAll('.ytp-page-btn').forEach(btn => btn.classList.remove('active'));
                    b.classList.add('active');
                    renderPage(i);
                };
                pag.appendChild(b);
            }
        }

        function highlight() {
            const items = document.querySelectorAll('.ytp-item');
            const startIdx = (currentPage - 1) * perPage;
            items.forEach((el, i) => {
                const globalIdx = startIdx + i;
                if (globalIdx === index) {
                    el.classList.add('active');
                } else {
                    el.classList.remove('active');
                }
            });
        }

        // YouTube API ready
        function onYouTubeIframeAPIReady() {
            player = new YT.Player('player', {
                playerVars: {
                    listType: 'playlist',
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
                            document.getElementById('playlist').innerHTML = '<div style="padding:20px;text-align:center">Không tìm thấy playlist.</div>';
                        }
                    },
                    onStateChange: (e) => {
                        if (e.data === 0) next();
                    }
                }
            });
        }

        // Event listeners
        if (progressBarEl) {
            progressBarEl.onclick = (e) => {
                const rect = progressBarEl.getBoundingClientRect();
                let p = (e.clientX - rect.left) / rect.width;
                p = Math.max(0, Math.min(1, p));
                if (player?.seekTo) player.seekTo(p * player.getDuration());
            };
        }

        if (playBtn) playBtn.onclick = () => {
            if (!player) return;
            if (player.getPlayerState() === 1) player.pauseVideo();
            else player.playVideo();
        };
        if (prevBtn) prevBtn.onclick = prev;
        if (nextBtn) nextBtn.onclick = next;

        // Fullscreen
        if (fullBtn) {
            fullBtn.onclick = async () => {
                if (!isFull) {
                    try {
                        if (container.requestFullscreen) await container.requestFullscreen();
                        else if (container.webkitRequestFullscreen) await container.webkitRequestFullscreen();
                        try {
                            if (screen.orientation?.lock) await screen.orientation.lock('landscape');
                        } catch (err) {}
                    } catch (err) { console.warn(err); }
                    container.classList.add('full');
                    fullBtn.innerHTML = '✖';
                    isFull = true;
                    setTimeout(() => {
                        bindFullscreenEvents();
                        showPlaylistInFullscreen();
                    }, 100);
                } else {
                    try {
                        if (document.exitFullscreen) await document.exitFullscreen();
                        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
                    } catch (err) { console.warn(err); }
                    container.classList.remove('full');
                    fullBtn.innerHTML = '⛶';
                    isFull = false;
                    hidePlaylistInFullscreen();
                    unbindFullscreenEvents();
                }
            };
        }

        function exitFullscreenHandler() {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                container.classList.remove('full');
                if (fullBtn) fullBtn.innerHTML = '⛶';
                isFull = false;
                hidePlaylistInFullscreen();
                unbindFullscreenEvents();
            }
        }
        document.addEventListener('fullscreenchange', exitFullscreenHandler);
        document.addEventListener('webkitfullscreenchange', exitFullscreenHandler);

        // Swipe
        let startX = 0;
        const leftDiv = document.getElementById('left');
        const rightDiv = document.getElementById('right');
        [leftDiv, rightDiv].forEach(el => {
            if (el) {
                el.addEventListener('touchstart', e => { startX = e.touches[0].clientX; });
                el.addEventListener('touchend', e => {
                    const endX = e.changedTouches[0].clientX;
                    if (endX - startX > 50) prev();
                    if (startX - endX > 50) next();
                });
            }
        });

        // Load YouTube API
        if (window.YT && window.YT.loaded) {
            onYouTubeIframeAPIReady();
        } else {
            window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
    }
})();