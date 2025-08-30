    document.addEventListener('DOMContentLoaded', () => {
        // --- DOM Elements ---
        const appContainer = document.querySelector('.app-container');
        const welcomeScreen = document.getElementById('welcome-screen');
        const dropZone = document.getElementById('drop-zone');
        const imageLoader = document.getElementById('image-loader');
        const imageDisplay = document.getElementById('image-display');
        const canvas = document.getElementById('measurement-canvas'), ctx = canvas.getContext('2d');
        const rulerTop = document.getElementById('ruler-top'), ctxTop = rulerTop.getContext('2d');
        const rulerLeft = document.getElementById('ruler-left'), ctxLeft = rulerLeft.getContext('2d');
        const imageDimensionsP = document.getElementById('image-dimensions');
        const jsonOutput = document.getElementById('json-output');
        const jsonFormatSelect = document.getElementById('json-format-select');
        const framesList = document.getElementById('frames-list');
        const rowsInput = document.getElementById('rows-input'), colsInput = document.getElementById('cols-input');
        const cellWInput = document.getElementById('cell-w-input'), cellHInput = document.getElementById('cell-h-input');
        const generateGridButton = document.getElementById('generate-grid-button');
        const generateBySizeButton = document.getElementById('generate-by-size-button');
        const addHLineButton = document.getElementById('add-h-line'), addVLineButton = document.getElementById('add-v-line');
        const clearButton = document.getElementById('clear-button');
        const snapCheckbox = document.getElementById('snap-checkbox');
        const exportZipButton = document.getElementById('export-zip-button');
        const exportGifButton = document.getElementById('export-gif-button');
        const maxGifSizeInput = document.getElementById('max-gif-size');
        const previewCanvas = document.getElementById('preview-canvas'), previewCtx = previewCanvas.getContext('2d');
        const playPauseButton = document.getElementById('play-pause-button');
        const firstFrameButton = document.getElementById('first-frame-button');
        const lastFrameButton = document.getElementById('last-frame-button');
        const fpsSlider = document.getElementById('fps-slider'), fpsValue = document.getElementById('fps-value');
        const exportCodeButton = document.getElementById('export-code-button');
        const codePreviewContainer = document.getElementById('code-preview-container');
        const codeExportDetails = document.getElementById('code-export-details');
        const htmlCodeOutput = document.getElementById('html-code-output');
        const cssCodeOutput = document.getElementById('css-code-output');
        const htmlLineNumbers = document.getElementById('html-line-numbers');
        const cssLineNumbers = document.getElementById('css-line-numbers');
        const livePreviewIframe = document.getElementById('live-preview-iframe');
        const allControls = document.querySelectorAll('button, input, select');
        const toast = document.getElementById('toast');
        const undoButton = document.getElementById('undo-button');
        const redoButton = document.getElementById('redo-button');
        const clipsSelect = document.getElementById('clips-select');
        const newClipButton = document.getElementById('new-clip-button');
        const renameClipButton = document.getElementById('rename-clip-button');
        const deleteClipButton = document.getElementById('delete-clip-button');
        const selectAllFramesButton = document.getElementById('select-all-frames');
        const deselectAllFramesButton = document.getElementById('deselect-all-frames');
        const changeImageButton = document.getElementById('change-image-button');
        const projectHistoryList = document.getElementById('project-history-list');

        // --- App State ---
        let lines = [], frames = [], clips = [], activeClipId = null;
        let selectedLine = null, hoveredLine = null, hoveredFrame = null, isDragging = false;
        let currentFileName = "spritesheet.png";
        let animationState = { isPlaying: false, fps: 12, currentFrameIndex: 0, lastTime: 0, animationFrameId: null };
        const SNAP_VALUE = 10;
        let historyStack = [], historyIndex = -1;
        let isReloadingFromStorage = false;

        // --- History (Undo/Redo) ---
        const saveState = () => {
            historyStack = historyStack.slice(0, historyIndex + 1);
            historyStack.push(JSON.stringify({ lines, frames }));
            historyIndex++;
            updateHistoryButtons();
            saveCurrentSession();
        };

        const updateHistoryButtons = () => {
            undoButton.disabled = historyIndex <= 0;
            redoButton.disabled = historyIndex >= historyStack.length - 1;
        };

        const undo = () => {
            if (historyIndex > 0) {
                historyIndex--;
                loadState(historyStack[historyIndex]);
            }
        };

        const redo = () => {
            if (historyIndex < historyStack.length - 1) {
                historyIndex++;
                loadState(historyStack[historyIndex]);
            }
        };
        
        const loadState = (stateString) => {
            const state = JSON.parse(stateString);
            lines = state.lines;
            frames = state.frames;
            updateAll(false);
            updateHistoryButtons();
        };

        // --- Initialization ---
        const setControlsEnabled = (enabled) => {
            allControls.forEach(el => {
                if (el.id !== 'image-loader' && el.parentElement.id !== 'drop-zone') {
                    el.disabled = !enabled;
                }
            });
            if (!enabled) {
                codePreviewContainer.style.display = 'none';
            }
            updateHistoryButtons();
        };
        
        undoButton.addEventListener('click', undo);
        redoButton.addEventListener('click', redo);
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
            if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
        });

        // --- Image Loading & Drag-Drop ---
        window.addEventListener('dragover', e => e.preventDefault());
        window.addEventListener('drop', e => e.preventDefault());

        const handleFile = (file) => {
            if (!file || !file.type.startsWith('image/')) {
                showToast('Por favor, selecciona un archivo de imagen válido.', 'danger');
                return;
            }
            currentFileName = file.name;
            const reader = new FileReader();
            reader.onload = (event) => {
                imageDisplay.src = event.target.result;
                isReloadingFromStorage = false;
            };
            reader.readAsDataURL(file);
            imageDimensionsP.textContent = 'Cargando...';
        };

        imageLoader.addEventListener('change', (e) => handleFile(e.target.files[0]));
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            handleFile(e.dataTransfer.files[0]);
        });

        imageDisplay.onload = () => {
            welcomeScreen.style.opacity = '0';
            setTimeout(() => welcomeScreen.style.display = 'none', 300);
            appContainer.style.visibility = 'visible';
            document.body.classList.add('app-loaded');

            const imgWidth = imageDisplay.naturalWidth, imgHeight = imageDisplay.naturalHeight;
            canvas.width = rulerTop.width = imgWidth;
            canvas.height = rulerLeft.height = imgHeight;
            rulerTop.height = rulerLeft.width = 30;
            imageDimensionsP.innerHTML = `<strong>${currentFileName}:</strong> ${imgWidth}px &times; ${imgHeight}px`;
            
            if (!isReloadingFromStorage) {
                historyStack = [];
                historyIndex = -1;
                clearAll(true);
                addToHistory();
            } else {
                updateAll(false);
            }
            setControlsEnabled(true);
        };

        // --- Core Logic ---
        const updateAll = (shouldSaveState = true) => {
            calculateFrames();
            if (shouldSaveState) saveState();
            drawAll();
            updateUI();
            resetAnimation();
            codePreviewContainer.style.display = 'none';
        };

        const calculateFrames = () => {
            const oldFrames = new Map(frames.map(f => [f.id, f]));
            frames = [];
            const hPositions = [0, ...lines.filter(l => l.type === 'horizontal').map(l => l.position).sort((a,b)=>a-b), canvas.height];
            const vPositions = [0, ...lines.filter(l => l.type === 'vertical').map(l => l.position).sort((a,b)=>a-b), canvas.width];
            
            let frameId = 0;
            for (let i = 0; i < hPositions.length - 1; i++) {
                for (let j = 0; j < vPositions.length - 1; j++) {
                    const x = vPositions[j], y = hPositions[i];
                    const w = vPositions[j+1] - x, h = hPositions[i+1] - y;
                    if (w > 1 && h > 1) {
                        const id = frameId++;
                        const oldFrame = oldFrames.get(id);
                        frames.push({ 
                            id: id, 
                            name: oldFrame ? oldFrame.name : `frame_${id}`,
                            rect: { x:Math.round(x), y:Math.round(y), w:Math.round(w), h:Math.round(h) } 
                        });
                    }
                }
            }
            if (clips.length === 0 && frames.length > 0) {
                createNewClip("Default", frames.map(f => f.id));
            }
        };

        // --- UI Update ---
        const updateUI = () => {
            updateClipsSelect();
            updateFramesList();
            updateJsonOutput();
        };

        // --- Drawing ---
        const drawAll = (mousePos = null) => {
            ctx.clearRect(0,0,canvas.width,canvas.height);
            frames.forEach(f => {
                const {x,y,w,h} = f.rect;
                ctx.fillStyle = (hoveredFrame && hoveredFrame.id === f.id) ? 'rgba(158, 206, 255, 0.4)' : 'rgba(122, 162, 247, 0.15)';
                ctx.fillRect(x,y,w,h);
                ctx.strokeStyle='rgba(122, 162, 247, 0.5)'; ctx.strokeRect(x,y,w,h);
                ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.font='12px var(--font-sans)'; ctx.fillText(f.id, x+4, y+14);
            });
            lines.forEach(l => {
                ctx.beginPath();
                const isSel = selectedLine && selectedLine.id === l.id;
                const isHov = hoveredLine && hoveredLine.id === l.id;
                ctx.strokeStyle = isSel ? 'var(--danger)' : (isHov ? 'var(--warning)' : 'var(--primary)');
                ctx.lineWidth = isSel ? 3 : 2;
                if(l.type==='horizontal'){ ctx.moveTo(0,l.position); ctx.lineTo(canvas.width,l.position); }
                else { ctx.moveTo(l.position,0); ctx.lineTo(l.position,canvas.height); }
                ctx.stroke();
            });
            if (mousePos) {
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(mousePos.x + 10, mousePos.y + 10, 70, 20);
                ctx.fillStyle = 'white';
                ctx.font = '10px var(--font-sans)';
                ctx.fillText(`X:${Math.round(mousePos.x)}, Y:${Math.round(mousePos.y)}`, mousePos.x + 15, mousePos.y + 23);
            }
            drawRulers();
        };
        const drawRulers=()=>{ctxTop.clearRect(0,0,rulerTop.width,rulerTop.height);ctxLeft.clearRect(0,0,rulerLeft.width,rulerLeft.height);if(!imageDisplay.src||!imageDisplay.complete)return;ctxTop.font=ctxLeft.font='10px var(--font-sans)';ctxTop.fillStyle=ctxLeft.fillStyle='var(--text-secondary)';for(let x=0;x<canvas.width;x+=10){ctxTop.beginPath();ctxTop.moveTo(x,x%50===0?15:22);ctxTop.lineTo(x,30);ctxTop.stroke();if(x%50===0)ctxTop.fillText(x,x+2,12)}for(let y=0;y<canvas.height;y+=10){ctxLeft.beginPath();ctxLeft.moveTo(y%50===0?15:22,y);ctxLeft.lineTo(30,y);ctxLeft.stroke();if(y%50===0)ctxLeft.fillText(y,4,y-2)}};

        // --- Clip Management ---
        const getActiveClip = () => clips.find(c => c.id === activeClipId);

        const createNewClip = (name, initialFrameIds = null) => {
            const newName = name || prompt("Nombre del nuevo clip:", `Clip ${clips.length + 1}`);
            if (!newName) return;
            const frameIds = initialFrameIds !== null ? initialFrameIds : frames.map(f => f.id);
            const newClip = { id: Date.now(), name: newName, frameIds };
            clips.push(newClip);
            activeClipId = newClip.id;
            updateUI();
        };

        const renameActiveClip = () => {
            const clip = getActiveClip();
            if (!clip) return;
            const newName = prompt("Nuevo nombre para el clip:", clip.name);
            if (newName) {
                clip.name = newName;
                updateUI();
            }
        };

        const deleteActiveClip = () => {
            if (clips.length <= 1) {
                showToast("No puedes eliminar el último clip.", 'warning');
                return;
            }
            if (confirm(`¿Seguro que quieres eliminar el clip "${getActiveClip().name}"?`)) {
                clips = clips.filter(c => c.id !== activeClipId);
                activeClipId = clips[0]?.id || null;
                updateUI();
            }
        };

        const updateClipsSelect = () => {
            clipsSelect.innerHTML = '';
            clips.forEach(clip => {
                const option = document.createElement('option');
                option.value = clip.id;
                option.textContent = clip.name;
                if (clip.id === activeClipId) option.selected = true;
                clipsSelect.appendChild(option);
            });
        };

        newClipButton.addEventListener('click', () => createNewClip());
        renameClipButton.addEventListener('click', renameActiveClip);
        deleteClipButton.addEventListener('click', deleteActiveClip);
        clipsSelect.addEventListener('change', (e) => {
            activeClipId = parseInt(e.target.value);
            updateFramesList();
            resetAnimation();
        });

        // --- Frames List ---
        const updateFramesList = () => {
            framesList.innerHTML = '';
            const activeClip = getActiveClip();
            frames.forEach(f => {
                const li = document.createElement('li');
                li.dataset.frameId = f.id;
                const isChecked = activeClip?.frameIds.includes(f.id) ? 'checked' : '';
                li.innerHTML = `
                    <span class="drag-handle">☰</span>
                    <input type="checkbox" class="frame-checkbox" data-frame-id="${f.id}" ${isChecked}>
                    <span class="frame-info">F${f.id}: ${f.name}</span>
                    <input type="text" class="frame-name-input" value="${f.name}" data-frame-id="${f.id}">
                    <span class="frame-dims">${f.rect.w}x${f.rect.h}</span>
                `;
                li.addEventListener('mouseover', () => highlightFrame(f.id, true));
                li.addEventListener('mouseout', () => highlightFrame(f.id, false));
                framesList.appendChild(li);
            });
            new Sortable(framesList, {
                animation: 150, handle: '.drag-handle',
                onEnd: (evt) => {
                    const newOrder = Array.from(evt.to.children).map(li => parseInt(li.dataset.frameId));
                    frames.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
                    updateAll();
                }
            });
        };

        framesList.addEventListener('change', (e) => {
            if (e.target.classList.contains('frame-checkbox')) {
                const frameId = parseInt(e.target.dataset.frameId);
                const clip = getActiveClip();
                if (!clip) return;
                if (e.target.checked) {
                    if (!clip.frameIds.includes(frameId)) clip.frameIds.push(frameId);
                } else {
                    clip.frameIds = clip.frameIds.filter(id => id !== frameId);
                }
                resetAnimation();
            }
        });

        selectAllFramesButton.addEventListener('click', () => {
            const clip = getActiveClip();
            if (!clip) return;
            clip.frameIds = frames.map(f => f.id);
            updateFramesList();
            resetAnimation();
        });

        deselectAllFramesButton.addEventListener('click', () => {
            const clip = getActiveClip();
            if (!clip) return;
            clip.frameIds = [];
            updateFramesList();
            resetAnimation();
        });

        // --- Animation ---
        const getAnimationFrames = () => {
            const clip = getActiveClip();
            if (!clip) return [];
            return clip.frameIds.map(id => frames.find(f => f.id === id)).filter(Boolean);
        };
        
        const animationLoop = (timestamp) => {
            if (!animationState.isPlaying) return;
            const elapsed = timestamp - animationState.lastTime;
            const animFrames = getAnimationFrames();
            if (elapsed > 1000 / animationState.fps && animFrames.length > 0) {
                animationState.lastTime = timestamp;
                const frame = animFrames[animationState.currentFrameIndex];
                drawFrameInPreview(frame);
                animationState.currentFrameIndex = (animationState.currentFrameIndex + 1) % animFrames.length;
            }
            animationState.animationFrameId = requestAnimationFrame(animationLoop);
        };
        const toggleAnimation = () => {
            animationState.isPlaying = !animationState.isPlaying;
            const animFrames = getAnimationFrames();
            if (animationState.isPlaying && animFrames.length > 0) {
                playPauseButton.textContent = '⏸️';
                animationState.lastTime = performance.now();
                animationLoop(animationState.lastTime);
            } else {
                playPauseButton.textContent = '▶️';
                cancelAnimationFrame(animationState.animationFrameId);
            }
        };
        const resetAnimation = () => {
            if (animationState.isPlaying) toggleAnimation();
            animationState.currentFrameIndex = 0;
            previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            const animFrames = getAnimationFrames();
            if (animFrames.length > 0) drawFrameInPreview(animFrames[0]);
        };
        const drawFrameInPreview = (frame) => {
            if (!frame) {
                previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                return;
            }
            const { x, y, w, h } = frame.rect;
            const scale = Math.min(previewCanvas.width / w, previewCanvas.height / h);
            previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            previewCtx.drawImage(imageDisplay, x, y, w, h, (previewCanvas.width - w * scale)/2, (previewCanvas.height - h * scale)/2, w*scale, h*scale);
        };

        // --- Export & Utility ---
        const showToast = (message, type = 'success') => {
            toast.textContent = message;
            toast.style.backgroundColor = `var(--${type})`;
            toast.style.bottom = '20px';
            setTimeout(() => { toast.style.bottom = '-100px'; }, 2500);
        };

        const highlightSyntax = (str, lang) => {
            const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            str = escapeHtml(str);

            if (lang === 'json') {
                return str
                    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g, (match) => {
                        if (/:$/.test(match)) return `<span class="token-key">${match.slice(0, -1)}</span>:`;
                        return `<span class="token-string">${match}</span>`;
                    })
                    .replace(/\b(true|false|null)\b/g, '<span class="token-keyword">$&</span>')
                    .replace(/\b-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g, '<span class="token-number">$&</span>')
                    .replace(/[{}[\](),:]/g, '<span class="token-punctuation">$&</span>');
            }
            if (lang === 'html') {
                return str
                    .replace(/(&lt;\/?)([^&gt;\s]+)/g, `$1<span class="token-tag">$2</span>`)
                    .replace(/([a-z-]+)=(&quot;.*?&quot;)/g, `<span class="token-attr-name">$1</span>=<span class="token-attr-value">$2</span>`);
            }
            if (lang === 'css') {
                return str
                    .replace(/\/\*[\s\S]*?\*\//g, '<span class="token-comment">$&</span>')
                    .replace(/([a-zA-Z-]+)(?=:)/g, '<span class="token-property">$&</span>')
                    .replace(/(body|h1|@keyframes|\.stage|\.sprite-container|\.ground)/g, '<span class="token-selector">$&</span>');
            }
            return str;
        };

        const updateJsonOutput = () => {
            const format = jsonFormatSelect.value;
            let outputObject;
            const framesData = frames.map(f => ({ name: f.name, id: f.id, rect: f.rect }));
            const meta = {
                app: "Sprite Sheet Suite v3.9", image: currentFileName,
                size: { w: canvas.width, h: canvas.height },
                clips: clips.map(c => ({ name: c.name, frames: c.frameIds }))
            };

            switch(format) {
                case 'phaser3':
                    outputObject = { frames: framesData.reduce((acc, f) => { acc[f.name] = { frame: f.rect, spriteSourceSize: { x: 0, y: 0, ...f.rect }, sourceSize: f.rect }; return acc; }, {}), meta };
                    break;
                case 'godot':
                    outputObject = { frames: framesData.reduce((acc, f) => { acc[f.name] = { frame: f.rect, source_size: {w: f.rect.w, h: f.rect.h}, sprite_source_size: {x:0, y:0, ...f.rect} }; return acc; }, {}), meta };
                    break;
                default:
                    outputObject = { meta, frames: framesData };
                    break;
            }
            jsonOutput.innerHTML = highlightSyntax(JSON.stringify(outputObject, null, 2), 'json');
        };

        // --- Event Listeners ---
        function clearAll(isInitial = false) {
            lines = []; frames = []; clips = []; activeClipId = null;
            if (isInitial) {
                updateAll(true);
            } else {
                updateAll();
            }
        }
        clearButton.addEventListener('click', () => clearAll());
        
        const resetClipsAndSelectAll = () => {
            clips = [];
            activeClipId = null;
        };

        const handleGridGeneration = (newLines) => {
            resetClipsAndSelectAll();
            lines = newLines;
            updateAll();
        };

        generateGridButton.addEventListener('click',()=>{const r=parseInt(rowsInput.value),c=parseInt(colsInput.value);if(isNaN(r)||isNaN(c)||r<1||c<1)return;let newLines=[];const h=canvas.height/r,w=canvas.width/c;for(let i=1;i<r;i++)newLines.push({id:Date.now()+i,type:'horizontal',position:i*h});for(let i=1;i<c;i++)newLines.push({id:Date.now()+r+i,type:'vertical',position:i*w});handleGridGeneration(newLines)});
        generateBySizeButton.addEventListener('click',()=>{const w=parseInt(cellWInput.value),h=parseInt(cellHInput.value);if(isNaN(w)||isNaN(h)||w<1||h<1)return;let newLines=[];for(let y=h;y<canvas.height;y+=h)newLines.push({id:Date.now()+y,type:'horizontal',position:y});for(let x=w;x<canvas.width;x+=w)newLines.push({id:Date.now()+x+canvas.height,type:'vertical',position:x});handleGridGeneration(newLines)});
        
        playPauseButton.addEventListener('click', toggleAnimation);
        fpsSlider.addEventListener('input', (e) => { animationState.fps = parseInt(e.target.value); fpsValue.textContent = e.target.value; });
        firstFrameButton.addEventListener('click', () => { if (animationState.isPlaying) toggleAnimation(); animationState.currentFrameIndex = 0; drawFrameInPreview(getAnimationFrames()[0]); });
        lastFrameButton.addEventListener('click', () => { if (animationState.isPlaying) toggleAnimation(); const animFrames = getAnimationFrames(); animationState.currentFrameIndex = animFrames.length - 1; drawFrameInPreview(animFrames[animationState.currentFrameIndex]); });
        jsonFormatSelect.addEventListener('change', updateJsonOutput);
        
        const highlightFrame=(id,isHighlighted)=>{hoveredFrame=isHighlighted?frames.find(f=>f.id===id):null;const li=document.querySelector(`#frames-list li[data-frame-id="${id}"]`);if(li){li.classList.toggle('highlight',isHighlighted);if(isHighlighted)li.scrollIntoView({behavior:'smooth',block:'nearest'})}drawAll()};
        const getMousePos=(e)=>({x:(e.clientX-canvas.getBoundingClientRect().left)*(canvas.width/canvas.clientWidth),y:(e.clientY-canvas.getBoundingClientRect().top)*(canvas.height/canvas.clientHeight)});
        const getLineAtPos=(pos)=>lines.find(l=>(l.type==='horizontal'&&Math.abs(pos.y-l.position)<5)||(l.type==='vertical'&&Math.abs(pos.x-l.position)<5))||null;
        canvas.addEventListener('mousedown',(e)=>{if(imageDisplay.src){selectedLine=getLineAtPos(getMousePos(e));if(selectedLine)isDragging=true;drawAll()}});
        canvas.addEventListener('mouseup',()=>{if(isDragging){isDragging=false;selectedLine=null;updateAll()}});
        canvas.addEventListener('mouseleave',()=>{isDragging=false;selectedLine=null;hoveredLine=null;updateAll()});
        canvas.addEventListener('dblclick',(e)=>{const lineToDelete=getLineAtPos(getMousePos(e));if(lineToDelete&&!isDragging){lines=lines.filter(l=>l.id!==lineToDelete.id);updateAll()}});
        canvas.addEventListener('mousemove',(e)=>{const pos=getMousePos(e);if(isDragging&&selectedLine){if(selectedLine.type==='horizontal')selectedLine.position=snapCheckbox.checked?Math.round(pos.y/SNAP_VALUE)*SNAP_VALUE:pos.y;else selectedLine.position=snapCheckbox.checked?Math.round(pos.x/SNAP_VALUE)*SNAP_VALUE:pos.x}else{hoveredLine=getLineAtPos(pos);canvas.style.cursor=hoveredLine?(hoveredLine.type==='horizontal'?'row-resize':'col-resize'):'default';const frame=frames.find(f=>pos.x>=f.rect.x&&pos.x<=f.rect.x+f.rect.w&&pos.y>=f.rect.y&&pos.y<=f.rect.y+f.rect.h);if(frame&&(!hoveredFrame||hoveredFrame.id!==frame.id))highlightFrame(frame.id,true);else if(!frame&&hoveredFrame)highlightFrame(hoveredFrame.id,false)}drawAll(pos)});
        addHLineButton.addEventListener('click',()=>{if(imageDisplay.src){lines.push({id:Date.now(),type:'horizontal',position:canvas.height/2});updateAll()}});
        addVLineButton.addEventListener('click',()=>{if(imageDisplay.src){lines.push({id:Date.now(),type:'vertical',position:canvas.width/2});updateAll()}});
        
        document.body.addEventListener('click', (e) => {
            if (e.target.classList.contains('copy-button')) {
                const targetId = e.target.dataset.target;
                const pre = document.getElementById(targetId);
                navigator.clipboard.writeText(pre.textContent).then(() => showToast('¡Copiado al portapapeles!'));
            }
        });

        exportCodeButton.addEventListener('click', () => {
            const animFrames = getAnimationFrames();
            if (animFrames.length === 0) {
                showToast("Selecciona al menos un frame en el clip.", 'warning');
                return;
            }
            
            const { htmlCode, cssCode } = generateCssAnimationCode(animFrames);
            
            htmlCodeOutput.innerHTML = highlightSyntax(htmlCode, 'html');
            cssCodeOutput.innerHTML = highlightSyntax(cssCode, 'css');
            
            const generateLines = (count) => Array.from({length: count}, (_, i) => `<span>${i + 1}</span>`).join('');
            htmlLineNumbers.innerHTML = generateLines(htmlCode.split('\n').length);
            cssLineNumbers.innerHTML = generateLines(cssCode.split('\n').length);

            const syncScroll = (el1, el2) => {
                el1.addEventListener('scroll', () => el2.scrollTop = el1.scrollTop);
            };
            syncScroll(htmlCodeOutput.parentElement, htmlLineNumbers);
            syncScroll(cssCodeOutput.parentElement, cssLineNumbers);

            const iframeContent = `
                <!DOCTYPE html>
                <html><head><style>${cssCode}</style></head>
                <body>${htmlCode.match(/<body>([\s\S]*)<\/body>/)[1]}</body></html>`;
            livePreviewIframe.srcdoc = iframeContent;

            codePreviewContainer.style.display = 'grid';
            codeExportDetails.open = true;
        });
        
        function generateCssAnimationCode(animFrames) {
            const firstFrame = animFrames[0].rect;
            const frameCount = animFrames.length;
            const duration = ((1 / animationState.fps) * frameCount).toFixed(2);

            const maxWidth = Math.max(...animFrames.map(f => f.rect.w));
            const maxHeight = Math.max(...animFrames.map(f => f.rect.h));
            const scale = 2;
            const stagePadding = 80;
            const stageWidth = Math.round((maxWidth * scale) + stagePadding);
            const stageHeight = Math.round((maxHeight * scale) + stagePadding);

            const htmlCode = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Animación de Sprite</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Mi Animación</h1>
    <div class="stage">
        <div class="sprite-container"></div>
        <div class="ground"></div>
    </div>
</body>
</html>`;

            let keyframesSteps = animFrames.map((frame, index) => {
                const { x, y, w, h } = frame.rect;
                const percentage = (index / frameCount) * 100;
                return `    ${percentage.toFixed(2)}% { width: ${w}px; height: ${h}px; background-position: -${x}px -${y}px; }`;
            }).join('\n');
            keyframesSteps += `\n    100% { width: ${firstFrame.w}px; height: ${firstFrame.h}px; background-position: -${firstFrame.x}px -${firstFrame.y}px; }`;

            const cssCode = `/* Estilos generales para la página de demostración */
body {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    min-height: 100vh;
    background-color: #2c3e50;
    font-family: sans-serif;
    color: #ecf0f1;
    margin: 0;
}

/* El "escenario" donde ocurre la animación (tamaño dinámico) */
.stage {
    width: ${stageWidth}px;
    height: ${stageHeight}px;
    background-color: #1a252f;
    border: 2px solid #55687a;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    position: relative;
    overflow: hidden;
}

/* El contenedor del sprite con la animación */
.sprite-container {
    width: ${firstFrame.w}px;
    height: ${firstFrame.h}px;
    background-image: url('${currentFileName}');
    
    image-rendering: pixelated;
    image-rendering: crisp-edges;

    transform: scale(${scale});
    transform-origin: bottom center;

    animation: run-cycle ${duration}s steps(1, end) infinite;
}

/* Un suelo simple para dar contexto */
.ground {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 20px;
    background-color: #8c98a5;
    border-top: 3px solid #ffffff;
}

/* Definición de los pasos de la animación */
@keyframes run-cycle {
${keyframesSteps}
}`;
            return { htmlCode, cssCode };
        }
        exportGifButton.addEventListener('click', () => {
            const animFrames = getAnimationFrames();
            if (animFrames.length === 0) return showToast("No hay frames en este clip para exportar.", 'warning');
            showToast("Generando GIF, por favor espera...", 'primary');
            const gif = new GIF({ workers: 2, quality: 10, workerScript: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js' });
            const tempCanvas = document.createElement('canvas'), tempCtx = tempCanvas.getContext('2d');
            const maxSize = parseInt(maxGifSizeInput.value) || 128;
            animFrames.forEach(frame => {
                const { x, y, w, h } = frame.rect;
                let drawW = w, drawH = h;
                if (w > maxSize || h > maxSize) { if (w > h) { drawW = maxSize; drawH = (h / w) * maxSize; } else { drawH = maxSize; drawW = (w / h) * maxSize; } }
                tempCanvas.width = Math.round(drawW); tempCanvas.height = Math.round(drawH);
                tempCtx.drawImage(imageDisplay, x, y, w, h, 0, 0, tempCanvas.width, tempCanvas.height);
                gif.addFrame(tempCanvas, { copy: true, delay: 1000 / animationState.fps });
            });
            gif.on('finished', (blob) => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${currentFileName.split('.')[0]}_${getActiveClip().name}.gif`;
                link.click();
                URL.revokeObjectURL(link.href);
            });
            gif.render();
        });

        // --- Local Storage & History ---
        const saveCurrentSession = () => {
            if (!imageDisplay.src || imageDisplay.src.startsWith('http')) return;
            const state = {
                imageSrc: imageDisplay.src,
                fileName: currentFileName,
                lines,
                clips,
                activeClipId
            };
            localStorage.setItem('spriteSheetLastSession', JSON.stringify(state));
        };

        const loadLastSession = () => {
            const savedState = localStorage.getItem('spriteSheetLastSession');
            if (savedState) {
                const state = JSON.parse(savedState);
                isReloadingFromStorage = true;
                currentFileName = state.fileName;
                lines = state.lines;
                clips = state.clips;
                activeClipId = state.activeClipId;
                imageDisplay.src = state.imageSrc;
            }
        };

        const getHistory = () => JSON.parse(localStorage.getItem('spriteSheetHistory') || '[]');
        const saveHistory = (history) => localStorage.setItem('spriteSheetHistory', JSON.stringify(history));

        const addToHistory = async () => {
            const id = Date.now();
            const thumbCanvas = document.createElement('canvas');
            const thumbCtx = thumbCanvas.getContext('2d');
            const thumbSize = 40;
            thumbCanvas.width = thumbSize;
            thumbCanvas.height = thumbSize;
            thumbCtx.drawImage(imageDisplay, 0, 0, thumbSize, thumbSize);
            const thumbSrc = thumbCanvas.toDataURL();

            const historyEntry = { id, name: currentFileName, thumb: thumbSrc };
            let history = getHistory();
            history = history.filter(item => item.name !== currentFileName);
            history.unshift(historyEntry);
            if (history.length > 5) history.pop();
            saveHistory(history);

            const fullState = { imageSrc: imageDisplay.src, fileName: currentFileName, lines, clips, activeClipId };
            localStorage.setItem(`history_${id}`, JSON.stringify(fullState));
            updateHistoryPanel();
        };

        const updateHistoryPanel = () => {
            const history = getHistory();
            projectHistoryList.innerHTML = '';
            if (history.length === 0) {
                projectHistoryList.innerHTML = `<li style="cursor: default; justify-content: center;">No hay proyectos guardados.</li>`;
                return;
            }
            history.forEach(item => {
                const li = document.createElement('li');
                li.dataset.historyId = item.id;
                li.innerHTML = `
                    <img src="${item.thumb}" class="history-thumb" alt="thumbnail">
                    <span class="history-name">${item.name}</span>
                    <button class="delete-history-btn" title="Eliminar del historial">✖</button>
                `;
                projectHistoryList.appendChild(li);
            });
        };

        projectHistoryList.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (!li) return;
            const id = li.dataset.historyId;

            if (e.target.classList.contains('delete-history-btn')) {
                e.stopPropagation();
                let history = getHistory();
                history = history.filter(item => item.id != id);
                saveHistory(history);
                localStorage.removeItem(`history_${id}`);
                updateHistoryPanel();
                showToast('Proyecto eliminado del historial.', 'warning');
            } else {
                const savedState = localStorage.getItem(`history_${id}`);
                if (savedState) {
                    const state = JSON.parse(savedState);
                    isReloadingFromStorage = true;
                    currentFileName = state.fileName;
                    lines = state.lines;
                    clips = state.clips;
                    activeClipId = state.activeClipId;
                    imageDisplay.src = state.imageSrc;
                }
            }
        });

        changeImageButton.addEventListener('click', () => {
            appContainer.style.visibility = 'hidden';
            document.body.classList.remove('app-loaded');
            welcomeScreen.style.display = 'flex';
            setTimeout(() => welcomeScreen.style.opacity = '1', 10);
            imageLoader.value = '';
        });

        // Initial Load
        loadLastSession();
        updateHistoryPanel();
        setControlsEnabled(false);
    });
