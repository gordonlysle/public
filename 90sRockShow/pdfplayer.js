document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const pdfUrl = urlParams.get('pdf');

    if (!pdfUrl) {
        alert('No PDF specified');
        return;
    }

    let pdfDoc = null,
        pageNum = 1,
        pageIsRendering = false,
        pageNumIsPending = null;

    const canvas = document.getElementById('pdf-render'),
          ctx = canvas.getContext('2d');

    const renderPage = num => {
        pageIsRendering = true;

        pdfDoc.getPage(num).then(page => {
            const viewport = page.getViewport({ scale: 1 });
            const container = document.getElementById('pdf-container');
            const scale = Math.min(container.clientWidth / viewport.width, container.clientHeight / viewport.height);
            const scaledViewport = page.getViewport({ scale });

            canvas.height = scaledViewport.height;
            canvas.width = scaledViewport.width;

            const renderContext = {
                canvasContext: ctx,
                viewport: scaledViewport
            };

            page.render(renderContext).promise.then(() => {
                pageIsRendering = false;

                if (pageNumIsPending !== null) {
                    renderPage(pageNumIsPending);
                    pageNumIsPending = null;
                }
            });

            document.getElementById('page-num').textContent = num;
        });
    };

    const queueRenderPage = num => {
        if (pageIsRendering) {
            pageNumIsPending = num;
        } else {
            renderPage(num);
        }
    };

    const showPrevPage = () => {
        if (pageNum <= 1) {
            return;
        }
        pageNum--;
        queueRenderPage(pageNum);
    };

    const showNextPage = () => {
        if (pageNum >= pdfDoc.numPages) {
            return;
        }
        pageNum++;
        queueRenderPage(pageNum);
    };

    pdfjsLib.getDocument(pdfUrl).promise.then(pdfDoc_ => {
        pdfDoc = pdfDoc_;
        document.getElementById('page-count').textContent = pdfDoc.numPages;
        renderPage(pageNum);
    });

    document.getElementById('prev-page').addEventListener('click', showPrevPage);
    document.getElementById('next-page').addEventListener('click', showNextPage);

    // Touch event handlers
    let startX = 0, endX = 0;

    canvas.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    });

    canvas.addEventListener('touchmove', (e) => {
        endX = e.touches[0].clientX;
    });

    canvas.addEventListener('touchend', (e) => {
        const deltaX = endX - startX;
        if (Math.abs(deltaX) > 50) { // Detect swipe with a minimum threshold
            if (deltaX > 0) {
                showPrevPage(); // Swipe right, show previous page
            } else {
                showNextPage(); // Swipe left, show next page
            }
        }
    });
});
