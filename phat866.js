(function() {
    // 1. CHÈN CSS VÀO HEAD
    const styles = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0a0a0a; padding: 20px; font-family: 'Segoe UI', sans-serif; }
        .ytp_container {
            max-width: 1400px; margin: 0 auto; padding: 15px;
            border: 4px solid #FF0000; border-radius: 20px;
            background: #0a0a0a; transition: 0.2s;
        }
        .ytp_container.ytp_fullscreen_mode {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            z-index: 9999; border: none; border-radius: 0; padding: 0;
            background: #000; overflow: hidden;
        }
        .ytp_container.ytp_fullscreen_mode .ytp_player_wrapper {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            z-index: 1;
        }
        .ytp_container.ytp_fullscreen_mode .ytp_player {
            width: 100%; height: 100%; aspect-ratio: unset;
        }
        .ytp_container.ytp_fullscreen_mode .main_controls_row {
            position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
            background: transparent; z-index: 3; display: flex; flex-direction: row;
            align-items: center; justify-content: center; gap: 12px;
        }
        .ytp_container.ytp_fullscreen_mode .time_scrubber_wrap {
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
            background: transparent; z-index: 3; display: flex; flex-direction: row;
            align-items: center; justify-content: center; gap: 12px; min-width: 300px;
        }
        .ytp_container.ytp_fullscreen_mode .playlist_section {
            position: fixed; bottom: 145px; left: 5%; right: 5%;
            background: rgba(0,0,0,0.6); padding: 10px 15px; z-index: 2;
            transform: translateY(200%); transition: transform 0.3s ease;
            border-radius: 16px; margin: 0;
        }
        .ytp_container.ytp_fullscreen_mode .playlist_section.show { transform: translateY(0); }
        .ytp_container.ytp_fullscreen_mode .ytp_playlist {
            display: flex !important; flex-direction: row !important; 
            overflow-x: auto !important; overflow-y: hidden !important;
            grid-template-columns: unset !important; gap: 10px; margin: 5px 0;
            padding-bottom: 5px; -webkit-overflow-scrolling: touch;
        }
        .ytp_container.ytp_fullscreen_mode .ytp_video { min-width: 130px; width: 130px; flex-shrink: 0; }
        .ytp_container.ytp_fullscreen_mode .ytp_video img { width: 100%; height: 73px; object-fit: cover; border-radius: 6px; display: block; }
        
        .ytp_player_wrapper { width: 100%; background: #000; border-radius: 12px; overflow: hidden; }
        .ytp_player { width: 100%; aspect-ratio: 16/9; background: #000; }
        .main_controls_row { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 12px; padding: 12px 20px; margin-top: 12px; background: transparent; }
        .time_scrubber_wrap { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 8px; margin-bottom: 8px; background: transparent; padding: 8px 20px; }
        
        .ytp_ctrl_btn {
            width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
            border: 1px solid rgba(255,255,255,0.3); background: rgba(0,0,0,0.5);
            color: white; cursor: pointer; display: inline-flex;
            align-items: center; justify-content: center; transition: 0.2s; backdrop-filter: blur(1px);
        }
        .ytp_ctrl_btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.05); }
        .ytp_play_pause { width: 35px; height: 35px; background: rgba(255,0,0,0.8); font-size: 24px; }
        .ytp_play_pause:hover { background: rgba(255,0,0,1); }
        
        .time_label { color: #fff; font-size: 13px; font-family: monospace; background: rgba(0,0,0,0.5); padding: 4px 8px; border-radius: 20px; flex-shrink: 0; backdrop-filter: blur(4px); }
        .scrubber_slider { width: 300px; height: 5px; -webkit-appearance: none; background: rgba(255,255,255,0.3); border-radius: 5px; cursor: pointer; }
        .scrubber_slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #ff0000; cursor: pointer; }
        
        .playlist_header { display: flex; justify-content: space-between; align-items: center; color: #ddd; padding: 12px 4px; margin-top: 20px; border-bottom: 1px solid #333; }
        .playlist_title { font-weight: bold; font-size: 1.2rem; display: flex; gap: 8px; align-items: center; }
        .playlist_title i { color: #ff0000; }
        .page_info { background: #222; padding: 4px 12px; border-radius: 30px; font-size: 14px; }
        
        .ytp_playlist { display: grid; grid-template-columns: repeat(4, 2fr); gap: 12px; margin: 15px 0; }
        .ytp_video { border: 2px solid #333; border-radius: 10px; cursor: pointer; overflow: hidden; transition: 0.2s; background: #111; }
        .ytp_video:hover { transform: translateY(-3px); border-color: #ff5555; }
        .ytp_video.playing { border-color: #ff0000; box-shadow: 0 0 10px rgba(255,0,0,0.5); }
        .ytp_video img { width: 100%; display: block; aspect-ratio: 16/9; object-fit: cover; }
        .video_title_mini { display: none; }
        
        .ytp_pagination { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; margin: 10px 0; }
        .page_btn { background: #2a2a2a; border: none; color: white; padding: 8px 16px; border-radius: 30px; cursor: pointer; font-weight: bold; transition: 0.2s; }
        .page_btn.active { background: #ff0000; }
        .page_btn:hover:not(.active) { background: #ff4444; }
        .page_btn:disabled { opacity: 0.4; cursor: not-allowed; }
        
        .mix_notice { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 12px; text-align: center; margin: 15px 0; color: #ffaa00; }
        .ytp_container.ytp_fullscreen_mode .ytp_pagination { justify-content: center; margin-top: 5px; gap: 6px; }
        .ytp_container.ytp_fullscreen_mode .page_btn { background: rgba(0,0,0,0.6); padding: 4px 10px; font-size: 12px; border-radius: 4px; }
        .ytp_container.ytp_fullscreen_mode .page_btn.active { background: #ff0000; }
        
        .ytp_playlist::-webkit-scrollbar { height: 4px; }
        .ytp_playlist::-webkit-scrollbar-track { background: transparent; }
        .ytp_playlist::-webkit-scrollbar-thumb { background: #ff0000; border-radius: 4px; }
        
        @media (max-width: 700px) { 
            .ytp_playlist { grid-template-columns: repeat(2, 1fr); }
            .ytp_container.ytp_fullscreen_mode .ytp_video { min-width: 100px; width: 100px; }
            .ytp_container.ytp_fullscreen_mode .ytp_video img { height: 56px; }
            .scrubber_slider { width: 180px; }
            .time_label { font-size: 11px; padding: 2px 6px; }
        }
        @media (max-width: 768px) and (orientation: portrait) {
            .ytp_container.ytp_fullscreen_mode { transform: rotate(0deg); }
        }
    `;
    const styleEl = document.createElement('style');
    styleEl.innerHTML = styles;
    document.head.appendChild(styleEl);

    // 2. DỰNG KHUNG HTML VÀO TRƯỚC THẺ DATA
    const dataEl = document.getElementById('ytp_data');
    if (!dataEl) return;

    const playerHTML = `
        <div class="ytp_container" id="mainContainer">
            <div class="ytp_player_wrapper">
                <div id="ytp_player" class="ytp_player"></div>
            </div>
            <div class="main_controls_row">
                <button class="ytp_ctrl_btn ytp_home_btn" id="ytp_home_btn" title="Về trang chủ"><i class="fas fa-home"></i></button>
                <button class="ytp_ctrl_btn" id="ytp_prev_btn" title="Bài trước"><i class="fas fa-step-backward"></i></button>
                <button class="ytp_ctrl_btn ytp_play_pause" id="ytp_play_pause_btn"><i class="fas fa-play"></i></button>
                <button class="ytp_ctrl_btn" id="ytp_next_btn" title="Bài sau"><i class="fas fa-step-forward"></i></button>
                <button class="ytp_ctrl_btn" id="ytp_list_btn" title="Danh sách"><i class="fa-solid fa-list"></i></button>
                <button class="ytp_ctrl_btn" id="ytp_fullscreen_btn"><i class="fas fa-expand"></i></button>
            </div>
            <div class="time_scrubber_wrap">
                <i class="fas fa-clock" style="color:#ff0000;"></i>
                <span class="time_label" id="currentTimeLabel">0:00</span>
                <input type="range" id="videoScrubber" class="scrubber_slider" min="0" max="100" value="0">
                <span class="time_label" id="durationLabel">0:00</span>
            </div>
            <div id="ytp_mix_info" class="mix_notice" style="display:none;">
                <i class="fas fa-compact-disc fa-spin" style="color: #ff0000;"></i> 
                <span>Đang phát danh sách Mix từ YouTube - Đang xây dựng danh sách...</span>
            </div>
            <div class="playlist_section">
                <div class="playlist_header">
                    <div class="playlist_title"><i class="fas fa-list-ul"></i> Danh sách phát <span id="totalVideosBadge"></span></div>
                    <div class="page_info" id="pageInfo">Trang 1 / 1</div>
                </div>
                <div id="ytp_playlist_container">
                    <div id="ytp_playlist" class="ytp_playlist">
                        <div style="grid-column:1/-1; text-align:center; padding:40px; color:#888;"><i class="fas fa-spinner fa-spin"></i> Đang tải danh sách video...</div>
                    </div>
                    <div id="ytp_pagination" class="ytp_pagination"></div>
                </div>
            </div>
        </div>
    `;
    dataEl.insertAdjacentHTML('beforebegin', playerHTML);

    // 3. TOÀN BỘ LOGIC XỬ LÝ (GIỮ NGUYÊN HOẠT ĐỘNG)
    let player;
    let isPlaying = false;
    let videoList = [];        
    let currentVideoIndex = 0;
    let currentPage = 1;
    let hidePlaylistTimeout = null;
    let originalOrientation = null;
    const VIDEOS_PER_PAGE = 20;
    
    const container = document.querySelector('.ytp_container');
    const playPauseIcon = document.querySelector('.ytp_play_pause i');
    const playlistDiv = document.getElementById('ytp_playlist');
    const paginationDiv = document.getElementById('ytp_pagination');
    const totalVideosBadge = document.getElementById('totalVideosBadge');
    const pageInfoSpan = document.getElementById('pageInfo');
    const mixInfoDiv = document.getElementById('ytp_mix_info');
    const playlistSection = document.querySelector('.playlist_section');
    
    const scrubberInput = document.getElementById('videoScrubber');
    const currentTimeLabel = document.getElementById('currentTimeLabel');
    const durationLabel = document.getElementById('durationLabel');
    let scrubberUpdating = false;
    let timeUpdateInterval = null;
    
    function isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    async function lockToLandscape() {
        if (!isMobile()) return;
        try {
            if (screen.orientation && screen.orientation.type) {
                originalOrientation = screen.orientation.type;
            }
            if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock('landscape');
            }
        } catch (error) {
            console.log('Không thể khóa hướng màn hình:', error);
        }
    }
    
    async function unlockOrientation() {
        if (!isMobile()) return;
        try {
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        } catch (error) {
            console.log('Lỗi mở khóa:', error);
        }
    }
    
    function formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    function updateTimeUI() {
        if (!player || typeof player.getCurrentTime !== 'function') return;
        try {
            const current = player.getCurrentTime();
            const duration = player.getDuration();
            if (duration && isFinite(duration) && duration > 0) {
                if (!scrubberUpdating) {
                    scrubberInput.value = (current / duration) * 100;
                }
                currentTimeLabel.innerText = formatTime(current);
                durationLabel.innerText = formatTime(duration);
            }
        } catch(e) {}
    }
    
    function setupScrubber() {
        scrubberInput.addEventListener('mousedown', () => { scrubberUpdating = true; });
        scrubberInput.addEventListener('touchstart', () => { scrubberUpdating = true; });
        scrubberInput.addEventListener('input', function() {
            if (!player || typeof player.getDuration !== 'function') return;
            const duration = player.getDuration();
            if (duration && isFinite(duration)) {
                const seekTime = (this.value / 100) * duration;
                currentTimeLabel.innerText = formatTime(seekTime);
            }
        });
        scrubberInput.addEventListener('change', function() {
            if (!player || typeof player.seekTo !== 'function') return;
            const duration = player.getDuration();
            if (duration && isFinite(duration)) {
                player.seekTo((this.value / 100) * duration, true);
            }
            scrubberUpdating = false;
        });
        scrubberInput.addEventListener('mouseup', () => { scrubberUpdating = false; });
        scrubberInput.addEventListener('touchend', () => { scrubberUpdating = false; });
    }
    
    function showPlaylist() {
        if (!container.classList.contains('ytp_fullscreen_mode')) return;
        if (hidePlaylistTimeout) clearTimeout(hidePlaylistTimeout);
        playlistSection.classList.add('show');
    }
    
    function hidePlaylistAfterDelay() {
        if (!container.classList.contains('ytp_fullscreen_mode')) return;
        if (hidePlaylistTimeout) clearTimeout(hidePlaylistTimeout);
        hidePlaylistTimeout = setTimeout(() => {
            playlistSection.classList.remove('show');
        }, 3500);
    }
    
    function setupFullscreenPlaylistEvents() {
        if (!container.classList.contains('ytp_fullscreen_mode')) return;
        const hoverArea = document.getElementById('mainContainer');
        if (hoverArea) {
            hoverArea.onmousemove = function() {
                showPlaylist();
                hidePlaylistAfterDelay();
            };
            hoverArea.ontouchstart = function() {
                showPlaylist();
                hidePlaylistAfterDelay();
            };
        }
    }
    
    function renderPlaylistPage() {
        if (!videoList.length) {
            playlistDiv.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#888;">Chưa có video trong danh sách</div>';
            paginationDiv.innerHTML = '';
            return;
        }
        
        const totalPages = Math.ceil(videoList.length / VIDEOS_PER_PAGE);
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;
        
        const startIdx = (currentPage - 1) * VIDEOS_PER_PAGE;
        const endIdx = Math.min(startIdx + VIDEOS_PER_PAGE, videoList.length);
        const pageVideos = videoList.slice(startIdx, endIdx);
        
        playlistDiv.innerHTML = '';
        pageVideos.forEach((video, idx) => {
            const absoluteIndex = startIdx + idx;
            const item = document.createElement('div');
            item.className = 'ytp_video';
            if (absoluteIndex === currentVideoIndex) item.classList.add('playing');
            item.innerHTML = `<img src="https://img.youtube.com/vi/${video.id}/mqdefault.jpg" loading="lazy">`;
            item.onclick = (e) => {
                e.stopPropagation();
                playVideoAtIndex(absoluteIndex);
            };
            playlistDiv.appendChild(item);
        });
        
        paginationDiv.innerHTML = '';
        const prevBtn = document.createElement('button');
        prevBtn.innerText = '‹';
        prevBtn.className = 'page_btn';
        prevBtn.disabled = (currentPage === 1);
        prevBtn.onclick = (e) => { e.stopPropagation(); if (currentPage > 1) { currentPage--; renderPlaylistPage(); showPlaylist(); } };
        paginationDiv.appendChild(prevBtn);
        
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);
        for (let i = startPage; i <= endPage; i++) {
            const btn = document.createElement('button');
            btn.innerText = i;
            btn.className = 'page_btn';
            if (i === currentPage) btn.classList.add('active');
            btn.onclick = (function(page) { 
                return function(e) { 
                    e.stopPropagation();
                    currentPage = page; 
                    renderPlaylistPage(); 
                    showPlaylist();
                }; 
            })(i);
            paginationDiv.appendChild(btn);
        }
        
        const nextBtn = document.createElement('button');
        nextBtn.innerText = '›';
        nextBtn.className = 'page_btn';
        nextBtn.disabled = (currentPage === totalPages);
        nextBtn.onclick = (e) => { e.stopPropagation(); if (currentPage < totalPages) { currentPage++; renderPlaylistPage(); showPlaylist(); } };
        paginationDiv.appendChild(nextBtn);
        
        pageInfoSpan.innerText = `Trang ${currentPage} / ${totalPages}`;
        totalVideosBadge.innerText = `(${videoList.length} video)`;
        playlistDiv.scrollLeft = 0;
    }
    
    function playVideoAtIndex(index) {
        if (!player || !videoList[index]) return;
        currentVideoIndex = index;
        if (typeof player.playVideoAt === 'function') {
            player.playVideoAt(index);
        } else if (typeof player.loadVideoById === 'function') {
            player.loadVideoById(videoList[index].id);
            player.playVideo();
        }
        renderPlaylistPage();
        
        const targetPage = Math.floor(index / VIDEOS_PER_PAGE) + 1;
        if (targetPage !== currentPage) {
            currentPage = targetPage;
            renderPlaylistPage();
        }
    }
    
    function buildPlaylistFromPlayer() {
        if (!player) return false;
        let playlist = null;
        try { playlist = player.getPlaylist(); } catch(e) { playlist = null; }
        
        if (playlist && Array.isArray(playlist) && playlist.length > 0) {
            videoList = playlist.map((id, idx) => ({ id: id, title: `Video ${idx + 1}` }));
            mixInfoDiv.style.display = 'none';
            return true;
        }
        
        try {
            const currentId = player.getVideoData().video_id;
            const currentTitle = player.getVideoData().title || 'Đang phát';
            if (currentId) {
                videoList = [{ id: currentId, title: currentTitle }];
                mixInfoDiv.style.display = 'block';
                return true;
            }
        } catch(e) {}
        return false;
    }
    
    function addVideoToListIfNew(videoId, videoTitle) {
        if (!videoId) return false;
        const exists = videoList.some(v => v.id === videoId);
        if (!exists) {
            videoList.push({ id: videoId, title: videoTitle || `Video ${videoList.length + 1}` });
            renderPlaylistPage();
            return true;
        }
        return false;
    }
    
    function syncCurrentIndex() {
        if (!player) return;
        try {
            const idx = player.getPlaylistIndex();
            if (idx !== undefined && idx !== -1 && idx !== currentVideoIndex) {
                currentVideoIndex = idx;
                renderPlaylistPage();
            }
        } catch(e) {}
    }
    
    window.onYouTubeIframeAPIReady = function() {
        const listId = dataEl.dataset.playlist;
        player = new YT.Player('ytp_player', {
            height: '100%', width: '100%',
            playerVars: {
                listType: 'playlist', list: listId,
                autoplay: 0, controls: 0, rel: 0, showinfo: 0, iv_load_policy: 3
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    };
    
    function onPlayerReady(event) {
        setTimeout(() => {
            buildPlaylistFromPlayer();
            renderPlaylistPage();
            try {
                currentVideoIndex = player.getPlaylistIndex() || 0;
                renderPlaylistPage();
            } catch(e) {}
        }, 1000);
        
        if (timeUpdateInterval) clearInterval(timeUpdateInterval);
        timeUpdateInterval = setInterval(() => updateTimeUI(), 500);
        updateTimeUI();
    }
    
    function onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.PLAYING) {
            isPlaying = true;
            playPauseIcon.className = 'fas fa-pause';
            updateTimeUI();
            try {
                const videoData = player.getVideoData();
                if (videoData && videoData.video_id) {
                    addVideoToListIfNew(videoData.video_id, videoData.title);
                }
            } catch(e) {}
        } else if (event.data === YT.PlayerState.PAUSED) {
            isPlaying = false;
            playPauseIcon.className = 'fas fa-play';
        } else if (event.data === YT.PlayerState.ENDED) {
            if (player.nextVideo) player.nextVideo();
        }
        setTimeout(() => syncCurrentIndex(), 100);
    }
    
    function setupControls() {
        document.getElementById('ytp_play_pause_btn').onclick = () => {
            if (!player) return;
            if (isPlaying) player.pauseVideo();
            else player.playVideo();
        };
        document.getElementById('ytp_next_btn').onclick = () => {
            if (player && player.nextVideo) player.nextVideo();
        };
        document.getElementById('ytp_prev_btn').onclick = () => {
            if (player && player.previousVideo) player.previousVideo();
        };
        document.getElementById('ytp_home_btn').onclick = () => window.location.href = '/';
        
        document.getElementById('ytp_fullscreen_btn').onclick = async function() {
            if (!document.fullscreenElement) {
                try {
                    if (isMobile()) { await lockToLandscape(); }
                    await container.requestFullscreen();
                    container.classList.add('ytp_fullscreen_mode');
                    setTimeout(() => {
                        setupFullscreenPlaylistEvents();
                        showPlaylist();
                        hidePlaylistAfterDelay();
                    }, 100);
                } catch(err) {
                    console.warn(err);
                    container.requestFullscreen().catch(e => console.warn(e));
                    container.classList.add('ytp_fullscreen_mode');
                }
            } else {
                try {
                    if (isMobile()) { await unlockOrientation(); }
                    await document.exitFullscreen();
                    container.classList.remove('ytp_fullscreen_mode');
                    if (hidePlaylistTimeout) clearTimeout(hidePlaylistTimeout);
                } catch(err) {
                    document.exitFullscreen();
                    container.classList.remove('ytp_fullscreen_mode');
                }
            }
        };
        
        document.addEventListener('fullscreenchange', async () => {
            if (!document.fullscreenElement) {
                container.classList.remove('ytp_fullscreen_mode');
                if (hidePlaylistTimeout) clearTimeout(hidePlaylistTimeout);
                if (isMobile()) { await unlockOrientation(); }
            } else {
                container.classList.add('ytp_fullscreen_mode');
                setTimeout(() => {
                    setupFullscreenPlaylistEvents();
                    showPlaylist();
                    hidePlaylistAfterDelay();
                }, 100);
            }
        });
        
        window.addEventListener('orientationchange', () => {
            if (container.classList.contains('ytp_fullscreen_mode') && isMobile()) {
                setTimeout(() => {
                    const iframe = document.querySelector('#ytp_player iframe');
                    if (iframe) {
                        iframe.style.width = '100%';
                        iframe.style.height = '100%';
                    }
                }, 100);
            }
        });
    }
    
    setupControls();
    setupScrubber();
    
    window.addEventListener('beforeunload', () => {
        if (timeUpdateInterval) clearInterval(timeUpdateInterval);
        if (hidePlaylistTimeout) clearTimeout(hidePlaylistTimeout);
        if (isMobile()) { unlockOrientation(); }
    });
})();