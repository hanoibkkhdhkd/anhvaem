// YouTube Mix Player - Fullscreen PWA
// Chỉ cần thêm <div id="ytp_data" data-playlist="YOUR_PLAYLIST_ID"></div> vào HTML

(function() {
    // Kiểm tra xem div chính đã tồn tại chưa, nếu chưa thì tạo mới
    if (!document.querySelector('.ytp_container')) {
        // Tạo cấu trúc HTML nếu chưa có
        const containerHTML = `
            <div class="ytp_container" id="mainContainer">
                <div class="ytp_player_wrapper">
                    <div id="ytp_player" class="ytp_player"></div>
                </div>

                <div class="main_controls_row">
                    <button class="ytp_ctrl_btn ytp_home_btn" id="ytp_home_btn" title="Về trang chủ"><i class="fas fa-home"></i></button>
                    <button class="ytp_ctrl_btn" id="ytp_prev_btn" title="Bài trước"><i class="fas fa-step-backward"></i></button>
                    <button class="ytp_ctrl_btn ytp_play_pause" id="ytp_play_pause_btn"><i class="fas fa-play"></i></button>
                    <button class="ytp_ctrl_btn" id="ytp_next_btn" title="Bài sau"><i class="fas fa-step-forward"></i></button>
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
                        <div id="ytp_playlist" class="ytp_playlist"><div style="grid-column:1/-1; text-align:center; padding:40px; color:#888;"><i class="fas fa-spinner fa-spin"></i> Đang tải danh sách video...</div></div>
                        <div id="ytp_pagination" class="ytp_pagination"></div>
                    </div>
                </div>
            </div>
            <div class="install-prompt" id="installPrompt">
                <i class="fas fa-download"></i>
                <span>Cài đặt ứng dụng <strong>YouTube Player</strong></span>
                <i class="fas fa-chevron-right"></i>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', containerHTML);
    }

    let player;
    let isPlaying = false;
    let videoList = [];        
    let currentVideoIndex = 0;
    let currentPage = 1;
    let hidePlaylistTimeout = null;
    let originalOrientation = null;
    let playlistLoadInterval = null;
    let reloadTimeout = null;
    let isReloading = false;
    let reloadCount = 0;
    let isVideoEnding = false;
    const MAX_RELOAD = 3;
    const VIDEOS_PER_PAGE = 20;
    
    let imageObserver = null;
    
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
    
    // PWA
    let deferredPrompt = null;
    const installPrompt = document.getElementById('installPrompt');
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installPrompt) installPrompt.style.display = 'flex';
    });
    
    if (installPrompt) {
        installPrompt.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    installPrompt.style.display = 'none';
                }
                deferredPrompt = null;
            }
        });
    }
    
    function initLazyLoad() {
        if ('IntersectionObserver' in window) {
            imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.dataset.src;
                        if (src) {
                            img.src = src;
                            img.classList.add('loaded');
                        }
                        imageObserver.unobserve(img);
                    }
                });
            }, { rootMargin: '50px' });
        }
    }
    
    function observeImages() {
        if (!imageObserver) return;
        document.querySelectorAll('.ytp_video img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
    
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
                console.log('Đã khóa màn hình ngang');
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
                console.log('Đã mở khóa xoay màn hình');
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
            playlistDiv.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#888;"><i class="fas fa-spinner fa-spin"></i> Đang tải danh sách video...</div>';
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
            
            const thumbnailUrl = `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`;
            const fallbackUrl = 'https://i.ytimg.com/vi/default.jpg';
            item.innerHTML = `<img data-src="${thumbnailUrl}" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='100%25' height='100%25' fill='%23222'/%3E%3C/svg%3E" loading="lazy" onerror="this.src='${fallbackUrl}'; this.classList.add('loaded')">`;
            item.onclick = (e) => {
                e.stopPropagation();
                playVideoAtIndex(absoluteIndex);
            };
            playlistDiv.appendChild(item);
        });
        
        setTimeout(() => {
            if (imageObserver) {
                document.querySelectorAll('.ytp_video img[data-src]').forEach(img => {
                    imageObserver.observe(img);
                });
            } else {
                document.querySelectorAll('.ytp_video img[data-src]').forEach(img => {
                    img.src = img.dataset.src;
                    img.classList.add('loaded');
                });
            }
        }, 100);
        
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
        
        if (playlistDiv.scrollLeft !== undefined) playlistDiv.scrollLeft = 0;
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
    
    function checkPlayerHanging() {
        if (reloadTimeout) clearTimeout(reloadTimeout);
        
        reloadTimeout = setTimeout(() => {
            if (isReloading) return;
            
            try {
                const duration = player.getDuration();
                const videoData = player.getVideoData();
                
                if (duration === 0 && (!videoData || !videoData.video_id) && videoList.length === 0) {
                    console.warn("⚠️ Player có vẻ bị treo, reloading...");
                    forceReloadPlayer();
                } else {
                    console.log("✅ Player OK, duration:", duration, "video:", videoData?.video_id, "playlist_len:", videoList.length);
                }
            } catch(e) {
                console.warn("⚠️ Lỗi khi check player:", e);
                forceReloadPlayer();
            }
        }, 25000);
    }
    
    function forceReloadPlayer() {
        if (isReloading) return;
        
        if (reloadCount >= MAX_RELOAD) {
            console.error("❌ Đã thử reload", MAX_RELOAD, "lần. Dừng lại.");
            playlistDiv.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#ff6666;"><i class="fas fa-exclamation-triangle"></i> Không thể khởi động trình phát. Vui lòng tải lại trang.</div>';
            mixInfoDiv.style.display = 'block';
            mixInfoDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Trình phát gặp lỗi. Hãy tải lại trang (F5).';
            return;
        }
        
        isReloading = true;
        reloadCount++;
        console.log(`🔄 Reload player (lần ${reloadCount}/${MAX_RELOAD})...`);
        
        try {
            if (player && player.destroy) {
                player.destroy();
            }
        } catch(e) {}
        
        videoList = [];
        currentVideoIndex = 0;
        currentPage = 1;
        if (playlistLoadInterval) clearInterval(playlistLoadInterval);
        playlistLoadInterval = null;
        
        playlistDiv.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#ffaa00;"><i class="fas fa-sync-alt fa-spin"></i> Đang khởi động lại trình phát (lần ${reloadCount}/${MAX_RELOAD})...</div>`;
        
        setTimeout(() => {
            isReloading = false;
            window.onYouTubeIframeAPIReady();
        }, 500);
    }
    
    function waitForPlayer(maxTry = 30) {
        let count = 0;
        
        if (playlistLoadInterval) clearInterval(playlistLoadInterval);
        
        playlistLoadInterval = setInterval(() => {
            count++;
            
            try {
                const playlist = player.getPlaylist();
                
                if (playlist && playlist.length > 0) {
                    clearInterval(playlistLoadInterval);
                    playlistLoadInterval = null;
                    
                    videoList = playlist.map((id, idx) => ({ id: id, title: `Video ${idx + 1}` }));
                    mixInfoDiv.style.display = 'none';
                    renderPlaylistPage();
                    
                    reloadCount = 0;
                    
                    try {
                        const idx = player.getPlaylistIndex();
                        if (idx !== undefined && idx !== -1) {
                            currentVideoIndex = idx;
                            renderPlaylistPage();
                        }
                    } catch(e) {}
                    
                    console.log("✅ Playlist loaded:", playlist.length);
                    return;
                }
            } catch(e) {
                console.log("⏳ Chưa lấy được playlist, thử lại lần", count);
            }
            
            if (count >= maxTry) {
                clearInterval(playlistLoadInterval);
                playlistLoadInterval = null;
                
                console.error("❌ Không thể tải playlist sau", maxTry, "lần thử");
                playlistDiv.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#ff6666;"><i class="fas fa-exclamation-triangle"></i> Không thể tải danh sách phát. Vui lòng tải lại trang.</div>';
                mixInfoDiv.style.display = 'block';
                mixInfoDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Không tải được danh sách từ YouTube. Hãy thử tải lại trang.';
            }
        }, 1000);
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
    
    function onPlayerError(event) {
        const videoData = player?.getVideoData?.();
        console.error("❌ YT ERROR:", event.data, "video:", videoData?.video_id, videoData?.title);
        
        if (event.data === 100 || event.data === 101 || event.data === 150) {
            console.warn("⚠️ Video bị lỗi, thử skip...");
            if (player && player.nextVideo) {
                setTimeout(() => player.nextVideo(), 500);
            }
        } else if (event.data === 2 || event.data === 5) {
            console.warn("⚠️ Lỗi trình phát, reload...");
            forceReloadPlayer();
        }
    }
    
    window.onYouTubeIframeAPIReady = function() {
        const dataEl = document.getElementById('ytp_data');
        if (!dataEl) {
            console.error("Không tìm thấy div #ytp_data");
            return;
        }
        const listId = dataEl.dataset.playlist;
        if (!listId) {
            console.error("data-playlist không được thiết lập");
            return;
        }
        
        player = new YT.Player('ytp_player', {
            height: '100%', width: '100%',
            playerVars: {
                listType: 'playlist', list: listId,
                autoplay: 0, controls: 0, rel: 0, showinfo: 0, iv_load_policy: 3
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
            }
        });
    };
    
    function onPlayerReady(event) {
        console.log("🎬 Player ready");
        checkPlayerHanging();
        waitForPlayer(30);
        
        if (timeUpdateInterval) clearInterval(timeUpdateInterval);
        timeUpdateInterval = setInterval(updateTimeUI, 1000);
        updateTimeUI();
    }
    
    function onPlayerStateChange(event) {
        console.log("📺 Player state:", event.data);
        
        if (event.data === YT.PlayerState.PLAYING) {
            isPlaying = true;
            playPauseIcon.className = 'fas fa-pause';
            updateTimeUI();
            isVideoEnding = false;
            
            if (videoList.length === 0 && !playlistLoadInterval) {
                console.log("📋 Chưa có playlist, thử lấy lại khi đang PLAYING...");
                waitForPlayer(10);
            }
            
            try {
                const videoData = player.getVideoData();
                if (videoData && videoData.video_id) {
                    const exists = videoList.some(v => v.id === videoData.video_id);
                    if (!exists && videoList.length > 0) {
                        videoList.push({ id: videoData.video_id, title: videoData.title || `Video ${videoList.length + 1}` });
                        renderPlaylistPage();
                    }
                }
            } catch(e) {}
            
        } else if (event.data === YT.PlayerState.PAUSED) {
            isPlaying = false;
            playPauseIcon.className = 'fas fa-play';
        } else if (event.data === YT.PlayerState.ENDED) {
            console.log("🎬 Video ended, YouTube sẽ tự động next");
            setTimeout(() => { isVideoEnding = false; }, 1000);
        }
        
        setTimeout(() => syncCurrentIndex(), 100);
    }
    
    function setupControls() {
        const homeBtn = document.getElementById('ytp_home_btn');
        const playPauseBtn = document.getElementById('ytp_play_pause_btn');
        const nextBtn = document.getElementById('ytp_next_btn');
        const prevBtn = document.getElementById('ytp_prev_btn');
        const fullscreenBtn = document.getElementById('ytp_fullscreen_btn');
        
        if (playPauseBtn) {
            playPauseBtn.onclick = () => {
                if (!player) return;
                if (isPlaying) player.pauseVideo();
                else player.playVideo();
            };
        }
        if (nextBtn) {
            nextBtn.onclick = () => {
                if (player && player.nextVideo) player.nextVideo();
            };
        }
        if (prevBtn) {
            prevBtn.onclick = () => {
                if (player && player.previousVideo) player.previousVideo();
            };
        }
        if (homeBtn) {
            homeBtn.onclick = () => window.location.href = '/';
        }
        if (fullscreenBtn) {
            fullscreenBtn.onclick = async function() {
                if (!document.fullscreenElement) {
                    try {
                        if (isMobile()) {
                            await lockToLandscape();
                        }
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
                        if (isMobile()) {
                            await unlockOrientation();
                        }
                        await document.exitFullscreen();
                        container.classList.remove('ytp_fullscreen_mode');
                        if (hidePlaylistTimeout) clearTimeout(hidePlaylistTimeout);
                    } catch(err) {
                        document.exitFullscreen();
                        container.classList.remove('ytp_fullscreen_mode');
                    }
                }
            };
        }
        
        document.addEventListener('fullscreenchange', async () => {
            if (!document.fullscreenElement) {
                container.classList.remove('ytp_fullscreen_mode');
                if (hidePlaylistTimeout) clearTimeout(hidePlaylistTimeout);
                if (isMobile()) {
                    await unlockOrientation();
                }
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
    
    // Thêm CSS động nếu chưa có
    if (!document.querySelector('#ytp-dynamic-styles')) {
        const style = document.createElement('style');
        style.id = 'ytp-dynamic-styles';
        style.textContent = `
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { background: #0a0a0a; padding: 20px; font-family: 'Segoe UI', sans-serif; }
            .install-prompt {
                position: fixed; bottom: 20px; right: 20px;
                background: #1a1a1a; padding: 12px 20px;
                border-radius: 40px; display: none; align-items: center;
                gap: 12px; z-index: 1000; border: 1px solid #ff0000;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                cursor: pointer; transition: 0.2s;
            }
            .install-prompt:hover { background: #2a2a2a; transform: scale(1.02); }
            .install-prompt i { color: #ff0000; font-size: 20px; }
            .install-prompt span { color: white; font-size: 14px; }
            
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
                background: transparent;
                z-index: 3;
                display: flex; flex-direction: row;
                align-items: center; justify-content: center;
                gap: 12px;
            }
            
            .ytp_container.ytp_fullscreen_mode .time_scrubber_wrap {
                position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
                background: transparent;
                z-index: 3;
                display: flex; flex-direction: row;
                align-items: center; justify-content: center;
                gap: 12px;
                min-width: 300px;
            }
            
            .ytp_container.ytp_fullscreen_mode .playlist_section {
                position: fixed; bottom: 145px; left: 5%; right: 5%;
                background: rgba(0,0,0,0.6);
                padding: 10px 15px;
                z-index: 2;
                transform: translateY(200%);
                transition: transform 0.3s ease;
                border-radius: 16px;
                margin: 0;
            }
            
            .ytp_container.ytp_fullscreen_mode .playlist_section.show {
                transform: translateY(0);
            }
            
            .ytp_container.ytp_fullscreen_mode .ytp_playlist {
                display: flex !important; flex-direction: row !important; 
                overflow-x: auto !important; overflow-y: hidden !important;
                grid-template-columns: unset !important;
                gap: 10px; margin: 5px 0; padding-bottom: 5px;
                -webkit-overflow-scrolling: touch;
            }
            
            .ytp_container.ytp_fullscreen_mode .ytp_video {
                min-width: 130px; width: 130px; flex-shrink: 0;
            }
            
            .ytp_container.ytp_fullscreen_mode .ytp_video img {
                width: 100%; height: 73px; object-fit: cover;
                border-radius: 6px; display: block;
            }
            
            .ytp_player_wrapper { width: 100%; background: #000; border-radius: 12px; overflow: hidden; }
            .ytp_player { width: 100%; aspect-ratio: 16/9; background: #000; }
            
            .main_controls_row {
                display: flex; flex-wrap: wrap; justify-content: center; align-items: center;
                gap: 12px; padding: 12px 20px; margin-top: 12px;
                background: transparent;
            }
            
            .time_scrubber_wrap {
                display: flex; align-items: center; justify-content: center;
                gap: 12px; margin-top: 8px; margin-bottom: 8px;
                background: transparent;
                padding: 8px 20px;
            }
            
            .ytp_ctrl_btn {
                width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
                border: 1px solid rgba(255,255,255,0.3); background: rgba(0,0,0,0.5);
                color: white; cursor: pointer; display: inline-flex;
                align-items: center; justify-content: center; transition: 0.2s;
                backdrop-filter: blur(1px);
            }
            
            .ytp_ctrl_btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.05); }
            .ytp_play_pause { width: 35px; height: 35px; background: rgba(255,0,0,0.8); font-size: 24px; }
            .ytp_play_pause:hover { background: rgba(255,0,0,1); }
            
            .time_label { 
                color: #fff; font-size: 13px; font-family: monospace; 
                background: rgba(0,0,0,0.5); padding: 4px 8px; border-radius: 20px; 
                flex-shrink: 0; 
                backdrop-filter: blur(4px);
            }
            
            .scrubber_slider {
                width: 300px; height: 5px; -webkit-appearance: none;
                background: rgba(255,255,255,0.3); border-radius: 5px; cursor: pointer;
            }
            
            .scrubber_slider::-webkit-slider-thumb {
                -webkit-appearance: none; width: 16px; height: 16px;
                border-radius: 50%; background: #ff0000; cursor: pointer;
            }
            
            .playlist_header {
                display: flex; justify-content: space-between; align-items: center;
                color: #ddd; padding: 12px 4px; margin-top: 20px;
                border-bottom: 1px solid #333;
            }
            
            .playlist_title { font-weight: bold; font-size: 1.2rem; display: flex; gap: 8px; align-items: center; }
            .playlist_title i { color: #ff0000; }
            .page_info { background: #222; padding: 4px 12px; border-radius: 30px; font-size: 14px; }
            
            .ytp_playlist {
                display: grid; grid-template-columns: repeat(4, 2fr);
                gap: 12px; margin: 15px 0;
            }
            
            .ytp_video {
                border: 2px solid #333; border-radius: 10px; cursor: pointer;
                overflow: hidden; transition: 0.2s; background: #111;
            }
            
            .ytp_video:hover { transform: translateY(-3px); border-color: #ff5555; }
            .ytp_video.playing { border-color: #ff0000; box-shadow: 0 0 10px rgba(255,0,0,0.5); }
            .ytp_video img { width: 100%; display: block; aspect-ratio: 16/9; object-fit: cover; opacity: 0; transition: opacity 0.2s; }
            .ytp_video img.loaded { opacity: 1; }
            
            .video_title_mini { display: none; }
            
            .ytp_pagination {
                display: flex; justify-content: center; gap: 10px;
                flex-wrap: wrap; margin: 10px 0;
            }
            
            .page_btn {
                background: #2a2a2a; border: none; color: white;
                padding: 8px 16px; border-radius: 30px; cursor: pointer;
                font-weight: bold; transition: 0.2s;
            }
            
            .page_btn.active { background: #ff0000; }
            .page_btn:hover:not(.active) { background: #ff4444; }
            .page_btn:disabled { opacity: 0.4; cursor: not-allowed; }
            
            .mix_notice {
                background: rgba(255,255,255,0.05); border-radius: 12px;
                padding: 12px; text-align: center; margin: 15px 0;
                color: #ffaa00;
            }
            
            .ytp_container.ytp_fullscreen_mode .ytp_pagination { justify-content: center; margin-top: 5px; gap: 6px; }
            .ytp_container.ytp_fullscreen_mode .page_btn {
                background: rgba(0,0,0,0.6); padding: 4px 10px; font-size: 12px; border-radius: 4px;
            }
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
                .ytp_container.ytp_fullscreen_mode {
                    transform: rotate(0deg);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    initLazyLoad();
    setupControls();
    setupScrubber();
    
    window.addEventListener('beforeunload', () => {
        if (timeUpdateInterval) clearInterval(timeUpdateInterval);
        if (hidePlaylistTimeout) clearTimeout(hidePlaylistTimeout);
        if (playlistLoadInterval) clearInterval(playlistLoadInterval);
        if (reloadTimeout) clearTimeout(reloadTimeout);
        if (isMobile()) {
            unlockOrientation();
        }
    });
})();