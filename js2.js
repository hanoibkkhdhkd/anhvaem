// 1. Tạo CSS riêng (Căn giữa & Đánh dấu màu Active)
const styleTag = document.createElement('style');
styleTag.textContent = `
    .file-grid-container {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 12px;
        max-width: 900px;
        margin: 20px auto;
    }
    .video-item {
        flex: 0 0 calc(20% - 10px);
        min-width: 100px;
    }
    .num-box {
        background: #222;
        color: #fff;
        border: 1px solid #444;
        border-radius: 8px;
        padding: 15px 0;
        text-align: center;
        font-size: 16px;
        font-weight: bold;
        transition: 0.2s;
        cursor: pointer;
    }
    .num-box:hover { background: #333; border-color: #ff0000; color: #ff0000; transform: scale(1.05); }

    /* Ô đang xem (màu xanh nổi bật) */
    .num-box.active {
        background: #0d6efd !important;
        border-color: #0d6efd !important;
        color: #fff !important;
        box-shadow: 0 0 10px rgba(13, 110, 253, 0.8);
    }

    .video-item a { text-decoration: none; color: inherit; display: block; }

    /* Thanh phân trang bên dưới */
    #file-pagination { 
        display: flex; justify-content: center; align-items: center;
        flex-wrap: wrap; gap: 8px; max-width: 900px; margin: 0 auto; padding-bottom: 40px;
    }
    .file-page-btn {
        background: #333; color: #fff; border: none; padding: 8px 14px; 
        border-radius: 6px; cursor: pointer; font-size: 14px; transition: 0.2s;
    }
    .file-page-btn.prev-next { background: #444; }
    .file-page-btn.active { background: #0d6efd; color: #fff; font-weight: bold; }
    .file-page-dots { color: #ccc; padding: 0 5px; font-size: 16px; }
    .file-page-total-box {
        background: #fff; color: #333; padding: 6px 14px;
        border-radius: 6px; font-size: 14px; margin-left: 5px; font-weight: bold;
    }
`;
document.head.appendChild(styleTag);

// 2. Tạo cấu trúc HTML & Chèn VÀO TRONG khung Blogspot
const htmlStructure = document.createElement('div');
htmlStructure.innerHTML = `
    <div id="file-list" class="file-grid-container"></div>
    <div id="file-pagination"></div>
`;

// Tự động tìm khung bài viết Blogger để chèn vào (không bị rớt ra ngoài Footer)
const targetContainer = document.querySelector('.post-body') 
                     || document.getElementById('main') 
                     || document.querySelector('.main-wrapper');

if (targetContainer) {
    targetContainer.appendChild(htmlStructure);
} else {
    document.body.appendChild(htmlStructure);
}

