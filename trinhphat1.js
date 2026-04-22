
// ===== YOUTUBE PLAYLIST PLAYER - FULL VERSION =====
let ytmpPlayer = null;
let ytmpCurrentIndex = 0;
let ytmpIsPlaying = false;
let ytmpIsMuted = false;
let ytmpVolume = 100;
let ytmpTimer = null;
let ytmpTitles = {};
let ytmpIsFullscreen = false;
let ytmpPlaylist = [];
let ITEMS_PER_PAGE = 12;
let ytmpCurrentPage = 1;

// Helper functions
function ytmpFetchThumbnail(videoId) {
    return `https://img.youtube.com/vi/${videoId}/default.jpg`;
}

function ytmpGetCurrentPageVideos() {
    const start = (ytmpCurrentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return ytmpPlaylist.slice(start, end);
}

// Render phân trang
function ytmpRenderPagination() {
    const pagination = document.getElementById('ytmpPagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(ytmpPlaylist.length / ITEMS_PER_PAGE);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `<button class="ytmp_page_btn" ${ytmpCurrentPage === 1 ? 'disabled' : ''} onclick="ytmpGoToPage(${ytmpCurrentPage - 1})">←</button>`;
    
    let startPage = Math.max(1, ytmpCurrentPage - 2);
    let endPage = Math.min(totalPages, ytmpCurrentPage + 2);
    
    if (startPage > 1) {
        html += `<button class="ytmp_page_btn" onclick="ytmpGoToPage(1)">1</button>`;
        if (startPage > 2) html += `<span class="ytmp_page_info">...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="ytmp_page_btn ${i === ytmpCurrentPage ? 'ytmp_active_page' : ''}" onclick="ytmpGoToPage(${i})">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="ytmp_page_info">...</span>`;
        html += `<button class="ytmp_page_btn" onclick="ytmpGoToPage(${totalPages})">${totalPages}</button>`;
    }
    
    html += `<button class="ytmp_page_btn" ${ytmpCurrentPage === totalPages ? 'disabled' : ''} onclick="ytmpGoToPage(${ytmpCurrentPage + 1})">→</button>`;
    
    pagination.innerHTML = html;
}

window.ytmpGoToPage = function(page) {
    const totalPages = Math.ceil(ytmpPlaylist.length / ITEMS_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    
    ytmpCurrentPage = page;
    ytmpRenderPlaylist();
    ytmpRenderPagination();
};

// Render playlist
function ytmpRenderPlaylist() {
    const grid = document.getElementById('ytmpPlaylistGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const currentVideos = ytmpGetCurrentPageVideos();
    const globalStartIndex = (ytmpCurrentPage - 1) * ITEMS_PER_PAGE;
    
    for (let i = 0; i < currentVideos.length; i++) {
        const videoId = currentVideos[i];
        const globalIndex = globalStartIndex + i;
        const title = ytmpTitles[videoId] || videoId;
        const thumbnailUrl = ytmpFetchThumbnail(videoId);
        
        const item = document.createElement('div');
        item.className = `ytmp_playlist_item ${globalIndex === ytmpCurrentIndex ? 'ytmp_active' : ''}`;
        
        item.innerHTML = `
            <img class="ytmp_playlist_thumbnail" src="${thumbnailUrl}" alt="thumbnail" loading="lazy">
            <div class="ytmp_playlist_info">
                <div class="ytmp_playlist_title">${title}</div>
            </div>
        `;
        
        item.addEventListener('click', () => {
            ytmpCurrentIndex = globalIndex;
            ytmpLoadVideo(videoId);
            
            document.querySelectorAll('.ytmp_playlist_item').forEach(el => el.classList.remove('ytmp_active'));
            item.classList.add('ytmp_active');
        });
        
        grid.appendChild(item);
    }
}

// Tải tiêu đề video
async function ytmpFetchAllTitles() {
    const statusText = document.getElementById('ytmpStatusText');
    if (statusText) statusText.textContent = `Đang tải ${ytmpPlaylist.length} video...`;
    
    const promises = ytmpPlaylist.map(async (videoId) => {
        try {
            const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
            const data = await response.json();
            ytmpTitles[videoId] = data.title;
        } catch (error) {
            ytmpTitles[videoId] = videoId;
        }
    });
    
    await Promise.all(promises);
    
    if (statusText) statusText.textContent = 'Sẵn sàng';
}

// Fullscreen functions
function ytmpToggleFullscreen() {
    const container = document.getElementById('ytmpContainer');
    const fullscreenBtn = document.getElementById('ytmpFullscreenBtn');
    
    if (!ytmpIsFullscreen) {
        container.classList.add('ytmp_fullscreen');
        fullscreenBtn.innerHTML = '✕';
        fullscreenBtn.title = 'Thoát toàn màn hình';
        
        if (container.requestFullscreen) {
            container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
        } else if (container.msRequestFullscreen) {
            container.msRequestFullscreen();
        }
        
        document.body.style.overflow = 'hidden';
        ytmpIsFullscreen = true;
        
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {});
        }
    } else {
        container.classList.remove('ytmp_fullscreen');
        fullscreenBtn.innerHTML = '⛶';
        fullscreenBtn.title = 'Toàn màn hình';
        
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        
        document.body.style.overflow = 'auto';
        ytmpIsFullscreen = false;
        
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
    }
    
    setTimeout(() => {
        if (ytmpPlayer && ytmpPlayer.getIframe) {
            const iframe = ytmpPlayer.getIframe();
            iframe.style.width = '100%';
            iframe.style.height = '100%';
        }
        window.dispatchEvent(new Event('resize'));
    }, 100);
}

// Xử lý sự kiện fullscreen
document.addEventListener('fullscreenchange', ytmpHandleFullscreenChange);
document.addEventListener('webkitfullscreenchange', ytmpHandleFullscreenChange);
document.addEventListener('msfullscreenchange', ytmpHandleFullscreenChange);

function ytmpHandleFullscreenChange() {
    const container = document.getElementById('ytmpContainer');
    const fullscreenBtn = document.getElementById('ytmpFullscreenBtn');
    
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
        container.classList.remove('ytmp_fullscreen');
        fullscreenBtn.innerHTML = '⛶';
        fullscreenBtn.title = 'Toàn màn hình';
        document.body.style.overflow = 'auto';
        ytmpIsFullscreen = false;
    }
}

// YouTube API
function ytmpLoadAPI() {
    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.getElementsByTagName('script')[0].parentNode.insertBefore(tag, document.getElementsByTagName('script')[0]);
    }
}

