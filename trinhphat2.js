(function() {
    'use strict';
    
    // Hàm chuyển tiếng Việt có dấu thành không dấu
    function ytmpRemoveDiacritics(str) {
        const accents = 'ÀÁÂÃÄÅàáâãäåÒÓÔÕÖØòóôõöøÈÉÊËèéêëÇçÌÍÎÏìíîïÙÚÛÜùúûüÿÑñ';
        const accentsOut = 'AAAAAAaaaaaaOOOOOOooooooEEEEeeeeCcIIIIiiiiUUUUuuuuyNn';
        return str.split('').map(function(char) {
            var index = accents.indexOf(char);
            return index !== -1 ? accentsOut[index] : char;
        }).join('');
    }
    
    // Hàm tìm kiếm không dấu
    function ytmpSearchVideo(title, keyword) {
        if (!keyword) return true;
        var titleLower = title.toLowerCase();
        var keywordLower = keyword.toLowerCase();
        if (titleLower.indexOf(keywordLower) !== -1) return true;
        var titleNoAccent = ytmpRemoveDiacritics(titleLower);
        var keywordNoAccent = ytmpRemoveDiacritics(keywordLower);
        return titleNoAccent.indexOf(keywordNoAccent) !== -1;
    }
    
    function escapeHtml(str) {
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
    
    // Khởi tạo tất cả player trên trang
    function initAllYtmpPlayers() {
        var containers = document.querySelectorAll('.ytmp_container');
        containers.forEach(function(container, idx) {
            if (!container.id) container.id = 'ytmpContainer_' + idx;
            initYtmpPlayer(container.id);
        });
    }
    
    function initYtmpPlayer(containerId) {
        var container = document.getElementById(containerId);
        if (!container) return;
        
        // Lấy playlist từ data attribute hoặc từ phần tử ẩn
        var playlistDataEl = container.querySelector('.ytmp_playlist_data');
        var playlist = [];
        
        if (playlistDataEl) {
            var rawText = playlistDataEl.innerText;
            var matches = rawText.match(/"([^"]+)"/g);
            if (matches) {
                playlist = matches.map(function(item) { return item.replace(/"/g, '').trim(); });
            }
        }
        
        if (playlist.length === 0) {
            console.warn('Không tìm thấy playlist cho player:', containerId);
            return;
        }
        
        // Cấu hình
        var ITEMS_PER_PAGE = 30;
        var currentPage = 1;
        var player = null;
        var currentIndex = 0;
        var isPlaying = false;
        var timer = null;
        var titles = {};
        var isFullscreen = false;
        var searchActive = false;
        var searchText = '';
        var hideTimeout = null;
        var fullscreenPlaylist = null;
        
        // Lấy các element
        var playerDiv = container.querySelector('.ytmp_player');
        var titleEl = container.querySelector('.ytmp_title');
        var playBtn = container.querySelector('#ytmpPlayBtn');
        var prevBtn = container.querySelector('#ytmpPrevBtn');
        var nextBtn = container.querySelector('#ytmpNextBtn');
        var fullscreenBtn = container.querySelector('#ytmpFullscreenBtn');
        var searchToggle = container.querySelector('#ytmpSearchToggle');
        var searchBox = container.querySelector('.ytmp_search_box');
        var searchInput = container.querySelector('.ytmp_search_input');
        var searchBtn = container.querySelector('.ytmp_search_btn');
        var searchClose = container.querySelector('.ytmp_search_close');
        var clearSearchBtn = container.querySelector('.ytmp_playlist_clear');
        var playlistGrid = container.querySelector('.ytmp_playlist_grid');
        var paginationDiv = container.querySelector('.ytmp_pagination');
        var progressBar = container.querySelector('.ytmp_progress_bar');
        var progressFilled = container.querySelector('.ytmp_progress_filled');
        var currentTimeEl = container.querySelector('#ytmpCurrentTime');
        var durationEl = container.querySelector('#ytmpDuration');
        var statusIndicator = container.querySelector('.ytmp_status_indicator');
        var statusText = container.querySelector('#ytmpStatusText');
        
        // Helper functions
        function formatTime(seconds) {
            if (isNaN(seconds) || seconds < 0) return '0:00';
            var mins = Math.floor(seconds / 60);
            var secs = Math.floor(seconds % 60);
            return mins + ':' + (secs < 10 ? '0' : '') + secs;
        }
        
        function fetchThumbnail(videoId) {
            return 'https://img.youtube.com/vi/' + videoId + '/default.jpg';
        }
        
        function fetchMaxresThumbnail(videoId) {
            return 'https://img.youtube.com/vi/' + videoId + '/mqdefault.jpg';
        }
        
        // Tải tất cả tiêu đề
        function fetchAllTitles() {
            if (statusText) statusText.textContent = 'Đang tải ' + playlist.length + ' video...';
            
            var promises = playlist.map(function(videoId) {
                return fetch('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' + videoId + '&format=json')
                    .then(function(response) { return response.json(); })
                    .then(function(data) { titles[videoId] = data.title; })
                    .catch(function() { titles[videoId] = 'Video ' + videoId.substring(0, 8) + '...'; });
            });
            
            Promise.all(promises).then(function() {
                if (statusText) statusText.textContent = 'Sẵn sàng';
                renderPlaylist();
                renderPagination();
            });
        }
        
        // Lấy video của trang hiện tại
        function getCurrentPageVideos() {
            var filteredPlaylist = playlist;
            if (searchActive && searchText) {
                filteredPlaylist = playlist.filter(function(videoId) {
                    var title = titles[videoId] || '';
                    return ytmpSearchVideo(title, searchText);
                });
            }
            var start = (currentPage - 1) * ITEMS_PER_PAGE;
            var end = start + ITEMS_PER_PAGE;
            return {
                videos: filteredPlaylist.slice(start, end),
                total: filteredPlaylist.length,
                filteredPlaylist: filteredPlaylist
            };
        }
        
        // Hàm cập nhật active item trong playlist
        function updateActiveItem(videoId) {
            var items = document.querySelectorAll('.ytmp_playlist_item');
            items.forEach(function(item) {
                // Lấy videoId từ item (có thể lưu trong dataset)
                var itemVideoId = item.dataset.videoid;
                if (itemVideoId === videoId) {
                    item.classList.add('ytmp_active');
                } else {
                    item.classList.remove('ytmp_active');
                }
            });
        }
        
        // Render playlist - ĐÃ SỬA LỖI HIGHLIGHT
        function renderPlaylist() {
            if (!playlistGrid) return;
            var currentVideos = getCurrentPageVideos().videos;
            var globalStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            
            playlistGrid.innerHTML = '';
            
            for (var i = 0; i < currentVideos.length; i++) {
                var videoId = currentVideos[i];
                var globalIndex = searchActive && searchText ? 
                    playlist.indexOf(videoId) : globalStartIndex + i;
                var title = titles[videoId] || 'Đang tải...';
                var thumbnailUrl = fetchThumbnail(videoId);
                
                // SỬA: So sánh bằng videoId thay vì index
                var isActive = (videoId === playlist[currentIndex]);
                var item = document.createElement('div');
                item.className = 'ytmp_playlist_item' + (isActive ? ' ytmp_active' : '');
                item.setAttribute('data-videoid', videoId);
                
                var matchHtml = '';
                if (searchActive && searchText && ytmpSearchVideo(title, searchText)) {
                    matchHtml = '<div class="ytmp_playlist_match">🔍 phù hợp</div>';
                }
                
                // ẨN ID VIDEO - chỉ hiển thị tiêu đề
                item.innerHTML = '<img class="ytmp_playlist_thumbnail" src="' + thumbnailUrl + '" alt="thumbnail" loading="lazy">' +
                    '<div class="ytmp_playlist_info">' +
                        '<div class="ytmp_playlist_title">' + escapeHtml(title) + '</div>' +
                        matchHtml +
                    '</div>';
                
                // SỬA: click event dùng videoId để xác định
                item.addEventListener('click', (function(videoId, idx) {
                    return function() {
                        currentIndex = idx;
                        if (player && player.loadVideoById) player.loadVideoById(videoId);
                        if (titleEl) titleEl.textContent = titles[videoId] || 'Đang tải...';
                        // Cập nhật active bằng videoId
                        updateActiveItem(videoId);
                        updateFullscreenPlaylist();
                    };
                })(videoId, globalIndex));
                
                playlistGrid.appendChild(item);
            }
            
            var resultCount = container.querySelector('.ytmp_search_result_count');
            var total = getCurrentPageVideos().total;
            if (searchActive && searchText && resultCount) {
                resultCount.textContent = 'Tìm thấy ' + total + ' video cho "' + searchText + '"';
            } else if (resultCount) {
                resultCount.textContent = '';
            }
        }
        
        // Render phân trang
        function renderPagination() {
            if (!paginationDiv) return;
            var total = getCurrentPageVideos().total;
            var totalPages = Math.ceil(total / ITEMS_PER_PAGE);
            
            if (totalPages <= 1) {
                paginationDiv.innerHTML = '';
                return;
            }
            
            var html = '';
            html += '<button class="ytmp_page_btn"' + (currentPage === 1 ? ' disabled' : '') + ' data-page="prev">←</button>';
            
            var startPage = Math.max(1, currentPage - 2);
            var endPage = Math.min(totalPages, currentPage + 2);
            
            if (startPage > 1) {
                html += '<button class="ytmp_page_btn" data-page="1">1</button>';
                if (startPage > 2) html += '<span class="ytmp_page_info">...</span>';
            }
            
            for (var i = startPage; i <= endPage; i++) {
                html += '<button class="ytmp_page_btn' + (i === currentPage ? ' ytmp_active_page' : '') + '" data-page="' + i + '">' + i + '</button>';
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) html += '<span class="ytmp_page_info">...</span>';
                html += '<button class="ytmp_page_btn" data-page="' + totalPages + '">' + totalPages + '</button>';
            }
            
            html += '<button class="ytmp_page_btn"' + (currentPage === totalPages ? ' disabled' : '') + ' data-page="next">→</button>';
            
            paginationDiv.innerHTML = html;
            
            paginationDiv.querySelectorAll('.ytmp_page_btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var pageValue = this.getAttribute('data-page');
                    var newPage = currentPage;
                    if (pageValue === 'prev') newPage--;
                    else if (pageValue === 'next') newPage++;
                    else newPage = parseInt(pageValue);
                    
                    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
                        currentPage = newPage;
                        renderPlaylist();
                        renderPagination();
                        var playerEl = container.querySelector('.ytmp_player');
                        if (playerEl) playerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                });
            });
        }
        
        // Cập nhật playlist ngang fullscreen
        function updateFullscreenPlaylist() {
            if (!fullscreenPlaylist) return;
            var scrollDiv = fullscreenPlaylist.querySelector('.ytmp_fullscreen_playlist_scroll');
            if (!scrollDiv) return;
            
            scrollDiv.innerHTML = '';
            
            playlist.forEach(function(videoId, idx) {
                var title = titles[videoId] || 'Đang tải...';
                var thumbnailUrl = fetchMaxresThumbnail(videoId);
                
                var item = document.createElement('div');
                item.className = 'ytmp_fullscreen_item' + (idx === currentIndex ? ' ytmp_active_fs' : '');
                // Ẩn ID trong fullscreen
                item.innerHTML = '<img class="ytmp_fullscreen_thumbnail" src="' + thumbnailUrl + '" alt="thumbnail" loading="lazy">' +
                    '<div class="ytmp_fullscreen_title">' + escapeHtml(title) + '</div>';
                
                item.addEventListener('click', (function(videoId, idx) {
                    return function() {
                        currentIndex = idx;
                        if (player && player.loadVideoById) player.loadVideoById(videoId);
                        if (titleEl) titleEl.textContent = titles[videoId] || 'Đang tải...';
                        updateFullscreenPlaylist();
                        renderPlaylist();
                        resetHideTimer();
                        setTimeout(function() {
                            var activeItem = scrollDiv.querySelector('.ytmp_active_fs');
                            if (activeItem) activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                        }, 100);
                    };
                })(videoId, idx));
                
                scrollDiv.appendChild(item);
            });
            
            setTimeout(function() {
                var activeItem = scrollDiv.querySelector('.ytmp_active_fs');
                if (activeItem) activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }, 100);
        }
        
        // Tạo playlist ngang fullscreen
        function createFullscreenPlaylist() {
            var oldPlaylist = container.querySelector('.ytmp_fullscreen_playlist');
            if (oldPlaylist) oldPlaylist.remove();
            
            var playlistDiv = document.createElement('div');
            playlistDiv.className = 'ytmp_fullscreen_playlist ytmp_hide_playlist';
            playlistDiv.innerHTML = '<div class="ytmp_fullscreen_playlist_scroll"></div>';
            container.appendChild(playlistDiv);
            fullscreenPlaylist = playlistDiv;
            updateFullscreenPlaylist();
            
            var playlistToggleBtn = container.querySelector('#ytmpPlaylistToggleBtn');
            if (playlistToggleBtn) {
                playlistToggleBtn.addEventListener('click', function() {
                    if (fullscreenPlaylist) {
                        fullscreenPlaylist.classList.toggle('ytmp_hide_playlist');
                        resetHideTimer();
                    }
                });
            }
            
            var videoWrapper = container.querySelector('.ytmp_video_wrapper');
            var showPlaylist = function() {
                if (fullscreenPlaylist && fullscreenPlaylist.classList.contains('ytmp_hide_playlist')) {
                    fullscreenPlaylist.classList.remove('ytmp_hide_playlist');
                }
                resetHideTimer();
            };
            
            if (videoWrapper) {
                videoWrapper.addEventListener('mousemove', showPlaylist);
                videoWrapper.addEventListener('touchstart', showPlaylist);
            }
            playlistDiv.addEventListener('mousemove', showPlaylist);
            playlistDiv.addEventListener('touchstart', showPlaylist);
        }
        
        function resetHideTimer() {
            if (hideTimeout) clearTimeout(hideTimeout);
            if (isFullscreen && fullscreenPlaylist) {
                hideTimeout = setTimeout(function() {
                    if (fullscreenPlaylist && !fullscreenPlaylist.classList.contains('ytmp_hide_playlist')) {
                        fullscreenPlaylist.classList.add('ytmp_hide_playlist');
                    }
                }, 3000);
            }
        }
        
        // Fullscreen
        function toggleFullscreen() {
            if (!isFullscreen) {
                container.classList.add('ytmp_fullscreen');
                if (fullscreenBtn) fullscreenBtn.innerHTML = '✕';
                createFullscreenPlaylist();
                if (container.requestFullscreen) container.requestFullscreen();
                else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
                document.body.style.overflow = 'hidden';
                isFullscreen = true;
                if (screen.orientation && screen.orientation.lock) {
                    screen.orientation.lock('landscape').catch(function() {});
                }
            } else {
                container.classList.remove('ytmp_fullscreen');
                if (fullscreenBtn) fullscreenBtn.innerHTML = '⛶';
                if (fullscreenPlaylist) fullscreenPlaylist.remove();
                if (document.exitFullscreen) document.exitFullscreen();
                document.body.style.overflow = 'auto';
                isFullscreen = false;
                if (hideTimeout) clearTimeout(hideTimeout);
                if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
            }
            setTimeout(function() {
                if (player && player.getIframe) {
                    var iframe = player.getIframe();
                    iframe.style.width = '100%';
                    iframe.style.height = '100%';
                }
                window.dispatchEvent(new Event('resize'));
            }, 100);
        }
        
        // Tìm kiếm
        function toggleSearch() {
            if (searchBox) searchBox.classList.toggle('ytmp_show');
            if (searchBox && searchBox.classList.contains('ytmp_show') && searchInput) {
                searchInput.focus();
            }
        }
        
        function performSearch() {
            if (!searchInput) return;
            var keyword = searchInput.value.trim();
            searchActive = keyword.length > 0;
            searchText = keyword;
            currentPage = 1;
            renderPlaylist();
            renderPagination();
            if (clearSearchBtn) clearSearchBtn.style.display = searchActive ? 'inline-block' : 'none';
        }
        
        function clearSearch() {
            if (searchInput) searchInput.value = '';
            searchActive = false;
            searchText = '';
            currentPage = 1;
            renderPlaylist();
            renderPagination();
            if (searchBox) searchBox.classList.remove('ytmp_show');
            var resultCount = container.querySelector('.ytmp_search_result_count');
            if (resultCount) resultCount.textContent = '';
            if (clearSearchBtn) clearSearchBtn.style.display = 'none';
        }
        
        // Video controls
        function togglePlay() {
            if (player) {
                if (isPlaying) player.pauseVideo();
                else player.playVideo();
            }
        }
        
        function nextVideo() {
            if (!player || playlist.length === 0) return;
            currentIndex = (currentIndex + 1) % playlist.length;
            player.loadVideoById(playlist[currentIndex]);
            if (titleEl) titleEl.textContent = titles[playlist[currentIndex]] || 'Đang tải...';
            updateFullscreenPlaylist();
            updateActiveItem(playlist[currentIndex]);
            var newPage = Math.floor(currentIndex / ITEMS_PER_PAGE) + 1;
            if (newPage !== currentPage) {
                currentPage = newPage;
                renderPlaylist();
                renderPagination();
            } else {
                renderPlaylist();
            }
            if (progressFilled) progressFilled.style.width = '0%';
            if (currentTimeEl) currentTimeEl.textContent = '0:00';
            var playerEl = container.querySelector('.ytmp_player');
            if (playerEl) playerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        function prevVideo() {
            if (!player || playlist.length === 0) return;
            currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
            player.loadVideoById(playlist[currentIndex]);
            if (titleEl) titleEl.textContent = titles[playlist[currentIndex]] || 'Đang tải...';
            updateFullscreenPlaylist();
            updateActiveItem(playlist[currentIndex]);
            var newPage = Math.floor(currentIndex / ITEMS_PER_PAGE) + 1;
            if (newPage !== currentPage) {
                currentPage = newPage;
                renderPlaylist();
                renderPagination();
            } else {
                renderPlaylist();
            }
            if (progressFilled) progressFilled.style.width = '0%';
            if (currentTimeEl) currentTimeEl.textContent = '0:00';
            var playerEl = container.querySelector('.ytmp_player');
            if (playerEl) playerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        // Progress
        function startProgressUpdate() {
            if (timer) clearInterval(timer);
            timer = setInterval(function() {
                if (player && player.getCurrentTime && isPlaying) {
                    try {
                        var current = player.getCurrentTime();
                        var duration = player.getDuration();
                        if (duration > 0) {
                            var progress = (current / duration) * 100;
                            if (progressFilled) progressFilled.style.width = progress + '%';
                            if (currentTimeEl) currentTimeEl.textContent = formatTime(current);
                            if (durationEl) durationEl.textContent = formatTime(duration);
                        }
                    } catch(e) {}
                }
            }, 1000);
        }
        
        function handleProgressClick(e) {
            if (!player || !player.seekTo) return;
            var rect = progressBar.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var width = rect.width;
            var percentage = Math.max(0, Math.min(1, x / width));
            var duration = player.getDuration();
            if (duration > 0) player.seekTo(percentage * duration);
        }
        
        // Xử lý sự kiện fullscreen từ browser
        function handleFullscreenChange() {
            if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
                container.classList.remove('ytmp_fullscreen');
                if (fullscreenBtn) fullscreenBtn.innerHTML = '⛶';
                document.body.style.overflow = 'auto';
                isFullscreen = false;
                if (fullscreenPlaylist) fullscreenPlaylist.remove();
                if (hideTimeout) clearTimeout(hideTimeout);
            }
        }
        
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        
        // Load video
        function loadVideo(index) {
            if (!player || !playlist[index]) return;
            currentIndex = index;
            player.loadVideoById(playlist[currentIndex]);
            if (titleEl) titleEl.textContent = titles[playlist[currentIndex]] || 'Đang tải...';
            updateFullscreenPlaylist();
            renderPlaylist();
        }
        
        // Khởi tạo YouTube Player
        function initYouTubePlayer() {
            if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') {
                setTimeout(initYouTubePlayer, 500);
                return;
            }
            
            player = new YT.Player(playerDiv, {
                height: '100%',
                width: '100%',
                videoId: playlist[0],
                playerVars: {
                    'playsinline': 1,
                    'controls': 0,
                    'rel': 0,
                    'modestbranding': 1,
                    'enablejsapi': 1,
                    'autoplay': 1
                },
                events: {
                    'onReady': function() {
                        if (statusText) statusText.textContent = 'Sẵn sàng';
                        if (titleEl) titleEl.textContent = titles[playlist[0]] || 'Đang tải...';
                        startProgressUpdate();
                        player.setVolume(100);
                        fetchAllTitles();
                    },
                    'onStateChange': function(event) {
                        if (event.data === YT.PlayerState.PLAYING) {
                            isPlaying = true;
                            if (statusIndicator) statusIndicator.className = 'ytmp_status_indicator ytmp_playing';
                            if (statusText) statusText.textContent = 'Đang phát';
                            if (playBtn) playBtn.innerHTML = '⏸️';
                            startProgressUpdate();
                        } else if (event.data === YT.PlayerState.PAUSED) {
                            isPlaying = false;
                            if (statusIndicator) statusIndicator.className = 'ytmp_status_indicator ytmp_paused';
                            if (statusText) statusText.textContent = 'Tạm dừng';
                            if (playBtn) playBtn.innerHTML = '▶️';
                        } else if (event.data === YT.PlayerState.ENDED) {
                            isPlaying = false;
                            if (statusText) statusText.textContent = 'Kết thúc';
                            if (playBtn) playBtn.innerHTML = '▶️';
                            nextVideo();
                        } else if (event.data === YT.PlayerState.BUFFERING) {
                            if (statusText) statusText.textContent = 'Đang tải...';
                        }
                    },
                    'onError': function() {
                        if (statusText) statusText.textContent = 'Lỗi video';
                        if (statusIndicator) statusIndicator.className = 'ytmp_status_indicator';
                    }
                }
            });
        }
        
        // Gán sự kiện
        if (playBtn) playBtn.addEventListener('click', togglePlay);
        if (prevBtn) prevBtn.addEventListener('click', prevVideo);
        if (nextBtn) nextBtn.addEventListener('click', nextVideo);
        if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);
        if (searchToggle) searchToggle.addEventListener('click', toggleSearch);
        if (searchBtn) searchBtn.addEventListener('click', performSearch);
        if (searchClose) searchClose.addEventListener('click', function() {
            if (searchBox) searchBox.classList.remove('ytmp_show');
        });
        if (clearSearchBtn) clearSearchBtn.addEventListener('click', clearSearch);
        if (searchInput) {
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') performSearch();
            });
        }
        if (progressBar) progressBar.addEventListener('click', handleProgressClick);
        
        // Phím tắt
        document.addEventListener('keydown', function(e) {
            if (container !== document.activeElement && !container.contains(document.activeElement)) return;
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                toggleFullscreen();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                prevVideo();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                nextVideo();
            } else if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                togglePlay();
            } else if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                toggleSearch();
                if (searchInput) searchInput.focus();
            } else if (e.key === 'Escape' && isFullscreen) {
                toggleFullscreen();
            }
        });
        
        // Khởi tạo
        initYouTubePlayer();
        
        // Cleanup
        window.addEventListener('beforeunload', function() {
            if (timer) clearInterval(timer);
            if (hideTimeout) clearTimeout(hideTimeout);
        });
    }
    
    // Khởi tạo khi DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAllYtmpPlayers);
    } else {
        initAllYtmpPlayers();
    }
    
    // Hỗ trợ lazy load YouTube API
    if (typeof YT === 'undefined') {
        var tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
    }
})();