
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
        console.log(`Starting to render page ${num}`);

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
                console.log(`Rendered page ${num}`);

                if (pageNumIsPending !== null) {
                    renderPage(pageNumIsPending);
                    pageNumIsPending = null;
                }
            }).catch(err => {
                console.error(`Error rendering page ${num}:`, err);
            });

            document.getElementById('page-num').textContent = num;
        }).catch(err => {
            console.error(`Error getting page ${num}:`, err);
        });
    };

    const queueRenderPage = num => {
        if (pageIsRendering) {
            pageNumIsPending = num;
            console.log(`Queueing page ${num} for rendering`);
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
        console.log(`Navigating to previous page: ${pageNum}`);
    };

    const showNextPage = () => {
        if (pageNum >= pdfDoc.numPages) {
            return;
        }
        pageNum++;
        queueRenderPage(pageNum);
        console.log(`Navigating to next page: ${pageNum}`);
    };

    pdfjsLib.getDocument(pdfUrl).promise.then(pdfDoc_ => {
        pdfDoc = pdfDoc_;
        document.getElementById('page-count').textContent = pdfDoc.numPages;
        console.log(`Loaded PDF with ${pdfDoc.numPages} pages`);
        renderPage(pageNum);
    }).catch(err => {
        console.error('Error loading PDF:', err);
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

    // Keyboard event handlers
    document.addEventListener('keydown', (e) => {
        console.log(`Key pressed: ${e.key}`);
        if (e.key === 'ArrowUp') {
            showPrevPage();
        } else if (e.key === 'ArrowDown') {
            showNextPage();
        }
    });
});