window.onYouTubeIframeAPIReady = function() {
    if (ytmpPlaylist.length === 0) return;
    
    ytmpPlayer = new YT.Player('ytmpPlayer', {
        height: '100%',
        width: '100%',
        videoId: ytmpPlaylist[0],
        playerVars: {
            'playsinline': 1,
            'controls': 0,
            'rel': 0,
            'modestbranding': 1,
            'iv_load_policy': 3,
            'fs': 1,
            'enablejsapi': 1,
            'autoplay': 1
        },
        events: {
            'onReady': ytmpOnReady,
            'onStateChange': ytmpOnStateChange,
            'onError': ytmpOnError
        }
    });
};

function ytmpOnReady(event) {
    const statusText = document.getElementById('ytmpStatusText');
    if (statusText) statusText.textContent = 'Sẵn sàng';
    
    ytmpUpdateInfo(ytmpPlaylist[0]);
    ytmpStartProgressUpdate();
    ytmpPlayer.setVolume(ytmpVolume);
    
    const volumeLevel = document.getElementById('ytmpVolumeLevel');
    if (volumeLevel) volumeLevel.style.width = ytmpVolume + '%';
    
    ytmpFetchAllTitles().then(() => {
        ytmpRenderPlaylist();
        ytmpRenderPagination();
    });
}

function ytmpUpdateInfo(videoId) {
    const title = ytmpTitles[videoId] || videoId;
    const titleEl = document.getElementById('ytmpTitle');
    if (titleEl) titleEl.textContent = title;
}

