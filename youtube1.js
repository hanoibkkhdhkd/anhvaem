class YTPlayerPro extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.player = null;
        this.list = [];
        this.index = 0;
        this.isFull = false;
        this.currentPage = 1;
        this.hidePlaylistTimer = null;
        this.perPage = 12;
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.loadYouTubeAPI();
    }

    render() {
        const inputId = this.getAttribute('data-id') || '';
        const homeUrl = this.getAttribute('data-home') || '/';
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    --primary-color: #ff0000;
                    --secondary-color: #ffaa00;
                    --bg-dark: #0a0a0a;
                    --bg-overlay: rgba(0,0,0,0.55);
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                .container {
                    max-width: 900px;
                    margin: auto;
                    padding: 8px;
                    border: 3px solid var(--primary-color);
                    border-radius: 10px;
                    position: relative;
                    background: var(--bg-dark);
                    transition: all 0.2s;
                    display: flex;
                    flex-direction: column;
                }

                /* PLAYER */
                .player-wrap {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 16/9;
                    background: #000;
                    border-radius: 6px;
                    overflow: hidden;
                    flex-shrink: 0;
                }

                #player {
                    width: 100%;
                    height: 100%;
                    position: relative;
                    z-index: 1;
                }

                /* OVERLAY - SWIPE */
                .overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 2;
                    pointer-events: none;
                }

                .swipe {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    z-index: 3;
                    pointer-events: auto;
                }

                .swipe div {
                    flex: 1;
                }

                /* CONTROLS */
                .controls-container {
                    position: absolute;
                    bottom: 12px;
                    left: 12px;
                    right: 12px;
                    z-index: 20;
                    pointer-events: auto;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .buttons-group {
                    display: flex;
                    gap: 6px;
                    flex-shrink: 0;
                }

                .btn {
                    background: var(--bg-overlay);
                    color: #fff;
                    border: none;
                    cursor: pointer;
                    border-radius: 50%;
                    font-size: 14px;
                    min-width: 36px;
                    min-height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    backdrop-filter: blur(5px);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                }

                .btn:active {
                    transform: scale(0.95);
                }

                .btn-play {
                    background: rgba(255,0,0,0.75);
                    min-width: 42px;
                    min-height: 42px;
                    font-size: 18px;
                }

                .btn-home {
                    background: rgba(0,150,255,0.7);
                }

                /* PROGRESS BAR */
                .progress-wrapper {
                    flex: 1;
                    min-width: 0;
                }

                .progress-bar-wrap {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 100%;
                }

                .time-current,
                .time-duration {
                    font-size: 11px;
                    font-family: monospace;
                    min-width: 38px;
                    text-align: center;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                    background: rgba(0,0,0,0.4);
                    padding: 2px 5px;
                    border-radius: 12px;
                }

                .progress-bar {
                    flex: 1;
                    height: 4px;
                    background: rgba(255,255,255,0.4);
                    border-radius: 3px;
                    cursor: pointer;
                    position: relative;
                }

                .progress-filled {
                    height: 100%;
                    width: 0%;
                    background: linear-gradient(90deg, #ff0000, #ff6b6b);
                    border-radius: 3px;
                    transition: width 0.1s linear;
                }

                .progress-handle {
                    position: absolute;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    width: 12px;
                    height: 12px;
                    background: #fff;
                    border-radius: 50%;
                    border: 2px solid var(--primary-color);
                    opacity: 0;
                    transition: opacity 0.2s;
                }

                .progress-bar:hover .progress-handle {
                    opacity: 1;
                }

                /* PLAYLIST & PAGINATION - NORMAL MODE */
                .playlist-section {
                    margin-top: 10px;
                    transition: all 0.3s ease;
                    flex-shrink: 0;
                }

                .playlist {
                    display: flex;
                    overflow-x: auto;
                    gap: 8px;
                    scroll-behavior: smooth;
                    padding: 4px 0;
                    z-index: 10;
                }

                .playlist::-webkit-scrollbar {
                    height: 4px;
                }

                .playlist::-webkit-scrollbar-thumb {
                    background: var(--primary-color);
                    border-radius: 4px;
                }

                .item {
                    width: 140px;
                    flex-shrink: 0;
                    cursor: pointer;
                    border: 2px solid var(--secondary-color);
                    border-radius: 6px;
                    overflow: hidden;
                    transition: all 0.2s ease;
                    background: #111;
                }

                .item img {
                    width: 100%;
                    display: block;
                    aspect-ratio: 16/9;
                    object-fit: cover;
                }

                .item.active {
                    border-color: var(--primary-color);
                    box-shadow: 0 0 10px rgba(255,0,0,0.5);
                }

                .pagination {
                    text-align: center;
                    margin-top: 10px;
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 5px;
                }

                .page {
                    background: #222;
                    color: #fff;
                    border: none;
                    padding: 5px 12px;
                    cursor: pointer;
                    border-radius: 6px;
                    font-size: 12px;
                    transition: 0.2s;
                }

                .page.active {
                    background: var(--primary-color);
                }

                .page:hover {
                    background: #ff4444;
                }

                /* ========== FULLSCREEN MODE ========== */
                .container.full {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    z-index: 9999 !important;
                    background: #000 !important;
                    padding: 0 !important;
                    border: none !important;
                    max-width: 100% !important;
                    border-radius: 0 !important;
                    margin: 0 !important;
                    overflow: hidden !important;
                }

                .container.full .player-wrap {
                    height: 100vh !important;
                    aspect-ratio: auto !important;
                    border-radius: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }

                /* Playlist section - ẩn mặc định trong fullscreen */
                .container.full .playlist-section {
                    position: fixed !important;
                    bottom: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    width: 100vw !important;
                    max-height: 250px !important;
                    background: rgba(0,0,0,0.95) !important;
                    backdrop-filter: blur(20px) !important;
                    padding: 12px !important;
                    border-radius: 20px 20px 0 0 !important;
                    margin: 0 !important;
                    z-index: 9998 !important;
                    transition: transform 0.3s ease, opacity 0.3s ease !important;
                    transform: translateY(100%) !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                }

                .container.full .playlist {
                    margin-top: 0 !important;
                    max-height: 140px !important;
                    overflow-y: auto !important;
                    overflow-x: auto !important;
                    gap: 8px !important;
                    z-index: 9998 !important;
                }

                .container.full .pagination {
                    margin-top: 8px !important;
                    margin-bottom: 4px !important;
                    z-index: 9998 !important;
                }

                .container.full .page {
                    pointer-events: auto !important;
                }

                /* Khi có class show-playlist thì hiện lên */
                .container.full.show-playlist .playlist-section {
                    transform: translateY(0) !important;
                    opacity: 1 !important;
                    pointer-events: auto !important;
                }

                .container.full .item {
                    width: 130px !important;
                    flex-shrink: 0 !important;
                }

                /* Control bar vẫn luôn hiện */
                .container.full .controls-container {
                    z-index: 9997 !important;
                    background: transparent !important;
                    backdrop-filter: none !important;
                    bottom: 12px !important;
                }

                @media (max-width: 600px) {
                    .container {
                        padding: 6px;
                    }

                    .item {
                        width: 110px;
                    }

                    .controls-container {
                        bottom: 10px;
                        left: 10px;
                        right: 10px;
                        gap: 8px;
                    }

                    .buttons-group {
                        gap: 4px;
                    }

                    .btn {
                        min-width: 32px;
                        min-height: 32px;
                        font-size: 12px;
                    }

                    .btn-play {
                        min-width: 38px;
                        min-height: 38px;
                        font-size: 16px;
                    }

                    .time-current,
                    .time-duration {
                        font-size: 10px;
                        min-width: 35px;
                    }

                    .container.full .item {
                        width: 100px !important;
                    }

                    .container.full .playlist-section {
                        max-height: 200px !important;
                        padding: 10px !important;
                    }

                    .container.full .playlist {
                        max-height: 120px !important;
                    }
                }
            </style>

            <div class="container" id="container">
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
                            <button class="btn btn-home" data-home="${homeUrl}">🏠</button>
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
            </div>
        `;

        this.playlistId = inputId;
        if (inputId && inputId.startsWith('UC')) {
            this.playlistId = 'UU' + inputId.substring(2);
        }
    }

    setupEventListeners() {
        const playBtn = this.shadowRoot.getElementById('playBtn');
        const prevBtn = this.shadowRoot.getElementById('prevBtn');
        const nextBtn = this.shadowRoot.getElementById('nextBtn');
        const fullBtn = this.shadowRoot.getElementById('fullBtn');
        const homeBtn = this.shadowRoot.querySelector('.btn-home');
        const progressBar = this.shadowRoot.getElementById('progressBar');
        const container = this.shadowRoot.getElementById('container');
        const leftDiv = this.shadowRoot.getElementById('left');
        const rightDiv = this.shadowRoot.getElementById('right');

        playBtn.onclick = () => {
            if (!this.player) return;
            this.player.getPlayerState() === 1
                ? this.player.pauseVideo()
                : this.player.playVideo();
        };

        prevBtn.onclick = () => this.prev();
        nextBtn.onclick = () => this.next();

        homeBtn.onclick = () => {
            const homeUrl = homeBtn.getAttribute('data-home');
            window.location.href = homeUrl;
        };

        progressBar.onclick = (e) => {
            const rect = progressBar.getBoundingClientRect();
            let p = (e.clientX - rect.left) / rect.width;
            if (p < 0) p = 0;
            if (p > 1) p = 1;
            if (this.player && this.player.seekTo) {
                this.player.seekTo(p * this.player.getDuration());
            }
        };

        fullBtn.onclick = async () => {
            if (!this.isFull) {
                try {
                    if (container.requestFullscreen) await container.requestFullscreen();
                    else if (container.webkitRequestFullscreen)
                        await container.webkitRequestFullscreen();
                    else if (container.msRequestFullscreen)
                        await container.msRequestFullscreen();
                    try {
                        if (screen.orientation && screen.orientation.lock)
                            await screen.orientation.lock('landscape');
                    } catch (e) {}
                } catch (err) {
                    console.warn('Fullscreen error:', err);
                }

                container.classList.add('full');
                fullBtn.innerHTML = '✖';
                this.isFull = true;
                setTimeout(() => {
                    this.bindFullscreenEvents();
                    this.showPlaylistInFullscreen();
                }, 100);
            } else {
                try {
                    if (document.exitFullscreen) await document.exitFullscreen();
                    else if (document.webkitExitFullscreen)
                        await document.webkitExitFullscreen();
                    else if (document.msExitFullscreen)
                        await document.msExitFullscreen();
                } catch (err) {
                    console.warn('Exit fullscreen error:', err);
                }

                container.classList.remove('full');
                fullBtn.innerHTML = '⛶';
                this.isFull = false;
                this.hidePlaylistInFullscreen();
                this.unbindFullscreenEvents();
            }
        };

        // Swipe logic
        if (leftDiv && rightDiv) {
            let startX = 0;
            leftDiv.ontouchstart = rightDiv.ontouchstart = (e) => {
                startX = e.touches[0].clientX;
            };
            leftDiv.ontouchend = rightDiv.ontouchend = (e) => {
                let endX = e.changedTouches[0].clientX;
                if (endX - startX > 50) this.prev();
                if (startX - endX > 50) this.next();
            };
        }

        // Fullscreen change events
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                if (this.isFull) {
                    this.exitFullscreenCleanup(container, fullBtn);
                }
            }
        });

        document.addEventListener('webkitfullscreenchange', () => {
            if (!document.webkitFullscreenElement && this.isFull) {
                this.exitFullscreenCleanup(container, fullBtn);
            }
        });
    }

    exitFullscreenCleanup(container, fullBtn) {
        container.classList.remove('full');
        fullBtn.innerHTML = '⛶';
        this.isFull = false;
        this.hidePlaylistInFullscreen();
        this.unbindFullscreenEvents();
    }

    showPlaylistInFullscreen() {
        if (!this.isFull) return;
        const container = this.shadowRoot.getElementById('container');
        container.classList.add('show-playlist');
        if (this.hidePlaylistTimer) clearTimeout(this.hidePlaylistTimer);
        this.hidePlaylistTimer = setTimeout(() => {
            if (this.isFull) {
                container.classList.remove('show-playlist');
            }
        }, 3000);
    }

    hidePlaylistInFullscreen() {
        if (this.hidePlaylistTimer) clearTimeout(this.hidePlaylistTimer);
        const container = this.shadowRoot.getElementById('container');
        container.classList.remove('show-playlist');
    }

    bindFullscreenEvents() {
        if (!this.isFull) return;
        const container = this.shadowRoot.getElementById('container');
        const playlistSection = container.querySelector('.playlist-section');

        const showHandler = () => this.showPlaylistInFullscreen();
        const hideHandler = () => {
            if (playlistSection && playlistSection.matches(':hover')) return;
            if (this.hidePlaylistTimer) clearTimeout(this.hidePlaylistTimer);
            this.hidePlaylistTimer = setTimeout(() => {
                if (this.isFull && !playlistSection?.matches(':hover')) {
                    container.classList.remove('show-playlist');
                }
            }, 2000);
        };

        container.addEventListener('mousemove', showHandler);
        container.addEventListener('touchstart', showHandler);
        if (playlistSection) {
            playlistSection.addEventListener('mouseleave', hideHandler);
        }

        this._showHandler = showHandler;
        this._hideHandler = hideHandler;
    }

    unbindFullscreenEvents() {
        const container = this.shadowRoot.getElementById('container');
        if (this._showHandler) {
            container.removeEventListener('mousemove', this._showHandler);
            container.removeEventListener('touchstart', this._showHandler);
            const playlistSection = container.querySelector('.playlist-section');
            if (playlistSection && this._hideHandler) {
                playlistSection.removeEventListener('mouseleave', this._hideHandler);
            }
        }
        if (this.hidePlaylistTimer) clearTimeout(this.hidePlaylistTimer);
    }

    loadYouTubeAPI() {
        if (window.YT && window.YT.loaded) {
            this.onYouTubeIframeAPIReady();
        } else {
            const script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(script);
            window.onYouTubeIframeAPIReady = () => {
                this.onYouTubeIframeAPIReady();
            };
        }
    }

    onYouTubeIframeAPIReady() {
        const playerDiv = this.shadowRoot.getElementById('player');
        this.player = new YT.Player(playerDiv, {
            playerVars: {
                listType: 'playlist',
                list: this.playlistId,
                controls: 0,
                rel: 0,
                playsinline: 1,
                fs: 1,
            },
            events: {
                onReady: (e) => {
                    this.list = e.target.getPlaylist();
                    if (this.list && this.list.length) {
                        this.renderPage(1);
                        this.renderPagination();
                        this.updateInterval = setInterval(() => this.updateUI(), 500);
                    } else {
                        console.warn('Không lấy được playlist. Kiểm tra ID:', this.playlistId);
                        const playlistDiv = this.shadowRoot.getElementById('playlist');
                        playlistDiv.innerHTML =
                            '<div style="padding:20px;text-align:center">Không tìm thấy video. Kiểm tra lại ID kênh/playlist.</div>';
                    }
                },
                onStateChange: (e) => {
                    if (e.data === 0) this.next();
                },
            },
        });
    }

    updateUI() {
        if (!this.player || !this.player.getCurrentTime) return;
        const cur = this.player.getCurrentTime();
        const dur = this.player.getDuration();

        if (dur > 0 && isFinite(dur)) {
            const p = (cur / dur) * 100;
            const progressFilled = this.shadowRoot.getElementById('progressFilled');
            const progressHandle = this.shadowRoot.getElementById('progressHandle');
            const timeCurrent = this.shadowRoot.getElementById('timeCurrent');
            const timeDuration = this.shadowRoot.getElementById('timeDuration');

            progressFilled.style.width = p + '%';
            progressHandle.style.left = p + '%';
            timeCurrent.textContent = this.formatTime(cur);
            timeDuration.textContent = this.formatTime(dur);
        }

        const playBtn = this.shadowRoot.getElementById('playBtn');
        playBtn.innerHTML = this.player.getPlayerState() === 1 ? '⏸' : '▶';
    }

    formatTime(s) {
        if (isNaN(s) || s < 0) return '0:00';
        const m = Math.floor(s / 60);
        const r = Math.floor(s % 60);
        return m + ':' + (r < 10 ? '0' : '') + r;
    }

    load(i) {
        if (!this.list.length) return;
        this.index = i;
        if (this.player && this.player.loadVideoById) {
            this.player.loadVideoById(this.list[i]);
        }
        this.highlight();
    }

    next() {
        if (this.list.length) {
            this.index = (this.index + 1) % this.list.length;
            this.load(this.index);
        }
    }

    prev() {
        if (this.list.length) {
            this.index = (this.index - 1 + this.list.length) % this.list.length;
            this.load(this.index);
        }
    }

    renderPage(page) {
        if (!this.list.length) return;
        this.currentPage = page;
        let start = (page - 1) * this.perPage;
        let end = Math.min(start + this.perPage, this.list.length);
        const pl = this.shadowRoot.getElementById('playlist');
        if (!pl) return;
        pl.innerHTML = '';

        for (let i = start; i < end; i++) {
            let div = document.createElement('div');
            div.className = 'item';
            div.innerHTML = `<img loading="lazy" src="https://img.youtube.com/vi/${this.list[i]}/mqdefault.jpg" alt="thumbnail">`;
            div.onclick = () => {
                this.load(i);
            };
            pl.appendChild(div);
        }
        this.highlight();
    }

    renderPagination() {
        if (!this.list.length) return;
        const total = Math.ceil(this.list.length / this.perPage);
        const pag = this.shadowRoot.getElementById('pagination');
        if (!pag) return;
        pag.innerHTML = '';

        for (let i = 1; i <= total; i++) {
            let b = document.createElement('button');
            b.className = 'page' + (i === this.currentPage ? ' active' : '');
            b.innerText = i;
            b.onclick = () => {
                this.shadowRoot.querySelectorAll('.page').forEach((btn) =>
                    btn.classList.remove('active')
                );
                b.classList.add('active');
                this.renderPage(i);
            };
            pag.appendChild(b);
        }
    }

    highlight() {
        const items = this.shadowRoot.querySelectorAll('.item');
        const startIdx = (this.currentPage - 1) * this.perPage;
        items.forEach((el, i) => {
            let globalIdx = startIdx + i;
            if (globalIdx === this.index) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    }
}

customElements.define('yt-player-pro', YTPlayerPro);
