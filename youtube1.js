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
        this.setupYouTubeAPI();
    }

    render() {
        const playlistId = this.getAttribute('data-id');
        this.shadowRoot.innerHTML = `
            <style>
                *{margin:0;padding:0;box-sizing:border-box}
                :host{display:block}
                body{background:#000;font-family:system-ui, -apple-system, sans-serif;color:#fff}

                /* CONTAINER */
                .container{
                    max-width:900px;
                    margin:auto;
                    padding:8px;
                    border:3px solid red;
                    border-radius:10px;
                    position:relative;
                    background:#0a0a0a;
                    transition: all 0.2s;
                    display:flex;
                    flex-direction:column;
                }

                /* PLAYER */
                .player-wrap{
                    position:relative;
                    width:100%;
                    aspect-ratio:16/9;
                    background:#000;
                    border-radius:6px;
                    overflow:hidden;
                    flex-shrink:0;
                }

                #player{width:100%;height:100%;position:relative;z-index:1}

                /* OVERLAY - SWIPE */
                .overlay{
                    position:absolute;top:0;left:0;width:100%;height:100%;
                    z-index:2;pointer-events:none;
                }
                .swipe{
                    position:absolute;top:0;left:0;width:100%;height:100%;
                    display:flex;z-index:3;pointer-events:auto;
                }
                .swipe div{flex:1}

                /* CONTROLS */
                .controls-container{
                    position:absolute;bottom:12px;left:12px;right:12px;
                    z-index:100;pointer-events:auto;display:flex;
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

                /* PROGRESS BAR */
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

                /* PLAYLIST & PAGINATION - NORMAL MODE */
                .playlist-section {
                    margin-top:10px;
                    transition: all 0.3s ease;
                    flex-shrink:0;
                }
                .playlist{
                    display:flex;overflow-x:auto;gap:8px;
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
                    pointer-events:auto;
                }
                .page.active{background:#ff0000}
                .page:hover{background:#ff4444}

                /* FULLSCREEN MODE */
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
                    margin:0 !important;
                    overflow:hidden !important;
                }
                
                .container.full .player-wrap{
                    height:100vh !important;
                    aspect-ratio:auto !important;
                    border-radius:0 !important;
                    margin:0 !important;
                    padding:0 !important;
                }
                
                /* Playlist section - NẰM TRÊN CÙNG */
                .container.full .playlist-section {
                    position:fixed !important;
                    top:60px !important;
                    left:0 !important;
                    right:0 !important;
                    width:100vw !important;
                    max-height:220px !important;
                    background:rgba(0,0,0,0.85) !important;
                    backdrop-filter:blur(20px) !important;
                    padding:12px !important;
                    margin:0 !important;
                    z-index:9998 !important;
                    transition:transform 0.3s ease, opacity 0.3s ease !important;
                    transform:translateY(-100%) !important;
                    opacity:0 !important;
                    pointer-events:none !important;
                    border-bottom:1px solid rgba(255,0,0,0.3) !important;
                }
                
                .container.full .playlist {
                    margin-top:0 !important;
                    max-height:120px !important;
                    overflow-y:auto !important;
                    overflow-x:auto !important;
                    gap:8px !important;
                }
                
                .container.full .pagination {
                    margin-top:8px !important;
                    margin-bottom:0 !important;
                    pointer-events:auto !important;
                }
                
                /* Khi có class show-playlist thì hiện lên */
                .container.full.show-playlist .playlist-section {
                    transform:translateY(0) !important;
                    opacity:1 !important;
                    pointer-events:auto !important;
                }
                
                /* Item trong fullscreen */
                .container.full .item {
                    width:130px !important;
                    flex-shrink:0 !important;
                    pointer-events:auto !important;
                }
                
                /* Control bar luôn nằm dưới, có thể click */
                .container.full .controls-container {
                    z-index:9997 !important;
                    background:transparent !important;
                    backdrop-filter:none !important;
                    bottom:12px !important;
                    pointer-events:auto !important;
                }

                .container.full .btn {
                    pointer-events:auto !important;
                }
                
                @media (max-width:600px) {
                    .container{padding:6px}
                    .item{width:110px}
                    .controls-container{bottom:10px;left:10px;right:10px;gap:8px}
                    .buttons-group{gap:4px}
                    .btn{min-width:32px;min-height:32px;font-size:12px}
                    .btn-play{min-width:38px;min-height:38px;font-size:16px}
                    .time-current, .time-duration{font-size:10px;min-width:35px}
                    
                    .container.full .item { width:100px !important; }
                    .container.full .playlist-section {
                        max-height:200px !important;
                        padding:10px !important;
                    }
                    .container.full .playlist {
                        max-height:100px !important;
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
                            <button class="btn btn-home" id="homeBtn">🏠</button>
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

        this.setupElements();
        this.setupEventListeners();
    }

    setupElements() {
        this.container = this.shadowRoot.getElementById('container');
        this.playBtn = this.shadowRoot.getElementById('playBtn');
        this.prevBtn = this.shadowRoot.getElementById('prevBtn');
        this.nextBtn = this.shadowRoot.getElementById('nextBtn');
        this.fullBtn = this.shadowRoot.getElementById('fullBtn');
        this.homeBtn = this.shadowRoot.getElementById('homeBtn');
        this.progressBar = this.shadowRoot.getElementById('progressBar');
        this.progressFilled = this.shadowRoot.getElementById('progressFilled');
        this.progressHandle = this.shadowRoot.getElementById('progressHandle');
        this.timeCurrent = this.shadowRoot.getElementById('timeCurrent');
        this.timeDuration = this.shadowRoot.getElementById('timeDuration');
        this.playlistDiv = this.shadowRoot.getElementById('playlist');
        this.paginationDiv = this.shadowRoot.getElementById('pagination');
    }

    setupEventListeners() {
        this.playBtn.onclick = () => this.togglePlay();
        this.prevBtn.onclick = () => this.prev();
        this.nextBtn.onclick = () => this.next();
        this.fullBtn.onclick = () => this.toggleFullscreen();
        
        const homeUrl = this.getAttribute('data-home') || '/';
        this.homeBtn.onclick = () => window.location.href = homeUrl;

        this.progressBar.onclick = (e) => this.seek(e);

        const leftDiv = this.shadowRoot.getElementById('left');
        const rightDiv = this.shadowRoot.getElementById('right');
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

    setupYouTubeAPI() {
        if (window.YT && window.YT.Player) {
            this.onYouTubeIframeAPIReady();
        } else {
            window.onYouTubeIframeAPIReady = () => this.onYouTubeIframeAPIReady();
            if (!window.ytScriptLoaded) {
                const script = document.createElement('script');
                script.src = 'https://www.youtube.com/iframe_api';
                document.body.appendChild(script);
                window.ytScriptLoaded = true;
            }
        }
    }

    onYouTubeIframeAPIReady() {
        const playlistId = this.getPlaylistId();
        const playerDiv = this.shadowRoot.getElementById('player');

        this.player = new YT.Player(playerDiv, {
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
                    this.list = e.target.getPlaylist();
                    if (this.list && this.list.length) {
                        this.renderPage(1);
                        this.renderPagination();
                        setInterval(() => this.updateUI(), 500);
                    } else {
                        console.warn('Không lấy được playlist. Kiểm tra ID:', playlistId);
                        this.playlistDiv.innerHTML = '<div style="padding:20px;text-align:center;color:#fff">Không tìm thấy video. Kiểm tra lại ID kênh/playlist.</div>';
                    }
                },
                onStateChange: (e) => {
                    if (e.data === 0) this.next();
                }
            }
        });
    }

    getPlaylistId() {
        let playlistId = this.getAttribute('data-id');
        if (playlistId && playlistId.startsWith('UC')) {
            playlistId = 'UU' + playlistId.substring(2);
        }
        return playlistId;
    }

    formatTime(s) {
        if (isNaN(s) || s < 0) return '0:00';
        const m = Math.floor(s / 60);
        const r = Math.floor(s % 60);
        return m + ':' + (r < 10 ? '0' : '') + r;
    }

    updateUI() {
        if (!this.player || !this.player.getCurrentTime) return;
        const cur = this.player.getCurrentTime();
        const dur = this.player.getDuration();
        if (dur > 0 && isFinite(dur)) {
            const p = (cur / dur) * 100;
            this.progressFilled.style.width = p + '%';
            this.progressHandle.style.left = p + '%';
            this.timeCurrent.textContent = this.formatTime(cur);
            this.timeDuration.textContent = this.formatTime(dur);
        }
        this.playBtn.innerHTML = this.player.getPlayerState() === 1 ? '⏸' : '▶';
    }

    seek(e) {
        const rect = this.progressBar.getBoundingClientRect();
        let p = (e.clientX - rect.left) / rect.width;
        if (p < 0) p = 0;
        if (p > 1) p = 1;
        if (this.player && this.player.seekTo) {
            this.player.seekTo(p * this.player.getDuration());
        }
    }

    togglePlay() {
        if (!this.player) return;
        this.player.getPlayerState() === 1 ? this.player.pauseVideo() : this.player.playVideo();
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

    showPlaylistInFullscreen() {
        if (!this.isFull) return;
        this.container.classList.add('show-playlist');
        if (this.hidePlaylistTimer) clearTimeout(this.hidePlaylistTimer);
        this.hidePlaylistTimer = setTimeout(() => {
            if (this.isFull) {
                this.container.classList.remove('show-playlist');
            }
        }, 3000);
    }

    hidePlaylistInFullscreen() {
        if (this.hidePlaylistTimer) clearTimeout(this.hidePlaylistTimer);
        this.container.classList.remove('show-playlist');
    }

    bindFullscreenEvents() {
        if (!this.isFull) return;
        const playlistSection = this.shadowRoot.querySelector('.playlist-section');
        
        const showHandler = () => this.showPlaylistInFullscreen();
        const hideHandler = () => {
            if (playlistSection && playlistSection.matches(':hover')) return;
            if (this.hidePlaylistTimer) clearTimeout(this.hidePlaylistTimer);
            this.hidePlaylistTimer = setTimeout(() => {
                if (this.isFull && !playlistSection?.matches(':hover')) {
                    this.container.classList.remove('show-playlist');
                }
            }, 2000);
        };

        this.container.addEventListener('mousemove', showHandler);
        this.container.addEventListener('touchstart', showHandler);
        if (playlistSection) {
            playlistSection.addEventListener('mouseleave', hideHandler);
        }

        this._showHandler = showHandler;
        this._hideHandler = hideHandler;
    }

    unbindFullscreenEvents() {
        if (this._showHandler) {
            this.container.removeEventListener('mousemove', this._showHandler);
            this.container.removeEventListener('touchstart', this._showHandler);
            const playlistSection = this.shadowRoot.querySelector('.playlist-section');
            if (playlistSection && this._hideHandler) {
                playlistSection.removeEventListener('mouseleave', this._hideHandler);
            }
        }
        if (this.hidePlaylistTimer) clearTimeout(this.hidePlaylistTimer);
    }

    async toggleFullscreen() {
        if (!this.isFull) {
            try {
                if (this.container.requestFullscreen) await this.container.requestFullscreen();
                else if (this.container.webkitRequestFullscreen) await this.container.webkitRequestFullscreen();
                else if (this.container.msRequestFullscreen) await this.container.msRequestFullscreen();
                try {
                    if (screen.orientation && screen.orientation.lock) {
                        await screen.orientation.lock('landscape');
                    }
                } catch (e) {}
            } catch (err) {
                console.warn('Fullscreen error:', err);
            }

            this.container.classList.add('full');
            this.fullBtn.innerHTML = '✖';
            this.isFull = true;
            setTimeout(() => {
                this.bindFullscreenEvents();
                this.showPlaylistInFullscreen();
            }, 100);
        } else {
            try {
                if (document.exitFullscreen) await document.exitFullscreen();
                else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
                else if (document.msExitFullscreen) await document.msExitFullscreen();
            } catch (err) {
                console.warn('Exit fullscreen error:', err);
            }

            this.container.classList.remove('full');
            this.fullBtn.innerHTML = '⛶';
            this.isFull = false;
            this.hidePlaylistInFullscreen();
            this.unbindFullscreenEvents();
        }
    }

    renderPage(page) {
        if (!this.list.length) return;
        this.currentPage = page;
        let start = (page - 1) * this.perPage;
        let end = Math.min(start + this.perPage, this.list.length);
        
        this.playlistDiv.innerHTML = '';
        for (let i = start; i < end; i++) {
            let div = document.createElement('div');
            div.className = 'item';
            div.innerHTML = `<img loading="lazy" src="https://img.youtube.com/vi/${this.list[i]}/mqdefault.jpg" alt="thumbnail">`;
            div.onclick = () => this.load(i);
            this.playlistDiv.appendChild(div);
        }
        this.highlight();
    }

    renderPagination() {
        if (!this.list.length) return;
        const total = Math.ceil(this.list.length / this.perPage);
        this.paginationDiv.innerHTML = '';
        
        for (let i = 1; i <= total; i++) {
            let b = document.createElement('button');
            b.className = 'page' + (i === this.currentPage ? ' active' : '');
            b.innerText = i;
            b.onclick = () => {
                this.shadowRoot.querySelectorAll('.page').forEach(btn => btn.classList.remove('active'));
                b.classList.add('active');
                this.renderPage(i);
            };
            this.paginationDiv.appendChild(b);
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