function ytmpOnStateChange(event) {
    const indicator = document.getElementById('ytmpStatusIndicator');
    const statusText = document.getElementById('ytmpStatusText');
    const playBtn = document.getElementById('ytmpPlayBtn');

    switch(event.data) {
        case YT.PlayerState.PLAYING:
            ytmpIsPlaying = true;
            if (indicator) indicator.className = 'ytmp_status_indicator ytmp_playing';
            if (statusText) statusText.textContent = 'Đang phát';
            if (playBtn) playBtn.innerHTML = '⏸️';
            break;
            
        case YT.PlayerState.PAUSED:
            ytmpIsPlaying = false;
            if (indicator) indicator.className = 'ytmp_status_indicator ytmp_paused';
            if (statusText) statusText.textContent = 'Tạm dừng';
            if (playBtn) playBtn.innerHTML = '▶️';
            break;
            
        case YT.PlayerState.ENDED:
            ytmpIsPlaying = false;
            if (indicator) indicator.className = 'ytmp_status_indicator';
            if (statusText) statusText.textContent = 'Kết thúc';
            if (playBtn) playBtn.innerHTML = '▶️';
            ytmpNextVideo();
            break;
            
        case YT.PlayerState.BUFFERING:
            if (statusText) statusText.textContent = 'Đang tải...';
            break;
    }
}

function ytmpOnError(event) {
    const statusText = document.getElementById('ytmpStatusText');
    const indicator = document.getElementById('ytmpStatusIndicator');
    
    if (statusText) statusText.textContent = 'Lỗi video';
    if (indicator) indicator.className = 'ytmp_status_indicator';
}

function ytmpStartProgressUpdate() {
    if (ytmpTimer) clearInterval(ytmpTimer);
    
    ytmpTimer = setInterval(() => {
        if (ytmpPlayer && ytmpPlayer.getCurrentTime) {
            try {
                const current = ytmpPlayer.getCurrentTime();
                const duration = ytmpPlayer.getDuration();
                
                if (duration > 0) {
                    const progress = (current / duration) * 100;
                    const filled = document.getElementById('ytmpProgressFilled');
                    if (filled) filled.style.width = progress + '%';
                    
                    const format = (s) => {
                        const m = Math.floor(s / 60);
                        const sec = Math.floor(s % 60);
                        return `${m}:${sec < 10 ? '0' : ''}${sec}`;
                    };
                    
                    const currentTime = document.getElementById('ytmpCurrentTime');
                    const durationEl = document.getElementById('ytmpDuration');
                    
                    if (currentTime) currentTime.textContent = format(current);
                    if (durationEl) durationEl.textContent = format(duration);
                }
            } catch (e) {}
        }
    }, 1000);
}

function ytmpTogglePlay() {
    if (ytmpPlayer) {
        if (ytmpIsPlaying) {
            ytmpPlayer.pauseVideo();
        } else {
            ytmpPlayer.playVideo();
        }
    }
}

function ytmpLoadVideo(videoId) {
    if (ytmpPlayer && ytmpPlayer.loadVideoById) {
        ytmpPlayer.loadVideoById(videoId);
        ytmpUpdateInfo(videoId);
        
        setTimeout(() => {
            ytmpPlayer.playVideo();
        }, 500);
    }
}

function ytmpNextVideo() {
    ytmpCurrentIndex = (ytmpCurrentIndex + 1) % ytmpPlaylist.length;
    ytmpLoadVideo(ytmpPlaylist[ytmpCurrentIndex]);
    
    const newPage = Math.floor(ytmpCurrentIndex / ITEMS_PER_PAGE) + 1;
    if (newPage !== ytmpCurrentPage) {
        ytmpCurrentPage = newPage;
        ytmpRenderPlaylist();
        ytmpRenderPagination();
    } else {
        ytmpRenderPlaylist();
    }
}

function ytmpPrevVideo() {
    ytmpCurrentIndex = (ytmpCurrentIndex - 1 + ytmpPlaylist.length) % ytmpPlaylist.length;
    ytmpLoadVideo(ytmpPlaylist[ytmpCurrentIndex]);
    
    const newPage = Math.floor(ytmpCurrentIndex / ITEMS_PER_PAGE) + 1;
    if (newPage !== ytmpCurrentPage) {
        ytmpCurrentPage = newPage;
        ytmpRenderPlaylist();
        ytmpRenderPagination();
    } else {
        ytmpRenderPlaylist();
    }
}

