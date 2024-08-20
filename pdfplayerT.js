document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const pdfUrl = urlParams.get('pdf');
    const initialPageNum = parseInt(localStorage.getItem('pageNum')) || 1;

    if (!pdfUrl) {
        alert('No PDF specified');
        return;
    }

    let pdfDoc = null,
        pageNum = initialPageNum,
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

    // Metronome functionality
    let interval;
    let isRunning = false;
    const bpmInput = document.getElementById('bpm');
    const startStopBtn = document.getElementById('startStopBtn');
    
    const metronome = document.querySelector('.metronome');
    let isDragging = false;
    let offsetX, offsetY;
    
    metronome.addEventListener('mousedown', function(e) {
        isDragging = true;
        offsetX = e.clientX - metronome.getBoundingClientRect().left;
        offsetY = e.clientY - metronome.getBoundingClientRect().top;
        document.body.style.userSelect = 'none'; // Prevent text selection during drag
    });
    
    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            metronome.style.left = `${e.clientX - offsetX}px`;
            metronome.style.top = `${e.clientY - offsetY}px`;
        }
    });
    
    document.addEventListener('mouseup', function() {
        isDragging = false;
        document.body.style.userSelect = ''; // Re-enable text selection after drag
    });
    
    startStopBtn.addEventListener('click', toggleMetronome);
    bpmInput.addEventListener('change', restartMetronome);
    bpmInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            restartMetronome();
        }
    });
    
    function toggleMetronome() {
        if (isRunning) {
            stopMetronome();
        } else {
            startMetronome();
        }
    }
    
    function startMetronome() {
        const bpm = parseInt(bpmInput.value, 10);
        const intervalTime = 60000 / bpm; // milliseconds per beat
        interval = setInterval(playClick, intervalTime);
        startStopBtn.textContent = 'Stop';
        isRunning = true;
    }
    
    function stopMetronome() {
        clearInterval(interval);
        startStopBtn.textContent = 'Start';
        isRunning = false;
    }
    
    function restartMetronome() {
        if (isRunning) {
            stopMetronome();
            startMetronome();
        }
    }
    
    function playClick() {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create an oscillator
        const oscillator = audioCtx.createOscillator();
        oscillator.type = 'square'; // Square wave for a wood-block like tone
        oscillator.frequency.setValueAtTime(222, audioCtx.currentTime); // Lower frequency for a deeper tone
        
        // Create a gain node for volume control
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime); // Start with a lower volume
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1); // Quick decay to mimic a wood block
        
        // Connect oscillator to gain node, then to the destination (speakers)
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        // Start and stop the oscillator
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1); // Sound duration
    }
    
    // Pitch Pipe functionality
    document.querySelectorAll('.pitch').forEach(button => {
        button.addEventListener('mousedown', function() {
            playTone(parseFloat(this.dataset.note));
        });
    
        button.addEventListener('mouseup', function() {
            stopTone();
        });
    });
    
    let audioContext;
    let oscillator;
    
    function playTone(frequency) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.connect(audioContext.destination);
        oscillator.start();
    }
    
    function stopTone() {
        if (oscillator) {
            oscillator.stop();
            oscillator.disconnect();
        }
        if (audioContext) {
            audioContext.close();
        }
    }
    
    // Drag functionality for pitch pipe
    const pitchPipe = document.querySelector('.container');
    let isDraggingPipe = false;
    let pipeOffsetX, pipeOffsetY;
    
    pitchPipe.addEventListener('mousedown', (e) => {
        isDraggingPipe = true;
        pipeOffsetX = e.clientX - pitchPipe.getBoundingClientRect().left;
        pipeOffsetY = e.clientY - pitchPipe.getBoundingClientRect().top;
        document.body.style.userSelect = 'none'; // Prevent text selection during drag
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isDraggingPipe) {
            pitchPipe.style.left = `${e.clientX - pipeOffsetX}px`;
            pitchPipe.style.top = `${e.clientY - pipeOffsetY}px`;
        }
    });
    
    document.addEventListener('mouseup', () => {
        isDraggingPipe = false;
        document.body.style.userSelect = ''; // Re-enable text selection after drag
    });