// 3. Logic phân trang
(function() {
    const PER_PAGE = 5; // Số lượng item trên 1 trang

    // 👉 TÚ KHAI BÁO DANH SÁCH LINK WEB VÀO ĐÂY:
    const files = [
        'https://www.anhvaem.net/p/van-nguyen-dau-cho-gian-kia-ay-mi.html',
        'https://www.anhvaem.net/p/sinesyn-thailand-girl-beautiful.html',
        'https://www.anhvaem.net/p/ngoc-anh-mua-nay-la-mua-em-yeu-oi-xin.html',
        'https://www.anhvaem.net/p/ngan-foxie-em-ay-khong-thich-tra-aoem.html',
        'https://www.anhvaem.net/p/ly-be-anh-noi-thich-em-tu-auco-phai-la.html',
        'https://www.anhvaem.net/p/lan-vy-lua-gan-rom-lau-ngay-cung.html',
        'https://www.anhvaem.net/p/jieanlie-thailand-like-mellow-sun.html',
        'https://www.anhvaem.net/p/janie-tam-hon-nho-hanh-phuc-to.html',
        'https://www.anhvaem.net/p/ikuta-eiki-japan-beautiful.html',
        'https://www.anhvaem.net/p/heiscn-beautiful-schoolgirl.html',
        'https://www.anhvaem.net/p/beer-passaranan-thien-than-la-co-that.html',
        'https://www.anhvaem.net/p/areeya-suan-thailand-girl_059444033.html',
        'https://www.anhvaem.net/p/album-cute-chinese-girl.html',
        'https://www.anhvaem.net/p/a_01795431137.html',
        'https://www.anhvaem.net/p/abuml-anh-gai-xinh-14.html',
        'https://www.anhvaem.net/p/abuml-anh-11.html',
        'https://www.anhvaem.net/p/hinh-anh-gai-xinh-10.html',
        'https://www.anhvaem.net/p/abuml-anh-gai-xinh-9.html',
        'https://www.anhvaem.net/p/anh-gai-xinh-8.html',
        'https://www.anhvaem.net/p/abuml-anh-gai-xinh-5_24.html',
        'https://www.anhvaem.net/p/abuml-anh-gai-xinh-6.html',
        'https://www.anhvaem.net/p/abuml-anh-gai-xinh-5_6.html',
        'https://www.anhvaem.net/p/hinh-anh-gai-xinh-4.html',
        'https://www.anhvaem.net/p/hinh-anh-gai-xinh-2.html',
        'https://www.anhvaem.net/p/anh-gai-xinh-2.html',
        'https://www.anhvaem.net/p/anh-gai-xinh-2.html'
    ];



    const TOTAL_FILES = files.length;

    // Lấy URL trang hiện tại để kiểm tra active
    const currentUrl = window.location.href;
    
    // Tìm vị trí đường dẫn đang xem trong mảng
    const activeFileIndexInList = files.findIndex(link => currentUrl.includes(link) || link.includes(window.location.pathname));

    // Tính trang hiện tại
    let currentPage = 1;
    if (activeFileIndexInList !== -1) {
        currentPage = Math.floor(activeFileIndexInList / PER_PAGE) + 1;
    }

    function renderPage(page) {
        const container = document.getElementById('file-list');
        const paginationWrapper = document.getElementById('file-pagination');
        if (!container) return;

        if (TOTAL_FILES === 0) {
            container.innerHTML = '<p style="color:#888; width:100%; text-align:center; padding:20px;">Không có dữ liệu.</p>';
            if (paginationWrapper) paginationWrapper.innerHTML = '';
            return;
        }

        container.innerHTML = '';

        const start = (page - 1) * PER_PAGE;
        const end = Math.min(start + PER_PAGE, TOTAL_FILES);

        for (let i = start; i < end; i++) {
            const fileUrl = files[i];
            const isActive = (i === activeFileIndexInList) ? 'active' : '';
            
            // Tự động hiển thị tên dạng: Mục 1, Mục 2, Mục 3...
            const itemNumber = i + 1;

            container.innerHTML += `
                <div class="video-item">
                    <a href="${fileUrl}">
                        <div class="num-box ${isActive}">Mục ${itemNumber}</div>
                    </a>
                </div>
            `;
        }
        renderFilePagination(page, Math.ceil(TOTAL_FILES / PER_PAGE));
    }

    function renderFilePagination(current, total) {
        const paginationWrapper = document.getElementById('file-pagination');
        if (!paginationWrapper) return;
        
        if (total === 0) {
            paginationWrapper.innerHTML = '';
            return;
        }

        paginationWrapper.innerHTML = '';

        if (current > 1) paginationWrapper.appendChild(createBtn('‹ Prev', current - 1, 'prev-next'));

        let startPage = Math.max(1, current - 2);
        let endPage = Math.min(total, current + 2);

        if (current <= 3) endPage = Math.min(5, total);
        if (current >= total - 2) startPage = Math.max(1, total - 4);

        if (startPage > 1) {
            paginationWrapper.appendChild(createBtn('1', 1));
            if (startPage > 2) {
                const dots = document.createElement('span');
                dots.className = 'file-page-dots';
                dots.textContent = '...';
                paginationWrapper.appendChild(dots);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const btn = createBtn(i, i);
            if (i === current) btn.classList.add('active');
            paginationWrapper.appendChild(btn);
        }

        if (endPage < total) {
            if (endPage < total - 1) {
                const dots = document.createElement('span');
                dots.className = 'file-page-dots';
                dots.textContent = '...';
                paginationWrapper.appendChild(dots);
            }
            paginationWrapper.appendChild(createBtn(total, total));
        }

        if (current < total) paginationWrapper.appendChild(createBtn('Next ›', current + 1, 'prev-next'));

        const totalBox = document.createElement('span');
        totalBox.className = 'file-page-total-box';
        totalBox.textContent = `Trang ${current} / ${total}`;
        paginationWrapper.appendChild(totalBox);
    }

    function createBtn(text, targetPage, extraClass = '') {
        const btn = document.createElement('button');
        btn.className = `file-page-btn ${extraClass}`.trim();
        btn.textContent = text;
        btn.addEventListener('click', () => {
            currentPage = targetPage;
            renderPage(currentPage);
        });
        return btn;
    }

    renderPage(currentPage);
})();