function ytmpToggleMute() {
    if (ytmpPlayer) {
        if (ytmpIsMuted) {
            ytmpPlayer.unMute();
            ytmpPlayer.setVolume(ytmpVolume);
            const muteBtn = document.getElementById('ytmpMuteBtn');
            if (muteBtn) muteBtn.innerHTML = '🔊';
        } else {
            ytmpPlayer.mute();
            const muteBtn = document.getElementById('ytmpMuteBtn');
            if (muteBtn) muteBtn.innerHTML = '🔇';
        }
        ytmpIsMuted = !ytmpIsMuted;
    }
}

function ytmpSetVolume(percent) {
    if (ytmpPlayer) {
        ytmpVolume = Math.min(100, Math.max(0, percent));
        ytmpPlayer.setVolume(ytmpVolume);
        const volumeLevel = document.getElementById('ytmpVolumeLevel');
        if (volumeLevel) volumeLevel.style.width = ytmpVolume + '%';
        
        const muteBtn = document.getElementById('ytmpMuteBtn');
        if (muteBtn) {
            if (ytmpVolume === 0) muteBtn.innerHTML = '🔇';
            else if (ytmpVolume < 50) muteBtn.innerHTML = '🔈';
            else muteBtn.innerHTML = '🔊';
        }
    }
}

// Hàm đọc ID video từ bài đăng
function ytmpExtractVideoIds() {
    // Tìm bài đăng
    const postBody = document.querySelector('.post-body, .entry-content, .post-body.entry-content');
    if (!postBody) return null;
    
    // Lấy text content
    const text = postBody.innerText || postBody.textContent;
    
    // Tìm mảng videoIds
    const match = text.match(/videoIds\s*=\s*\[([^\]]+)\]/);
    if (!match) return null;
    
    try {
        // Parse array string thành mảng thực
        const arrayStr = match[1];
        const ids = arrayStr.split(',')
            .map(item => item.trim().replace(/["']/g, ''))
            .filter(id => id.length === 11);
        
        return ids;
    } catch (e) {
        console.error('Lỗi parse videoIds:', e);
        return null;
    }
}

// Kích hoạt player
function ytmpActivatePlayer() {
    const videoIds = ytmpExtractVideoIds();
    
    if (videoIds && videoIds.length > 0) {
        // Hiện container
        const container = document.getElementById('ytmpPlayerContainer');
        if (container) {
            container.style.display = 'block';
        }
        
        // Khởi tạo playlist
        ytmpPlaylist = videoIds;
        ytmpCurrentPage = 1;
        ytmpCurrentIndex = 0;
        
        // Gán sự kiện
        setTimeout(() => {
            document.getElementById('ytmpPlayBtn')?.addEventListener('click', ytmpTogglePlay);
            document.getElementById('ytmpPrevBtn')?.addEventListener('click', ytmpPrevVideo);
            document.getElementById('ytmpNextBtn')?.addEventListener('click', ytmpNextVideo);
            document.getElementById('ytmpMuteBtn')?.addEventListener('click', ytmpToggleMute);
            document.getElementById('ytmpFullscreenBtn')?.addEventListener('click', ytmpToggleFullscreen);
            
            const progressBar = document.getElementById('ytmpProgressBar');
            if (progressBar) {
                progressBar.addEventListener('click', (e) => {
                    if (ytmpPlayer && ytmpPlayer.seekTo) {
                        const rect = progressBar.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percentage = Math.max(0, Math.min(1, x / rect.width));
                        const duration = ytmpPlayer.getDuration();
                        if (duration > 0) ytmpPlayer.seekTo(percentage * duration);
                    }
                });
            }
            
            const volumeSlider = document.getElementById('ytmpVolumeSlider');
            if (volumeSlider) {
                volumeSlider.addEventListener('click', (e) => {
                    const rect = volumeSlider.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = (x / rect.width) * 100;
                    ytmpSetVolume(percentage);
                });
            }
        }, 500);
        
        // Tải YouTube API
        ytmpLoadAPI();
        
        return true;
    }
    
    return false;
}

// Khởi tạo
document.addEventListener('DOMContentLoaded', function() {
    ytmpActivatePlayer();
});

// Cho Ajax navigation
if (window.addEventListener) {
    window.addEventListener('popstate', function() {
        setTimeout(ytmpActivatePlayer, 500);
    });
}

// Dọn dẹp
window.addEventListener('beforeunload', () => {
    if (ytmpTimer) clearInterval(ytmpTimer);
});




  