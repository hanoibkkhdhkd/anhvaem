(function(){
    // Đảm bảo YouTube API được tải trước
    if(!window.YT_API_LOADED) {
        var tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        window.YT_API_LOADED = true;
    }
    
    // Hàm khởi tạo player cho từng container
    function initPlayers() {
        const containers = document.querySelectorAll('.ytp-container:not(.ytp-initialized)');
        if(!containers.length) return;
        
        containers.forEach(container => {
            container.classList.add('ytp-initialized');
            const playlistIdAttr = container.getAttribute('data-id');
            if(!playlistIdAttr) return;
            
            // Xử lý UC -> UU (channel to playlist)
            let playlistId = playlistIdAttr;
            if(playlistIdAttr.startsWith('UC')) {
                playlistId = 'UU' + playlistIdAttr.substring(2);
            }
            
            // Tạo ID duy nhất cho player
            const playerId = 'ytp_player_' + Math.random().toString(36).substr(2, 8);
            
            // Tạo HTML cho player
            container.innerHTML = `
                <style>
                    .ytp-inner *{margin:0;padding:0;box-sizing:border-box}
                    .ytp-inner{max-width:900px;margin:auto;padding:8px;border:3px solid red;border-radius:10px;position:relative;background:#0a0a0a;transition:all 0.2s;font-family:system-ui,-apple-system,sans-serif;color:#fff}
                    .ytp-player-wrap{position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:6px;overflow:hidden}
                    .ytp-player-inner{width:100%;height:100%;position:relative;z-index:1}
                    .ytp-overlay{position:absolute;top:0;left:0;width:100%;height:100%;z-index:2;pointer-events:none}
                    .ytp-swipe{position:absolute;top:0;left:0;width:100%;height:100%;display:flex;z-index:3;pointer-events:auto}
                    .ytp-swipe div{flex:1}
                    .ytp-controls{position:absolute;bottom:12px;left:12px;right:12px;z-index:20;pointer-events:auto;display:flex;align-items:center;gap:10px}
                    .ytp-btn-group{display:flex;gap:6px;flex-shrink:0}
                    .ytp-btn{background:rgba(0,0,0,0.55);color:#fff;border:none;cursor:pointer;border-radius:50%;font-size:14px;min-width:36px;min-height:36px;display:flex;align-items:center;justify-content:center;transition:all 0.2s ease;backdrop-filter:blur(5px);box-shadow:0 1px 3px rgba(0,0,0,0.3)}
                    .ytp-btn:active{transform:scale(0.95)}
                    .ytp-btn-play{background:rgba(255,0,0,0.75);min-width:42px;min-height:42px;font-size:18px}
                    .ytp-btn-home{background:rgba(0,150,255,0.7)}
                    .ytp-progress-wrapper{flex:1;min-width:0}
                    .ytp-progress-bar-wrap{display:flex;align-items:center;gap:8px;width:100%}
                    .ytp-time{font-size:11px;font-family:monospace;min-width:38px;text-align:center;text-shadow:0 1px 2px rgba(0,0,0,0.5);background:rgba(0,0,0,0.4);padding:2px 5px;border-radius:12px}
                    .ytp-progress-bar{flex:1;height:4px;background:rgba(255,255,255,0.4);border-radius:3px;cursor:pointer;position:relative}
                    .ytp-progress-filled{height:100%;width:0%;background:linear-gradient(90deg,#ff0000,#ff6b6b);border-radius:3px;transition:width 0.1s linear}
                    .ytp-progress-handle{position:absolute;top:50%;transform:translate(-50%,-50%);width:12px;height:12px;background:#fff;border-radius:50%;border:2px solid #ff0000;opacity:0;transition:opacity 0.2s}
                    .ytp-progress-bar:hover .ytp-progress-handle{opacity:1}
                    .ytp-playlist-section{transition:all 0.3s ease}
                    .ytp-playlist{display:flex;overflow-x:auto;gap:8px;margin-top:10px;scroll-behavior:smooth;padding:4px 0;z-index:10}
                    .ytp-playlist::-webkit-scrollbar{height:4px}
                    .ytp-playlist::-webkit-scrollbar-thumb{background:#ff0000;border-radius:4px}
                    .ytp-item{width:140px;flex-shrink:0;cursor:pointer;border:2px solid #ffaa00;border-radius:6px;overflow:hidden;transition:all 0.2s ease;background:#111}
                    .ytp-item img{width:100%;display:block;aspect-ratio:16/9;object-fit:cover}
                    .ytp-item.active{border-color:#ff0000;box-shadow:0 0 10px rgba(255,0,0,0.5)}
                    .ytp-pagination{text-align:center;margin-top:10px;display:flex;flex-wrap:wrap;justify-content:center;gap:5px}
                    .ytp-page{background:#222;color:#fff;border:none;padding:5px 12px;cursor:pointer;border-radius:6px;font-size:12px;transition:0.2s}
                    .ytp-page.active{background:#ff0000}
                    .ytp-page:hover{background:#ff4444}
                    .ytp-loading{text-align:center;padding:20px;color:#fff}
                    .ytp-error{text-align:center;padding:20px;color:#ff6666}
                    .ytp-inner.full{position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;z-index:9999!important;background:#000!important;padding:0!important;border:none!important;max-width:100%!important;border-radius:0!important}
                    .ytp-inner.full .ytp-player-wrap{height:100%!important;aspect-ratio:auto!important;border-radius:0!important}
                    .ytp-inner.full .ytp-playlist-section{position:absolute;bottom:70px;left:0;right:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(20px);padding:12px;border-radius:20px 20px 0 0;margin:0;transition:transform 0.3s ease,opacity 0.3s ease;transform:translateY(100%);opacity:0;pointer-events:none;z-index:200}
                    .ytp-inner.full .ytp-playlist{margin-top:0;max-height:160px;overflow-y:auto}
                    .ytp-inner.full .ytp-pagination{margin-top:8px;margin-bottom:4px}
                    .ytp-inner.full.show-playlist .ytp-playlist-section{transform:translateY(0);opacity:1;pointer-events:auto}
                    .ytp-inner.full .ytp-controls{background:transparent;backdrop-filter:none;bottom:12px}
                    .ytp-inner.full .ytp-item{width:130px}
                    @media(max-width:600px){.ytp-item{width:110px}.ytp-controls{bottom:10px;left:10px;right:10px}.ytp-inner.full .ytp-item{width:100px}}
                </style>
                <div class="ytp-inner">
                    <div class="ytp-player-wrap">
                        <div id="${playerId}" style="width:100%;height:100%"></div>
                        <div class="ytp-overlay">
                            <div class="ytp-swipe">
                                <div class="ytp-swipe-left"></div>
                                <div class="ytp-swipe-right"></div>
                            </div>
                        </div>
                        <div class="ytp-controls">
                            <div class="ytp-btn-group">
                                <button class="ytp-btn ytp-btn-home ytp-home-btn">🏠</button>
                                <button class="ytp-btn ytp-prev-btn">⏮</button>
                                <button class="ytp-btn ytp-btn-play ytp-play-pause-btn">▶</button>
                                <button class="ytp-btn ytp-next-btn">⏭</button>
                                <button class="ytp-btn ytp-full-btn">⛶</button>
                            </div>
                            <div class="ytp-progress-wrapper">
                                <div class="ytp-progress-bar-wrap">
                                    <span class="ytp-time ytp-current-time">0:00</span>
                                    <div class="ytp-progress-bar ytp-progress-bar-click">
                                        <div class="ytp-progress-filled"></div>
                                        <div class="ytp-progress-handle"></div>
                                    </div>
                                    <span class="ytp-time ytp-duration">0:00</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="ytp-playlist-section">
                        <div class="ytp-playlist ytp-playlist-list">
                            <div class="ytp-loading">⏳ Đang tải danh sách phát...</div>
                        </div>
                        <div class="ytp-pagination ytp-pagination-list"></div>
                    </div>
                </div>
            `;
            
            const inner = container.querySelector('.ytp-inner');
            let player = null, list = [], index = 0, isFull = false, currentPage = 1;
            let hidePlaylistTimer = null;
            let readyCheckInterval = null;
            const perPage = 12;
            
            // Elements
            const playBtn = inner.querySelector('.ytp-play-pause-btn');
            const prevBtn = inner.querySelector('.ytp-prev-btn');
            const nextBtn = inner.querySelector('.ytp-next-btn');
            const fullBtn = inner.querySelector('.ytp-full-btn');
            const homeBtn = inner.querySelector('.ytp-home-btn');
            const progressBar = inner.querySelector('.ytp-progress-bar-click');
            const progressFilled = inner.querySelector('.ytp-progress-filled');
            const progressHandle = inner.querySelector('.ytp-progress-handle');
            const timeCurrent = inner.querySelector('.ytp-current-time');
            const timeDuration = inner.querySelector('.ytp-duration');
            const leftDiv = inner.querySelector('.ytp-swipe-left');
            const rightDiv = inner.querySelector('.ytp-swipe-right');
            const playlistDiv = inner.querySelector('.ytp-playlist-list');
            const paginationDiv = inner.querySelector('.ytp-pagination-list');
            
            function formatTime(s){
                if(isNaN(s)||s<0||!isFinite(s)) return "0:00";
                const m=Math.floor(s/60), r=Math.floor(s%60);
                return m+":"+(r<10?"0":"")+r;
            }
            
            function showPlaylistInFullscreen(){
                if(!isFull) return;
                inner.classList.add("show-playlist");
                if(hidePlaylistTimer) clearTimeout(hidePlaylistTimer);
                hidePlaylistTimer = setTimeout(() => { if(isFull) inner.classList.remove("show-playlist"); }, 3000);
            }
            
            function hidePlaylistInFullscreen(){
                if(hidePlaylistTimer) clearTimeout(hidePlaylistTimer);
                inner.classList.remove("show-playlist");
            }
            
            function bindFullscreenEvents(){
                if(!isFull) return;
                const playlistSection = inner.querySelector('.ytp-playlist-section');
                const showHandler = () => showPlaylistInFullscreen();
                const hideHandler = () => {
                    if(playlistSection && playlistSection.matches(':hover')) return;
                    if(hidePlaylistTimer) clearTimeout(hidePlaylistTimer);
                    hidePlaylistTimer = setTimeout(() => {
                        if(isFull && !playlistSection?.matches(':hover')) inner.classList.remove("show-playlist");
                    }, 2000);
                };
                inner.addEventListener('mousemove', showHandler);
                inner.addEventListener('touchstart', showHandler);
                if(playlistSection) playlistSection.addEventListener('mouseleave', hideHandler);
                inner._showHandler = showHandler;
                inner._hideHandler = hideHandler;
            }
            
            function unbindFullscreenEvents(){
                if(inner._showHandler){
                    inner.removeEventListener('mousemove', inner._showHandler);
                    inner.removeEventListener('touchstart', inner._showHandler);
                    const playlistSection = inner.querySelector('.ytp-playlist-section');
                    if(playlistSection && inner._hideHandler) playlistSection.removeEventListener('mouseleave', inner._hideHandler);
                }
                if(hidePlaylistTimer) clearTimeout(hidePlaylistTimer);
            }
            
            function updateUI(){
                if(!player || !player.getCurrentTime || !player.getCurrentTime()) return;
                const cur=player.getCurrentTime();
                const dur=player.getDuration();
                if(dur>0 && isFinite(dur)){
                    const p=(cur/dur)*100;
                    progressFilled.style.width=p+"%";
                    progressHandle.style.left=p+"%";
                    timeCurrent.textContent=formatTime(cur);
                    timeDuration.textContent=formatTime(dur);
                }
                if(playBtn) playBtn.innerHTML = (player.getPlayerState && player.getPlayerState()===1) ? "⏸" : "▶";
            }
            
            if(progressBar){
                progressBar.onclick=(e)=>{
                    const rect=progressBar.getBoundingClientRect();
                    let p=(e.clientX-rect.left)/rect.width;
                    if(p<0) p=0;
                    if(p>1) p=1;
                    if(player && player.seekTo) player.seekTo(p*player.getDuration());
                };
            }
            
            function loadVideo(i){
                if(!list.length || i<0 || i>=list.length) return;
                index=i;
                if(player && player.loadVideoById) {
                    player.loadVideoById(list[index]);
                }
                highlight();
            }
            
            function next(){ 
                if(list.length){ 
                    index=(index+1)%list.length; 
                    loadVideo(index); 
                } 
            }
            
            function prev(){ 
                if(list.length){ 
                    index=(index-1+list.length)%list.length; 
                    loadVideo(index); 
                } 
            }
            
            if(playBtn) playBtn.onclick=()=>{ 
                if(!player) return; 
                if(player.getPlayerState && player.getPlayerState()===1){
                    player.pauseVideo();
                } else {
                    player.playVideo();
                }
            };
            
            if(prevBtn) prevBtn.onclick=prev;
            if(nextBtn) nextBtn.onclick=next;
            if(homeBtn) homeBtn.onclick=()=>{ window.location.href='/'; };
            
            if(fullBtn){
                fullBtn.onclick=async()=>{
                    if(!isFull){
                        try{
                            if(inner.requestFullscreen) await inner.requestFullscreen();
                            else if(inner.webkitRequestFullscreen) await inner.webkitRequestFullscreen();
                            else if(inner.msRequestFullscreen) await inner.msRequestFullscreen();
                            try{ if(screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape"); } catch(e){}
                        }catch(err){ console.warn("Fullscreen error:", err); }
                        inner.classList.add("full");
                        fullBtn.innerHTML="✖";
                        isFull=true;
                        setTimeout(()=>{ bindFullscreenEvents(); showPlaylistInFullscreen(); },100);
                    }else{
                        try{
                            if(document.exitFullscreen) await document.exitFullscreen();
                            else if(document.webkitExitFullscreen) await document.webkitExitFullscreen();
                            else if(document.msExitFullscreen) await document.msExitFullscreen();
                        }catch(err){ console.warn("Exit fullscreen error:", err); }
                        inner.classList.remove("full");
                        fullBtn.innerHTML="⛶";
                        isFull=false;
                        hidePlaylistInFullscreen();
                        unbindFullscreenEvents();
                    }
                };
            }
            
            document.addEventListener("fullscreenchange",()=>{
                if(!document.fullscreenElement && !document.webkitFullscreenElement){
                    if(isFull){
                        inner.classList.remove("full");
                        if(fullBtn) fullBtn.innerHTML="⛶";
                        isFull=false;
                        hidePlaylistInFullscreen();
                        unbindFullscreenEvents();
                    }
                }
            });
            document.addEventListener("webkitfullscreenchange",()=>{
                if(!document.webkitFullscreenElement && isFull){
                    inner.classList.remove("full");
                    if(fullBtn) fullBtn.innerHTML="⛶";
                    isFull=false;
                    hidePlaylistInFullscreen();
                    unbindFullscreenEvents();
                }
            });
            
            let startX=0;
            if(leftDiv && rightDiv){
                leftDiv.ontouchstart = rightDiv.ontouchstart = e=>{ startX=e.touches[0].clientX; };
                leftDiv.ontouchend = rightDiv.ontouchend = e=>{
                    let endX=e.changedTouches[0].clientX;
                    if(endX-startX>50) prev();
                    if(startX-endX>50) next();
                };
            }
            
            function renderPage(page){
                if(!list.length) return;
                currentPage=page;
                let start=(page-1)*perPage, end=Math.min(start+perPage,list.length);
                if(!playlistDiv) return;
                playlistDiv.innerHTML="";
                for(let i=start;i<end;i++){
                    let div=document.createElement("div");
                    div.className="ytp-item";
                    div.innerHTML=`<img loading="lazy" src="https://img.youtube.com/vi/${list[i]}/mqdefault.jpg" alt="thumbnail">`;
                    div.onclick=(function(idx){ return function(){ loadVideo(idx); }; })(i);
                    playlistDiv.appendChild(div);
                }
                highlight();
            }
            
            function renderPagination(){
                if(!list.length) return;
                const total=Math.ceil(list.length/perPage);
                if(!paginationDiv) return;
                if(total <= 1) {
                    paginationDiv.style.display = 'none';
                    return;
                }
                paginationDiv.style.display = 'flex';
                paginationDiv.innerHTML="";
                for(let i=1;i<=total;i++){
                    let b=document.createElement("button");
                    b.className="ytp-page"+(i===currentPage?" active":"");
                                    b.innerText=i;
                    b.onclick=()=>{
                        inner.querySelectorAll(".ytp-page").forEach(btn=>btn.classList.remove("active"));
                        b.classList.add("active");
                        renderPage(i);
                    };
                    paginationDiv.appendChild(b);
                }
            }
            
            function highlight(){
                const items=inner.querySelectorAll(".ytp-item");
                const startIdx=(currentPage-1)*perPage;
                items.forEach((el,i)=>{
                    let globalIdx=startIdx+i;
                    if(globalIdx===index) el.classList.add("active");
                    else el.classList.remove("active");
                });
            }
            
            function showError(message) {
                if(playlistDiv) {
                    playlistDiv.innerHTML = `<div class="ytp-error">❌ ${message}</div>`;
                }
                if(paginationDiv) paginationDiv.innerHTML = '';
            }
            
            function loadPlaylistWithRetry(retryCount = 0) {
                // Thử lấy playlist từ API trực tiếp nếu player không có
                if(!window.gapi) {
                    // Fallback: tạo playlist từ channel ID
                    if(playlistId.startsWith('UU')) {
                        const channelId = 'UC' + playlistId.substring(2);
                        showError(`Không thể tải playlist. Vui lòng kiểm tra ID kênh: ${channelId}`);
                    } else {
                        showError(`Không thể tải playlist. Playlist ID: ${playlistId}`);
                    }
                    return;
                }
            }
            
            // Kiểm tra player đã sẵn sàng chưa
            function waitForPlayerReady() {
                if(readyCheckInterval) clearInterval(readyCheckInterval);
                
                readyCheckInterval = setInterval(() => {
                    if(player && player.getPlaylist && typeof player.getPlaylist === 'function') {
                        const videoList = player.getPlaylist();
                        if(videoList && videoList.length > 0) {
                            clearInterval(readyCheckInterval);
                            list = videoList;
                            renderPage(1);
                            renderPagination();
                            updateUI();
                            
                            // Tự động phát video đầu tiên sau 1 giây
                            setTimeout(() => {
                                if(player && player.playVideo) player.playVideo();
                            }, 1000);
                        } else if(player.getPlaylistQueue && player.getPlaylistQueue()) {
                            // Thử cách khác
                            const queue = player.getPlaylistQueue();
                            if(queue && queue.length > 0) {
                                clearInterval(readyCheckInterval);
                                list = queue;
                                renderPage(1);
                                renderPagination();
                                setTimeout(() => {
                                    if(player && player.playVideo) player.playVideo();
                                }, 1000);
                            }
                        }
                    }
                }, 500);
                
                // Timeout sau 10 giây
                setTimeout(() => {
                    if(readyCheckInterval) {
                        clearInterval(readyCheckInterval);
                        if(!list || list.length === 0) {
                            showError(`Không tìm thấy video. Kiểm tra lại ID: ${playlistId}`);
                        }
                    }
                }, 10000);
            }
            
            // Khởi tạo player
            function createPlayer() {
                try {
                    player = new YT.Player(playerId, {
                        width: '100%',
                        height: '100%',
                        videoId: '', // Không có video mặc định
                        playerVars: { 
                            listType: "playlist", 
                            list: playlistId, 
                            controls: 0, 
                            rel: 0, 
                            playsinline: 1, 
                            fs: 1,
                            modestbranding: 1,
                            autoplay: 0,
                            enablejsapi: 1
                        },
                        events: {
                            onReady: (e)=>{
                                console.log('Player ready, loading playlist...');
                                // Đợi một chút để playlist load
                                setTimeout(() => {
                                    const videoList = e.target.getPlaylist();
                                    if(videoList && videoList.length > 0) {
                                        list = videoList;
                                        renderPage(1);
                                        renderPagination();
                                        updateUI();
                                        
                                        // Tự động phát video đầu tiên
                                        if(list.length > 0) {
                                            setTimeout(() => {
                                                if(player && player.playVideo) player.playVideo();
                                            }, 500);
                                        }
                                    } else {
                                        // Nếu không có playlist, thử lấy playlist queue
                                        waitForPlayerReady();
                                    }
                                }, 1000);
                            },
                            onStateChange: (e)=>{ 
                                updateUI();
                                if(e.data === 0) next(); 
                            },
                            onError: (e)=>{
                                console.error('YouTube player error:', e.data);
                                if(e.data === 100 || e.data === 101 || e.data === 150) {
                                    showError('Video không thể phát hoặc không tồn tại.');
                                } else if(e.data === 2) {
                                    showError('ID playlist hoặc video không hợp lệ.');
                                }
                            }
                        }
                    });
                } catch(e) {
                    console.error('Error creating player:', e);
                    showError('Lỗi khởi tạo trình phát. Vui lòng tải lại trang.');
                }
            }
            
            // Chờ YouTube API sẵn sàng
            if(window.YT && window.YT.Player) {
                createPlayer();
            } else {
                window.onYouTubeIframeAPIReady = function() {
                    createPlayer();
                };
            }
        });
    }
    
    // Khởi tạo khi DOM sẵn sàng
    if(document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPlayers);
    } else {
        initPlayers();
    }
})();