const Editor = {
    canvas: null,
    ctx: null,
    container: null,
    session: null,
    viewport: { x: 0, y: 0, scale: 1 },
    tool: 'select',
    style: {
        stroke: '#ef4444',
        fill: 'transparent',
        strokeWidth: 4,
        textSize: 24,
        textWeight: 700,
        textFontFamily: 'Inter, sans-serif'
    },
    
    isDown: false,
    isPan: false,
    isResize: false,
    resizeHandle: null,
    resizeSession: null,
    activeShape: null,
    start: { x: 0, y: 0 },
    last: { x: 0, y: 0 },
    totalDragDist: 0,
    
    pendingAsset: null,
    loadedImages: new Map(),
    showLayersPanel: false,
    showHistoryPanel: false,
    editingText: null,
    textOverlay: null,
    
    history: [],
    historyIndex: -1,

    init() {
        this.style.stroke = Settings.get('defaultStrokeColor') || '#ef4444';
        this.style.strokeWidth = Settings.get('defaultStrokeWidth') || 4;
        
        const strokeColorInput = document.getElementById('strokeColor');
        if (strokeColorInput) strokeColorInput.value = this.style.stroke;
        const strokeSliderInput = document.getElementById('strokeSlider');
        if (strokeSliderInput) strokeSliderInput.value = this.style.strokeWidth;

        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.container = document.getElementById('canvas-container');
        this.textOverlay = document.getElementById('textEditOverlay');
        
        this.setupTools();
        
        window.addEventListener('resize', () => this.resize());
        
        this.container.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        window.addEventListener('pointermove', (e) => this.onPointerMove(e));
        window.addEventListener('pointerup', (e) => this.onPointerUp(e));
        window.addEventListener('pointercancel', (e) => this.onPointerUp(e));
        this.container.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        this.container.addEventListener('contextmenu', (e) => {
            if (Settings.get('rightClickPan')) e.preventDefault();
        });
        
        this.pointers = new Map();
        this.initialPinchDistance = 0;
        this.initialPinchScale = 1;

        window.addEventListener('keydown', (e) => this.onKey(e));
        
        this.textOverlay.addEventListener('input', () => this.onTextInput());
        this.textOverlay.addEventListener('blur', () => this.commitText());
        this.textOverlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.commitText();
            e.stopPropagation();
        });
        
        document.getElementById('strokeColor').addEventListener('change', (e) => {
            this.style.stroke = e.target.value;
            this.applyStyleToSelected('stroke', e.target.value);
            this.saveHistory('Change Stroke Color');
        });
        
        document.getElementById('fillColor').addEventListener('change', (e) => {
            this.style.fill = e.target.value;
            this.applyStyleToSelected('fill', e.target.value);
            this.saveHistory('Change Fill Color');
        });
        
        document.getElementById('strokeSlider').addEventListener('input', (e) => {
            this.style.strokeWidth = parseInt(e.target.value);
            this.applyStyleToSelected('strokeWidth', parseInt(e.target.value));
        });

        document.getElementById('strokeSlider').addEventListener('change', (e) => {
            this.saveHistory('Change Stroke Width');
        });

        const textSizeSlider = document.getElementById('textSizeSlider');
        const textSizeValue = document.getElementById('textSizeValue');
        if (textSizeSlider && textSizeValue) {
            textSizeSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                textSizeValue.textContent = val + 'px';
                this.style.textSize = val;
                this.applyTextStyleToSelected('fontSize', val);
            });
            textSizeSlider.addEventListener('change', () => this.saveHistory('Change Text Size'));
        }

        const textWeightSelect = document.getElementById('textWeightSelect');
        if (textWeightSelect) {
            textWeightSelect.addEventListener('change', (e) => {
                const weight = parseInt(e.target.value, 10);
                this.style.textWeight = weight;
                this.applyTextStyleToSelected('fontWeight', weight);
                this.saveHistory('Change Text Weight');
            });
        }

        const textFontSelect = document.getElementById('textFontSelect');
        if (textFontSelect) {
            textFontSelect.addEventListener('change', (e) => {
                this.style.textFontFamily = e.target.value;
                this.applyTextStyleToSelected('fontFamily', e.target.value);
                this.saveHistory('Change Text Font');
            });
        }

        const sizeSlider = document.getElementById('sizeSlider');
        const sizeValue = document.getElementById('sizeValue');
        if (sizeSlider && sizeValue) {
            sizeSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                sizeValue.textContent = val + 'px';
                this.applySizeToSelected(val);
            });
            sizeSlider.addEventListener('change', () => this.saveHistory('Change Object Size'));
        }

        this.syncInspectorState();
    },

    setupTools() {
        const toolGroup = document.getElementById('toolGroup');
        if (!toolGroup) return;
        toolGroup.innerHTML = '';

        const createQuickBtn = (id, icon, title, toolId, active = false) => {
            const btn = document.createElement('button');
            btn.className = 'tool-btn' + (active ? ' active' : '');
            btn.id = id;
            btn.dataset.tool = toolId;
            btn.type = 'button';
            btn.title = title;
            btn.innerHTML = `<span class="iconify" data-icon="${icon}"></span>`;
            btn.addEventListener('click', () => this.setTool(toolId));
            return btn;
        };

        const createMenu = (menuId, btnId, triggerIcon, title, items, categoryKey) => {
            const dropdown = document.createElement('div');
            dropdown.className = `dropdown tools-dropdown ${categoryKey || ''}`.trim();

            const trigger = document.createElement('button');
            trigger.className = 'tool-btn tools-menu-btn';
            trigger.id = btnId;
            trigger.type = 'button';
            trigger.title = title;
            trigger.innerHTML = `<span class="iconify" data-icon="${triggerIcon}"></span>`;

            const menu = document.createElement('div');
            menu.className = 'dropdown-menu tools-menu';
            menu.id = menuId;

            const heading = document.createElement('div');
            heading.className = 'tools-menu-heading';
            heading.textContent = title;
            menu.appendChild(heading);

            const grid = document.createElement('div');
            grid.className = 'tools-menu-items';

            items.forEach((tool) => {
                const item = document.createElement('button');
                item.className = 'btn btn-ghost tool-menu-item';
                item.id = 'tool-' + tool.id;
                item.dataset.tool = tool.id;
                item.type = 'button';
                item.title = tool.label;
                item.innerHTML = `<span class="iconify" data-icon="${tool.icon}"></span><span>${tool.label}</span>`;
                item.addEventListener('click', () => {
                    this.setTool(tool.id);
                    menu.classList.remove('active');
                });
                grid.appendChild(item);
            });

            menu.appendChild(grid);
            dropdown.appendChild(trigger);
            dropdown.appendChild(menu);
            return dropdown;
        };

        const quickTools = document.createElement('div');
        quickTools.className = 'tool-group tool-quick-row';
        // Select/Hand live in the main markup bar to avoid duplicate controls.
        quickTools.appendChild(createQuickBtn('tool-eraser', 'mdi:eraser-variant', 'Eraser', 'eraser'));

        const drawMenu = createMenu(
            'drawToolsMenu',
            'drawToolsBtn',
            'mdi:shape-outline',
            'Draw Tools',
            [
                { id: 'rect', label: 'Rectangle', icon: 'mdi:rectangle-outline' },
                { id: 'circle', label: 'Circle', icon: 'mdi:circle-outline' },
                { id: 'line', label: 'Line', icon: 'mdi:vector-line' },
                { id: 'arrow', label: 'Arrow', icon: 'mdi:arrow-top-right-thick' },
                { id: 'path', label: 'Pencil', icon: 'mdi:pencil-outline' }
            ],
            'draw'
        );

        const annotateMenu = createMenu(
            'annotateToolsMenu',
            'annotateToolsBtn',
            'mdi:format-textbox',
            'Annotate',
            [
                { id: 'point', label: 'Point', icon: 'mdi:map-marker-outline' },
                { id: 'text', label: 'Text', icon: 'mdi:format-text' }
            ],
            'annotate'
        );

        const assetMenu = createMenu(
            'assetToolsMenu',
            'assetToolsBtn',
            'mdi:folder-image',
            'Assets',
            [
                { id: 'image', label: 'Images', icon: 'mdi:image-outline' },
                { id: 'icon', label: 'Icons', icon: 'mdi:star-four-points-outline' },
                { id: 'emoji', label: 'Emojis', icon: 'mdi:emoticon-outline' }
            ],
            'assets'
        );

        toolGroup.appendChild(quickTools);
        toolGroup.appendChild(drawMenu);
        toolGroup.appendChild(annotateMenu);
        toolGroup.appendChild(assetMenu);
    },

    applyStyleToSelected(prop, value) {
        if (this.session) {
            this.session.shapes.filter(s => s.selected).forEach(s => s[prop] = value);
            this.draw();
            this.syncInspectorState();
        }
    },

    applyTextStyleToSelected(prop, value) {
        if (!this.session) return;
        this.session.shapes
            .filter(s => s.selected && s.type === 'text')
            .forEach(s => { s[prop] = value; });
        this.draw();
        this.syncInspectorState();
    },

    applySizeToSelected(value) {
        if (!this.session) return;
        this.session.shapes
            .filter(s => s.selected && ['icon', 'emoji', 'point'].includes(s.type))
            .forEach(s => { s.size = value; });
        this.draw();
        this.syncInspectorState();
    },

    getSelectedShapes() {
        return this.session ? this.session.shapes.filter(s => s.selected) : [];
    },

    getPrimarySelectedShape() {
        const selected = this.getSelectedShapes();
        return selected.length ? selected[selected.length - 1] : null;
    },

    getTextFont(shape, size = null) {
        const fontSize = size || shape.fontSize || this.style.textSize || 24;
        const fontWeight = shape.fontWeight || this.style.textWeight || 700;
        const fontFamily = shape.fontFamily || this.style.textFontFamily || 'Inter, sans-serif';
        const fontStyle = shape.fontStyle || 'normal';
        return `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    },

    syncInspectorState() {
        const primary = this.getPrimarySelectedShape();

        const strokeColor = document.getElementById('strokeColor');
        const fillColor = document.getElementById('fillColor');
        const strokeSlider = document.getElementById('strokeSlider');
        if (strokeColor) strokeColor.value = (primary && primary.stroke) || this.style.stroke || '#ef4444';
        if (fillColor) fillColor.value = (primary && primary.fill && primary.fill !== 'transparent') ? primary.fill : '#ffffff';
        if (strokeSlider) strokeSlider.value = (primary && primary.strokeWidth) || this.style.strokeWidth || 4;

        const textStyleControls = document.getElementById('textStyleControls');
        const textFaceControls = document.getElementById('textFaceControls');
        const textSizeSlider = document.getElementById('textSizeSlider');
        const textSizeValue = document.getElementById('textSizeValue');
        const textWeightSelect = document.getElementById('textWeightSelect');
        const textFontSelect = document.getElementById('textFontSelect');
        const hasTextSelection = !!(primary && primary.type === 'text');

        if (textStyleControls) textStyleControls.style.display = hasTextSelection ? 'block' : 'none';
        if (textFaceControls) textFaceControls.style.display = hasTextSelection ? 'block' : 'none';

        if (hasTextSelection) {
            const size = primary.fontSize || this.style.textSize || 24;
            const weight = String(primary.fontWeight || this.style.textWeight || 700);
            const family = primary.fontFamily || this.style.textFontFamily || 'Inter, sans-serif';
            if (textSizeSlider) textSizeSlider.value = size;
            if (textSizeValue) textSizeValue.textContent = size + 'px';
            if (textWeightSelect) textWeightSelect.value = weight;
            if (textFontSelect) textFontSelect.value = family;
        }

        const sizeControls = document.getElementById('sizeControls');
        const sizeSlider = document.getElementById('sizeSlider');
        const sizeValue = document.getElementById('sizeValue');
        const hasSizedSelection = !!(primary && ['icon', 'emoji', 'point'].includes(primary.type));
        if (sizeControls) sizeControls.style.display = hasSizedSelection ? 'block' : 'none';
        if (hasSizedSelection) {
            const size = primary.size || (primary.type === 'point' ? 30 : 48);
            if (sizeSlider) sizeSlider.value = size;
            if (sizeValue) sizeValue.textContent = size + 'px';
        }
    },

    load(session) {
        this.session = session;
        this.viewport = { ...session.viewport };
        
        document.getElementById('emptyState').classList.add('hidden');
        
        // Reset history
        this.history = [];
        this.historyIndex = -1;
        this.saveHistory('Open Capture');

        // Load stock images
        session.shapes.forEach(async (shape) => {
            if (shape.type === 'stockImage' && shape.imgSrc && !this.loadedImages.has(shape.id)) {
                try {
                    const img = await Utils.loadImage(shape.imgSrc);
                    this.loadedImages.set(shape.id, img);
                    this.draw();
                } catch (e) {
                    console.error('Failed to load shape image');
                }
            }
        });
        
        this.resize();
        this.fitToView();
        this.setTool('select');
        this.draw();
        this.updateLayers();
        Notes.render();
        this.syncInspectorState();
    },

    resize() {
        if (!this.container) return;
        this.canvas.width = this.container.offsetWidth;
        this.canvas.height = this.container.offsetHeight;
        this.draw();
    },

    fitToView() {
        if (!this.session) return;
        
        const padding = 40;
        const availW = this.canvas.width - padding * 2;
        const availH = this.canvas.height - padding * 2;
        
        const scale = Math.min(availW / this.session.width, availH / this.session.height);
        
        this.viewport.scale = scale;
        this.viewport.x = (this.canvas.width - this.session.width * scale) / 2;
        this.viewport.y = (this.canvas.height - this.session.height * scale) / 2;
        
        this.updateZoomDisplay();
        this.draw();
    },

    zoom(delta) {
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        const oldScale = this.viewport.scale;
        const newScale = Math.max(0.1, Math.min(10, oldScale + delta));
        this.viewport.x = cx - (cx - this.viewport.x) * (newScale / oldScale);
        this.viewport.y = cy - (cy - this.viewport.y) * (newScale / oldScale);
        this.viewport.scale = newScale;
        this.updateZoomDisplay();
        this.draw();
    },

    zoomAt(x, y, newScale) {
        newScale = Math.max(0.1, Math.min(10, newScale));
        const oldScale = this.viewport.scale;
        this.viewport.x = x - (x - this.viewport.x) * (newScale / oldScale);
        this.viewport.y = y - (y - this.viewport.y) * (newScale / oldScale);
        this.viewport.scale = newScale;
        this.updateZoomDisplay();
        this.draw();
    },

    updateZoomDisplay() {
        const zoom = Math.round(this.viewport.scale * 100) + '%';
        const elMob = document.getElementById('zoomLevel');
        if (elMob) elMob.textContent = zoom;
        const elDesk = document.getElementById('zoomLevelDesk');
        if (elDesk) elDesk.textContent = zoom;
    },

    saveHistory(description = 'Action') {
        if (!this.session) return;
        const state = JSON.stringify(this.session.shapes);
        
        // If state hasn't changed from last history point, don't save
        if (this.historyIndex >= 0 && this.history[this.historyIndex].state === state) return;

        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        this.history.push({
            state: state,
            description: description,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });
        
        this.historyIndex++;
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
        
        this.updateHistoryUI();
    },

    undo() {
        if (this.historyIndex > 0) {
            this.gotoHistoryStep(this.historyIndex - 1);
        }
    },

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.gotoHistoryStep(this.historyIndex + 1);
        }
    },

    gotoHistoryStep(index) {
        if (index < 0 || index >= this.history.length) return;
        this.historyIndex = index;
        this.session.shapes = JSON.parse(this.history[this.historyIndex].state);
        this.draw();
        this.updateLayers();
        this.updateHistoryUI();
        Notes.render();
    },

    toggleHistory() {
        this.showHistoryPanel = !this.showHistoryPanel;
        document.getElementById('historyPanel').classList.toggle('open', this.showHistoryPanel);
        if (this.showHistoryPanel) this.updateHistoryUI();
    },

    updateHistoryUI() {
        const list = document.getElementById('historyList');
        if (!list) return;
        
        document.getElementById('historyStepCount').textContent = this.history.length;
        list.innerHTML = '';
        
        this.history.forEach((step, i) => {
            const el = document.createElement('div');
            el.className = 'history-item';
            if (i === this.historyIndex) el.classList.add('active');
            if (i > this.historyIndex) el.classList.add('future');
            
            el.innerHTML = `
                <span>${step.description}</span>
                <span class="history-time">${step.time}</span>
            `;
            
            el.onclick = () => this.gotoHistoryStep(i);
            list.appendChild(el);
            
            if (i === this.historyIndex) {
                setTimeout(() => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 10);
            }
        });
    },

    toWorld(x, y) {
        return {
            x: (x - this.viewport.x) / this.viewport.scale,
            y: (y - this.viewport.y) / this.viewport.scale
        };
    },
    
    toScreen(x, y) {
        return {
            x: x * this.viewport.scale + this.viewport.x,
            y: y * this.viewport.scale + this.viewport.y
        };
    },

    getShapeBounds(shape) {
        if (shape.type === 'emoji' || shape.type === 'icon' || shape.type === 'point') {
            const size = shape.size || (shape.type === 'point' ? 30 : 48);
            return { x: shape.x, y: shape.y, w: size, h: size };
        } else if (shape.type === 'path') {
            if (!shape.points || shape.points.length === 0) return { x: shape.x, y: shape.y, w: 10, h: 10 };
            const xs = shape.points.map(p => p.x);
            const ys = shape.points.map(p => p.y);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
        } else if (['arrow', 'line'].includes(shape.type)) {
            const x = Math.min(shape.x, shape.x2);
            const y = Math.min(shape.y, shape.y2);
            const w = Math.abs(shape.x2 - shape.x) || 10;
            const h = Math.abs(shape.y2 - shape.y) || 10;
            return { x, y, w, h };
        } else if (shape.type === 'text') {
            const fontSize = shape.fontSize || this.style.textSize || 24;
            this.ctx.font = this.getTextFont(shape, fontSize);
            const width = shape.w || 200;
            const words = (shape.text || 'Text').split(' ');
            let line = '';
            let lineCount = 1;
            for (let n = 0; n < words.length; n++) {
                let testLine = line + words[n] + ' ';
                if (this.ctx.measureText(testLine).width > width && n > 0) {
                    line = words[n] + ' ';
                    lineCount++;
                } else {
                    line = testLine;
                }
            }
            return { x: shape.x, y: shape.y, w: width, h: lineCount * fontSize * 1.2 };
        } else {
            let x = shape.x, y = shape.y, w = shape.w || 48, h = shape.h || 48;
            if (w < 0) { x += w; w = -w; }
            if (h < 0) { y += h; h = -h; }
            return { x, y, w, h };
        }
    },

    getResizeHandle(shape, wx, wy) {
        const isMob = /Android|iPhone|iPad/i.test(navigator.userAgent);
        const handleSize = (isMob ? 30 : 12) / this.viewport.scale;

        const bounds = this.getShapeBounds(shape);
        const padding = 8 / this.viewport.scale;
        
        const handles = [
            { id: 'nw', x: bounds.x - padding, y: bounds.y - padding },
            { id: 'ne', x: bounds.x + bounds.w + padding, y: bounds.y - padding },
            { id: 'sw', x: bounds.x - padding, y: bounds.y + bounds.h + padding },
            { id: 'se', x: bounds.x + bounds.w + padding, y: bounds.y + bounds.h + padding }
        ];
        
        for (const handle of handles) {
            if (Math.abs(wx - handle.x) < handleSize && Math.abs(wy - handle.y) < handleSize) {
                return handle.id;
            }
        }
        return null;
    },

    getHandleCorner(bounds, handle) {
        const x1 = bounds.x;
        const y1 = bounds.y;
        const x2 = bounds.x + bounds.w;
        const y2 = bounds.y + bounds.h;

        if (handle === 'nw') return { x: x1, y: y1 };
        if (handle === 'ne') return { x: x2, y: y1 };
        if (handle === 'sw') return { x: x1, y: y2 };
        return { x: x2, y: y2 };
    },

    getOppositeHandle(handle) {
        if (handle === 'nw') return 'se';
        if (handle === 'ne') return 'sw';
        if (handle === 'sw') return 'ne';
        return 'nw';
    },

    getResizedBoundsFromHandle(bounds, handle, wx, wy, keepSquare = false, minW = 10, minH = 10) {
        const anchor = this.getHandleCorner(bounds, this.getOppositeHandle(handle));
        let draggedX = wx;
        let draggedY = wy;

        if (keepSquare) {
            const dx = draggedX - anchor.x;
            const dy = draggedY - anchor.y;
            const base = Math.max(minW, minH);
            const side = Math.max(base, Math.max(Math.abs(dx), Math.abs(dy)));
            const sx = dx === 0 ? 1 : Math.sign(dx);
            const sy = dy === 0 ? 1 : Math.sign(dy);
            draggedX = anchor.x + sx * side;
            draggedY = anchor.y + sy * side;
        }

        let left = Math.min(anchor.x, draggedX);
        let top = Math.min(anchor.y, draggedY);
        let width = Math.abs(draggedX - anchor.x);
        let height = Math.abs(draggedY - anchor.y);

        if (width < minW) {
            width = minW;
            left = draggedX >= anchor.x ? anchor.x : anchor.x - width;
        }
        if (height < minH) {
            height = minH;
            top = draggedY >= anchor.y ? anchor.y : anchor.y - height;
        }

        return { x: left, y: top, w: width, h: height };
    },

    getLineEndpointRole(shape, bounds, handle) {
        const handleCorner = this.getHandleCorner(bounds, handle);
        const dStart = Math.hypot(shape.x - handleCorner.x, shape.y - handleCorner.y);
        const dEnd = Math.hypot(shape.x2 - handleCorner.x, shape.y2 - handleCorner.y);
        return dStart <= dEnd ? 'start' : 'end';
    },

    applyResize(wx, wy, keepAspect = false) {
        if (!this.isResize || !this.activeShape || !this.resizeSession) return;

        const shape = this.activeShape;
        const originalShape = this.resizeSession.originalShape;
        const originalBounds = this.resizeSession.originalBounds;
        const handle = this.resizeSession.handle;

        if (shape.type === 'line' || shape.type === 'arrow') {
            const draggedRole = this.resizeSession.draggedEndpoint;
            if (draggedRole === 'start') {
                shape.x = wx;
                shape.y = wy;
                shape.x2 = originalShape.x2;
                shape.y2 = originalShape.y2;
            } else {
                shape.x = originalShape.x;
                shape.y = originalShape.y;
                shape.x2 = wx;
                shape.y2 = wy;
            }
            return;
        }

        const isSquareShape = ['emoji', 'icon', 'point'].includes(shape.type);
        const keepSquare = isSquareShape || keepAspect;
        const minW = isSquareShape ? 16 : 10;
        const minH = isSquareShape ? 16 : 10;
        const newBounds = this.getResizedBoundsFromHandle(originalBounds, handle, wx, wy, keepSquare, minW, minH);

        if (shape.type === 'path') {
            const srcW = Math.max(1, originalBounds.w);
            const srcH = Math.max(1, originalBounds.h);
            const scaleX = newBounds.w / srcW;
            const scaleY = newBounds.h / srcH;
            shape.points = originalShape.points.map(p => ({
                x: newBounds.x + (p.x - originalBounds.x) * scaleX,
                y: newBounds.y + (p.y - originalBounds.y) * scaleY
            }));
            return;
        }

        if (shape.type === 'text') {
            shape.x = newBounds.x;
            shape.y = newBounds.y;
            shape.w = Math.max(50, newBounds.w);
            return;
        }

        if (isSquareShape) {
            shape.x = newBounds.x;
            shape.y = newBounds.y;
            shape.size = Math.max(16, newBounds.w);
            return;
        }

        shape.x = newBounds.x;
        shape.y = newBounds.y;
        shape.w = newBounds.w;
        shape.h = newBounds.h;
    },

    onPointerDown(e) {
        if (!this.session) return;
        if (e.target === this.textOverlay) return;
        this.pointers.set(e.pointerId, e);
        
        if (this.pointers.size >= 2) {
            this.isDown = false;
            this.activeShape = null;
            if (this.pointers.size === 2) {
                const p = Array.from(this.pointers.values());
                this.initialPinchDistance = Math.hypot(p[0].clientX - p[1].clientX, p[0].clientY - p[1].clientY);
                this.initialPinchScale = this.viewport.scale;
                this.lastPinchMidpoint = {
                    x: (p[0].clientX + p[1].clientX) / 2,
                    y: (p[0].clientY + p[1].clientY) / 2
                };
            }
            return;
        }

        if (this.editingText) this.commitText();
        
        const rect = this.container.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const w = this.toWorld(mx, my);
        
        this.isDown = true;
        this.start = { x: mx, y: my };
        this.last = { x: mx, y: my };
        this.totalDragDist = 0;
        
        const isRightClick = e.button === 2;
        const isMiddleClick = e.button === 1;
        const canRightClickPan = Settings.get('rightClickPan');

        if (this.tool === 'hand' || isMiddleClick || (isRightClick && canRightClickPan)) {
            this.isPan = true;
            this.container.classList.add('pan-mode');
            return; // Don't proceed to tool logic if explicitly panning
        }
        
        if (this.tool === 'eraser') {
            const hit = this.hitTestAll(w.x, w.y);
            if (hit) {
                this.session.shapes = this.session.shapes.filter(s => s.id !== hit.id);
                this.saveHistory('Erase Object');
                this.draw();
                this.updateLayers();
            }
            return;
        }

        if (this.tool === 'select') {
            const selectedShapes = this.session.shapes.filter(s => s.selected);
            for (const shape of selectedShapes) {
                const handle = this.getResizeHandle(shape, w.x, w.y);
                if (handle) {
                    this.isResize = true;
                    this.resizeHandle = handle;
                    this.activeShape = shape;
                    this.resizeSession = {
                        handle,
                        originalBounds: this.getShapeBounds(shape),
                        originalShape: JSON.parse(JSON.stringify(shape)),
                        draggedEndpoint: (shape.type === 'line' || shape.type === 'arrow')
                            ? this.getLineEndpointRole(shape, this.getShapeBounds(shape), handle)
                            : null
                    };
                    this.isPan = false;
                    return;
                }
            }
            
            const hit = this.hitTestAll(w.x, w.y);
            if (!e.shiftKey) this.session.shapes.forEach(s => s.selected = false);
            if (hit) {
                this.isPan = false;
                hit.selected = true;
                this.activeShape = hit;

                if (hit.type === 'text' && e.detail === 2) {
                    this.startTextEdit(hit);
                    return;
                }
            } else if (e.pointerType === 'touch') {
                // If we missed everything with touch on select tool, default to pan
                this.isPan = true;
                this.container.classList.add('pan-mode');
            }
        } else if (this.tool === 'point') {
            this.isPan = false;
            this.session.shapes.forEach(s => s.selected = false);
            
            const pointCount = this.session.shapes.filter(s => s.type === 'point').length;
            const defaultSize = 30;
            
            const shape = {
                id: Utils.uid(),
                type: 'point',
                x: w.x - defaultSize / 2,
                y: w.y - defaultSize / 2,
                size: defaultSize,
                stroke: this.style.stroke,
                order: pointCount + 1,
                note: '',
                selected: true
            };
            this.session.shapes.push(shape);
            this.activeShape = shape;
            Notes.toggle(true);
            Notes.render();
        } else if (this.tool === 'path') {
            this.isPan = false;
            // Check if we should continue existing path or start new
            const selectedPath = this.session.shapes.find(s => s.type === 'path' && s.selected);
            if (selectedPath) {
                selectedPath.points.push({ x: w.x, y: w.y });
                this.activeShape = selectedPath;
            } else {
                this.session.shapes.forEach(s => s.selected = false);
                const shape = {
                    id: Utils.uid(),
                    type: 'path',
                    points: [{ x: w.x, y: w.y }, { x: w.x, y: w.y }],
                    stroke: this.style.stroke,
                    strokeWidth: parseInt(this.style.strokeWidth),
                    selected: true
                };
                this.session.shapes.push(shape);
                this.activeShape = shape;
            }
        } else if (this.tool === 'image' && this.pendingAsset) {
            this.isPan = false;
            this.session.shapes.forEach(s => s.selected = false);
            
            if (this.pendingAsset.type === 'icon') {
                const icon = this.pendingAsset.data;
                const shape = {
                    id: Utils.uid(),
                    type: 'icon',
                    iconData: icon,
                    x: w.x - 24,
                    y: w.y - 24,
                    size: 48,
                    stroke: this.style.stroke,
                    selected: true
                };
                this.session.shapes.push(shape);
            } else if (this.pendingAsset.type === 'emoji') {
                const shape = {
                    id: Utils.uid(),
                    type: 'emoji',
                    emoji: this.pendingAsset.data,
                    x: w.x - 24,
                    y: w.y - 24,
                    size: 48,
                    selected: true
                };
                this.session.shapes.push(shape);
            }
            
            this.pendingAsset = null;
            Icons.selected = null;
            Icons.render();
            Emojis.selected = null;
            Emojis.render();
            this.setTool('select');
        } else if (this.tool === 'text') {
            this.isPan = false;
            this.session.shapes.forEach(s => s.selected = false);
            const shape = {
                id: Utils.uid(),
                type: 'text',
                x: w.x,
                y: w.y,
                w: 200,
                text: '',
                stroke: this.style.stroke,
                fontSize: 24,
                selected: true
            };
            this.session.shapes.push(shape);
            this.startTextEdit(shape);
        } else {
            this.isPan = false;
            this.session.shapes.forEach(s => s.selected = false);
            const shape = {
                id: Utils.uid(),
                type: this.tool,
                x: w.x,
                y: w.y,
                w: 0,
                h: 0,
                x2: w.x,
                y2: w.y,
                stroke: this.style.stroke,
                fill: this.style.fill,
                strokeWidth: parseInt(this.style.strokeWidth),
                selected: true
            };
            this.session.shapes.push(shape);
            this.activeShape = shape;
        }
        
        this.draw();
        this.updateLayers();
    },
    
    startTextEdit(shape) {
        this.editingText = shape;
        
        const screenPos = this.toScreen(shape.x, shape.y);
        const fontSize = (shape.fontSize || 24) * this.viewport.scale;
        
        this.textOverlay.style.display = 'block';
        this.textOverlay.style.left = screenPos.x + 'px';
        this.textOverlay.style.top = screenPos.y + 'px';
        this.textOverlay.style.fontSize = fontSize + 'px';
        this.textOverlay.style.color = shape.stroke || '#ef4444';
        this.textOverlay.style.fontFamily = shape.fontFamily || this.style.textFontFamily || 'Inter, sans-serif';
        this.textOverlay.style.fontWeight = String(shape.fontWeight || this.style.textWeight || 700);
        this.textOverlay.value = shape.text || '';
        
        setTimeout(() => {
            this.textOverlay.focus();
            this.textOverlay.select();
        }, 10);
        
        this.draw();
    },
    
    onTextInput() {
        if (!this.editingText) return;
        this.editingText.text = this.textOverlay.value;
        this.textOverlay.style.height = 'auto';
        this.textOverlay.style.height = this.textOverlay.scrollHeight + 'px';
    },
    
    commitText() {
        if (!this.editingText) return;
        
        const text = this.textOverlay.value.trim();
        if (!text) {
            this.session.shapes = this.session.shapes.filter(s => s.id !== this.editingText.id);
        } else {
            this.editingText.text = text;
        }
        
        this.textOverlay.style.display = 'none';
        this.textOverlay.value = '';
        this.editingText = null;
        
        this.saveHistory();
        this.setTool('select');
        this.draw();
        this.updateLayers();
        this.syncInspectorState();
    },

    onPointerMove(e) {
        if (!this.session) return;
        this.pointers.set(e.pointerId, e);

        if (this.pointers.size === 2) {
            const p = Array.from(this.pointers.values());
            const dist = Math.hypot(p[0].clientX - p[1].clientX, p[0].clientY - p[1].clientY);
            const midX = (p[0].clientX + p[1].clientX) / 2;
            const midY = (p[0].clientY + p[1].clientY) / 2;
            
            // Pan with midpoint
            if (this.lastPinchMidpoint) {
                this.viewport.x += midX - this.lastPinchMidpoint.x;
                this.viewport.y += midY - this.lastPinchMidpoint.y;
            }
            this.lastPinchMidpoint = { x: midX, y: midY };

            // Zoom
            const sensitivity = Settings.get('pinchSensitivity') || 1.0;
            const delta = 1 + (dist / this.initialPinchDistance - 1) * sensitivity;
            const rect = this.container.getBoundingClientRect();
            
            this.zoomAt(midX - rect.left, midY - rect.top, delta * this.initialPinchScale);
            return;
        }
        
        const rect = this.container.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const w = this.toWorld(mx, my);

        if (this.tool === 'image' && this.pendingAsset) {
            this.last = { x: mx, y: my };
            this.draw();
        }
        
        if (!this.isDown && this.tool === 'select') {
            // Cursor logic...
            const selectedShapes = this.session.shapes.filter(s => s.selected);
            let cursorSet = false;
            for (const shape of selectedShapes) {
                const handle = this.getResizeHandle(shape, w.x, w.y);
                if (handle) {
                    this.container.classList.remove('resize-nw', 'resize-ne', 'resize-sw', 'resize-se');
                    this.container.classList.add('resize-' + handle);
                    cursorSet = true;
                    break;
                }
            }
            if (!cursorSet) {
                this.container.classList.remove('resize-nw', 'resize-ne', 'resize-sw', 'resize-se');
            }
        }
        
        if (!this.isDown) return;
        
        const dx = mx - this.last.x;
        const dy = my - this.last.y;
        this.last = { x: mx, y: my };
        this.totalDragDist += Math.hypot(dx, dy);
        
        const wDx = dx / this.viewport.scale;
        const wDy = dy / this.viewport.scale;
        
        if (this.isDown && this.tool === 'eraser') {
            const hit = this.hitTestAll(w.x, w.y);
            if (hit) {
                this.session.shapes = this.session.shapes.filter(s => s.id !== hit.id);
                this.draw();
                this.updateLayers();
            }
            return;
        }

        if (this.isPan) {
            this.viewport.x += dx;
            this.viewport.y += dy;
        } else if (this.isResize && this.activeShape && this.resizeSession) {
            this.applyResize(w.x, w.y, e.shiftKey);
        } else if (this.activeShape) {
            if (this.tool === 'select') {
                this.session.shapes.filter(s => s.selected).forEach(s => {
                    s.x += wDx;
                    s.y += wDy;
                    if (s.x2 !== undefined) s.x2 += wDx;
                    if (s.y2 !== undefined) s.y2 += wDy;
                    if (s.points) {
                        s.points.forEach(p => { p.x += wDx; p.y += wDy; });
                    }
                });
            } else if (this.tool === 'path' && this.activeShape) {
                const pts = this.activeShape.points;
                const lastPt = pts[pts.length - 1];
                // Only add point if it's far enough from the last one (e.g., 10px in world space)
                if (Math.hypot(w.x - lastPt.x, w.y - lastPt.y) > 10 / this.viewport.scale) {
                    pts.push({ x: w.x, y: w.y });
                }
            } else if (['rect', 'circle'].includes(this.tool)) {
                this.activeShape.w = w.x - this.activeShape.x;
                this.activeShape.h = w.y - this.activeShape.y;
            } else if (['arrow', 'line'].includes(this.tool)) {
                this.activeShape.x2 = w.x;
                this.activeShape.y2 = w.y;
            }
        }
        
        this.draw();
    },

    async onPointerUp(e) {
        this.pointers.delete(e.pointerId);
        if (this.pointers.size < 2) {
            this.initialPinchDistance = 0;
            this.lastPinchMidpoint = null;
        }

        if (!this.isDown && this.pointers.size === 0) {
            this.container.classList.remove('pan-mode', 'resize-nw', 'resize-ne', 'resize-sw', 'resize-se');
            return;
        }
        
        if (!this.isDown) return;

        const resizedShape = this.isResize ? this.activeShape : null;
        const movedShape = (!this.isResize && this.isDown && this.tool === 'select') ? this.activeShape : null;
        const wasDrawing = !!this.activeShape && this.tool !== 'select';
        const wasModifying = this.isResize || (!!movedShape);

        this.isDown = false;
        this.isPan = false;
        this.isResize = false;
        this.resizeHandle = null;
        this.resizeSession = null;
        this.activeShape = null;
        this.container.classList.remove('pan-mode', 'resize-nw', 'resize-ne', 'resize-sw', 'resize-se');
        
        if (wasDrawing || wasModifying) {
            let desc = 'Action';
            if (wasDrawing) desc = `Draw ${this.tool}`;
            else if (resizedShape) desc = `Resize ${resizedShape.type || 'Shape'}`;
            else if (movedShape) desc = `Move ${movedShape.type || 'Shape'}`;
            this.saveHistory(desc);
        }

        if (this.session) {
            const stored = Library.captures.find(c => c.id === this.session.id);
            if (stored) {
                stored.shapes = [...this.session.shapes];
                stored.viewport = { ...this.viewport };
                
                // Update thumbnail
                const thumbData = await this.generateThumbnail();
                if (thumbData) stored.thumbData = thumbData;
                
                await DB.save(DB.STORES.CAPTURES, stored);
            }
        }
        
        this.updateLayers();
        Library.render();
        if (wasDrawing && this.tool === 'point') Notes.render();
        this.syncInspectorState();
        
        // Open note panel if it was a tap on a point
        if (this.tool === 'select' && this.totalDragDist < 5) {
            const rect = this.container.getBoundingClientRect();
            const w = this.toWorld(e.clientX - rect.left, e.clientY - rect.top);
            const hit = this.hitTestAll(w.x, w.y);
            if (hit && hit.type === 'point') {
                Notes.toggle(true);
                Notes.render();
            }
        }

        if (wasDrawing && Settings.get('defaultToSelect')) {
            this.setTool('select');
        }
    },

    onWheel(e) {
        e.preventDefault();
        const rect = this.container.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        
        const sensitivity = Settings.get('pinchSensitivity') || 1.0;
        const step = 0.1 * sensitivity;
        const factor = e.deltaY > 0 ? (1 - step) : (1 + step);
        
        const oldScale = this.viewport.scale;
        const newScale = Math.max(0.1, Math.min(10, oldScale * factor));
        this.viewport.x = mx - (mx - this.viewport.x) * (newScale / oldScale);
        this.viewport.y = my - (my - this.viewport.y) * (newScale / oldScale);
        this.viewport.scale = newScale;
        this.updateZoomDisplay();
        this.draw();
    },

    onKey(e) {
        if (App.mode !== 'markup') return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        const key = e.key.toLowerCase();
        
        if (key === 'v') this.setTool('select');
        if (key === 'h') this.setTool('hand');
        if (key === 'm') this.setTool('point');
        if (key === 'r') this.setTool('rect');
        if (key === 'c') this.setTool('circle');
        if (key === 'a') this.setTool('arrow');
        if (key === 'l') this.setTool('line');
        if (key === 't') this.setTool('text');
        if (key === 'i') this.setTool('image');
        
        if ((e.ctrlKey || e.metaKey) && key === 'z') {
            e.preventDefault();
            this.undo();
        }
        if ((e.ctrlKey || e.metaKey) && (key === 'y' || (e.shiftKey && key === 'z'))) {
            e.preventDefault();
            this.redo();
        }

        if (key === 'delete' || key === 'backspace') { e.preventDefault(); this.deleteSelected(); }
    },

    hitTestAll(wx, wy) {
        for (let i = this.session.shapes.length - 1; i >= 0; i--) {
            if (this.hitTest(this.session.shapes[i], wx, wy)) return this.session.shapes[i];
        }
        return null;
    },

    hitTest(shape, wx, wy) {
        const padding = 10 / this.viewport.scale;
        
        if (shape.type === 'emoji' || shape.type === 'icon') {
            const size = shape.size || 48;
            return Utils.pointInRect(wx, wy, shape.x - padding, shape.y - padding, size + padding * 2, size + padding * 2);
        } else if (shape.type === 'point') {
            const size = shape.size || 30;
            const cx = shape.x + size / 2;
            const cy = shape.y + size / 2;
            return Math.hypot(wx - cx, wy - cy) < (size / 2 + padding);
        } else if (shape.type === 'path') {
            if (!shape.points) return false;
            for (let i = 0; i < shape.points.length - 1; i++) {
                if (Utils.pointToLine(wx, wy, shape.points[i].x, shape.points[i].y, shape.points[i+1].x, shape.points[i+1].y) < 15 / this.viewport.scale) return true;
            }
            return false;
        } else if (['rect', 'stockImage'].includes(shape.type)) {
            const b = this.getShapeBounds(shape);
            return Utils.pointInRect(wx, wy, b.x - padding, b.y - padding, b.w + padding * 2, b.h + padding * 2);
        } else if (shape.type === 'circle') {
            const cx = shape.x + shape.w / 2;
            const cy = shape.y + shape.h / 2;
            const rx = Math.abs(shape.w / 2) + padding;
            const ry = Math.abs(shape.h / 2) + padding;
            return ((wx - cx) ** 2 / rx ** 2 + (wy - cy) ** 2 / ry ** 2) <= 1;
        } else if (['arrow', 'line'].includes(shape.type)) {
            return Utils.pointToLine(wx, wy, shape.x, shape.y, shape.x2, shape.y2) < 15 / this.viewport.scale;
        } else if (shape.type === 'text') {
            this.ctx.font = this.getTextFont(shape, shape.fontSize || 24);
            const lines = (shape.text || 'Text').split('\n');
            let maxWidth = 100;
            lines.forEach(line => {
                const m = this.ctx.measureText(line);
                maxWidth = Math.max(maxWidth, m.width);
            });
            const height = (shape.fontSize || 24) * 1.2 * lines.length;
            return Utils.pointInRect(wx, wy, shape.x - padding, shape.y - padding, maxWidth + padding * 2, height + padding * 2);
        }
        return false;
    },

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let testLine = '';
        let lineCount = 0;

        for (let n = 0; n < words.length; n++) {
            testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
                lineCount++;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, y);
        return (lineCount + 1) * lineHeight;
    },

    draw() {
        if (!this.session || !this.session.img) {
            document.getElementById('emptyState').classList.remove('hidden');
            return;
        }
        
        document.getElementById('emptyState').classList.add('hidden');
        
        const ctx = this.ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.setTransform(this.viewport.scale, 0, 0, this.viewport.scale, this.viewport.x, this.viewport.y);
        
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 10;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, this.session.width, this.session.height);
        ctx.shadowColor = 'transparent';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 0;
        
        ctx.drawImage(this.session.img, 0, 0);
        
        this.session.shapes.forEach(shape => {
            if (shape === this.editingText) return;
            this.drawShape(shape, ctx);
        });
        
        this.session.shapes.filter(s => s.selected && s !== this.editingText).forEach(shape => {
            this.drawSelectionHandles(shape);
        });

        // Draw Ghost Asset if placing
        if (this.tool === 'image' && this.pendingAsset && this.last) {
            ctx.save();
            ctx.globalAlpha = 0.5;
            const w = this.toWorld(this.last.x, this.last.y);
            const size = 48;
            const ghost = {
                ...this.pendingAsset,
                x: w.x - size / 2,
                y: w.y - size / 2,
                size: size,
                stroke: this.style.stroke,
                emoji: this.pendingAsset.data,
                iconData: this.pendingAsset.data,
                fontSize: this.style.textSize || 24,
                fontWeight: this.style.textWeight || 700,
                fontFamily: this.style.textFontFamily || 'Inter, sans-serif'
            };
            this.drawShape(ghost, ctx);
            ctx.restore();
        }
    },

    drawShape(shape, ctx = this.ctx) {
        ctx.strokeStyle = shape.stroke || '#ef4444';
        ctx.fillStyle = shape.fill || 'transparent';
        ctx.lineWidth = shape.strokeWidth || 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (shape.type === 'rect') {
            if (shape.fill && shape.fill !== 'transparent') ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
            ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
        } else if (shape.type === 'point') {
            const drawSize = shape.size || (ctx === this.ctx ? 24 : 30);
            const cx = shape.x + drawSize / 2;
            const cy = shape.y + drawSize / 2;
            
            if (shape.iconData) {
                const icon = shape.iconData;
                const color = (shape.stroke || '#ef4444').replace('#', '');
                const img = Icons.imageCache.get(`iconify_${icon.fullName}_${color}`) || Icons.imageCache.get(`builtin_${icon.name}_${color}`);
                if (img) {
                    ctx.drawImage(img, shape.x, shape.y, drawSize, drawSize);
                } else {
                    Icons.getIconImage(icon, '#' + color).then(() => this.draw());
                }
            } else {
                ctx.shadowBlur = 4;
                this.syncInspectorState();
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.fillStyle = shape.stroke || '#ef4444';
                ctx.beginPath();
                ctx.arc(cx, cy, drawSize / 2, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.shadowBlur = 0;
                ctx.shadowColor = 'transparent';
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                ctx.fillStyle = '#fff';
                ctx.font = `bold ${drawSize/2}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const order = Editor.session.shapes.filter(s => s.type === 'point').sort((a,b) => (a.order||0)-(b.order||0)).indexOf(shape) + 1;
                ctx.fillText(order, cx, cy);
                ctx.textAlign = 'left';
            }
        } else if (shape.type === 'path') {
            if (!shape.points || shape.points.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(shape.points[0].x, shape.points[0].y);
            for (let i = 1; i < shape.points.length; i++) {
                ctx.lineTo(shape.points[i].x, shape.points[i].y);
            }
            ctx.stroke();
        } else if (shape.type === 'circle') {
            ctx.beginPath();
            ctx.ellipse(shape.x + shape.w / 2, shape.y + shape.h / 2, Math.abs(shape.w / 2), Math.abs(shape.h / 2), 0, 0, Math.PI * 2);
            if (shape.fill && shape.fill !== 'transparent') ctx.fill();
            ctx.stroke();
        } else if (shape.type === 'line') {
            ctx.beginPath();
            ctx.moveTo(shape.x, shape.y);
            ctx.lineTo(shape.x2, shape.y2);
            ctx.stroke();
        } else if (shape.type === 'arrow') {
            const headLen = (shape.strokeWidth || 4) * 4;
            const angle = Math.atan2(shape.y2 - shape.y, shape.x2 - shape.x);
            ctx.beginPath();
            ctx.moveTo(shape.x, shape.y);
            ctx.lineTo(shape.x2, shape.y2);
            ctx.stroke();
            ctx.fillStyle = shape.stroke || '#ef4444';
            ctx.beginPath();
            ctx.moveTo(shape.x2, shape.y2);
            ctx.lineTo(shape.x2 - headLen * Math.cos(angle - Math.PI / 6), shape.y2 - headLen * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(shape.x2 - headLen * Math.cos(angle + Math.PI / 6), shape.y2 - headLen * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fill();
        } else if (shape.type === 'text') {
            const fontSize = shape.fontSize || 24;
            ctx.font = this.getTextFont(shape, fontSize);
            ctx.textBaseline = 'top';
            ctx.fillStyle = shape.stroke || '#ef4444';
            const width = shape.w || 200;
            this.wrapText(ctx, shape.text || '', shape.x, shape.y, width, fontSize * 1.2);
        } else if (shape.type === 'icon') {
            const icon = shape.iconData;
            const size = shape.size || 48;
            const color = (shape.stroke || '#ef4444').replace('#', '');
            
            const img = Icons.imageCache.get(`iconify_${icon.fullName}_${color}`) || Icons.imageCache.get(`builtin_${icon.name}_${color}`);
            if (img) {
                ctx.drawImage(img, shape.x, shape.y, size, size);
            } else {
                Icons.getIconImage(icon, '#' + color).then(() => this.draw());
            }
        } else if (shape.type === 'emoji') {
            const size = shape.size || 48;
            ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#000'; // Emojis usually have their own color but fillStyle is needed for some fonts
            ctx.fillText(shape.emoji, shape.x, shape.y);
        } else if (shape.type === 'stockImage') {
            const img = this.loadedImages.get(shape.id);
            if (img) {
                ctx.drawImage(img, shape.x, shape.y, shape.w, shape.h);
            } else {
                ctx.fillStyle = '#333';
                ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
                ctx.fillStyle = '#666';
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('Loading...', shape.x + shape.w / 2, shape.y + shape.h / 2);
                ctx.textAlign = 'left';
            }
        }
    },

    async generateThumbnail() {
        if (!this.session || !this.session.img) return null;
        
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 140;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 200, 140);
        
        const scale = Math.min(200 / this.session.width, 140 / this.session.height);
        const w = this.session.width * scale;
        const h = this.session.height * scale;
        const tx = (200 - w) / 2;
        const ty = (140 - h) / 2;
        
        ctx.save();
        ctx.translate(tx, ty);
        ctx.scale(scale, scale);
        
        ctx.drawImage(this.session.img, 0, 0);
        
        this.session.shapes.forEach(shape => {
            this.drawShape(shape, ctx);
        });
        
        ctx.restore();
        
        return canvas.toDataURL('image/jpeg', 0.8);
    },

    drawSelectionHandles(shape) {
        const ctx = this.ctx;
        const bounds = this.getShapeBounds(shape);
        const padding = 8 / this.viewport.scale;
        
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2 / this.viewport.scale;
        ctx.setLineDash([6 / this.viewport.scale, 4 / this.viewport.scale]);
        ctx.strokeRect(bounds.x - padding, bounds.y - padding, bounds.w + padding * 2, bounds.h + padding * 2);
        ctx.setLineDash([]);
        
        const handleSize = 10 / this.viewport.scale;
        let handles = [];
        
        if (shape.type === 'point') {
            return; // No handles for points
        } else if (shape.type === 'path') {
            // Path handles removed to declutter UX. Just use bounding box corners.
            handles = [
                { x: bounds.x - padding, y: bounds.y - padding, id: 'nw' },
                { x: bounds.x + bounds.w + padding, y: bounds.y - padding, id: 'ne' },
                { x: bounds.x - padding, y: bounds.y + bounds.h + padding, id: 'sw' },
                { x: bounds.x + bounds.w + padding, y: bounds.y + bounds.h + padding, id: 'se' }
            ];
        } else {
            handles = [
                { x: bounds.x - padding, y: bounds.y - padding, id: 'nw' },
                { x: bounds.x + bounds.w + padding, y: bounds.y - padding, id: 'ne' },
                { x: bounds.x - padding, y: bounds.y + bounds.h + padding, id: 'sw' },
                { x: bounds.x + bounds.w + padding, y: bounds.y + bounds.h + padding, id: 'se' }
            ];
        }
        
        handles.forEach(h => {
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#8b5cf6';
            ctx.lineWidth = 2 / this.viewport.scale;
            ctx.beginPath();
            ctx.arc(h.x, h.y, handleSize / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });
    },

    setTool(tool, skipSidebar = false) {
        if (this.editingText) this.commitText();
        
        if (!skipSidebar && ['image', 'icon', 'emoji'].includes(tool)) {
            const tab = tool === 'image' ? 'stock' : (tool === 'icon' ? 'icons' : 'emojis');
            Library.setTab(tab);
            document.getElementById('sidebar').classList.add('open');
            document.getElementById('sidebarOverlay').classList.add('active');
            return;
        }

        this.tool = tool;
        
        // Update all buttons with matching data-tool or ID
        document.querySelectorAll('.tool-btn, .btn-ghost[data-tool]').forEach(btn => {
            const isMatch = btn.dataset.tool === tool || btn.id === 'tool-' + tool || btn.id === 'tool-' + tool + '-desk' || btn.id === 'tool-' + tool + '-mob';
            btn.classList.toggle('active', isMatch);
            
            // If it's a dropdown item and it's active, highlight the parent dropdown button too
            if (isMatch && btn.classList.contains('btn-ghost')) {
                const dropdown = btn.closest('.dropdown');
                if (dropdown) {
                    const parentBtn = dropdown.querySelector('.tool-btn');
                    if (parentBtn) parentBtn.classList.add('active');
                }
            } else if (!isMatch && btn.classList.contains('btn-ghost')) {
                const dropdown = btn.closest('.dropdown');
                if (dropdown) {
                    const parentBtn = dropdown.querySelector('.tool-btn');
                    // Only remove active if NO other tool in this dropdown is active
                    if (parentBtn && !dropdown.querySelector(`.btn-ghost[data-tool="${this.tool}"]`)) {
                        parentBtn.classList.remove('active');
                    }
                }
            }
        });

        this.container.classList.toggle('pan-mode', tool === 'hand');
        this.container.classList.toggle('text-mode', tool === 'text');
    },

    deleteSelected() {
        if (!this.session) return;
        this.session.shapes = this.session.shapes.filter(s => !s.selected);
        this.saveHistory('Delete Selection');
        this.draw();
        this.updateLayers();
        Notes.render();
        this.syncInspectorState();
        Toast.show('Deleted');
    },

    toggleLayers() {
        this.showLayersPanel = !this.showLayersPanel;
        document.getElementById('layersPanel').classList.toggle('open', this.showLayersPanel);
        this.updateLayers();
    },

    updateLayers() {
        if (!this.session) return;
        document.getElementById('layerCount').textContent = this.session.shapes.length;
        
        const list = document.getElementById('layersList');
        list.innerHTML = '';
        
        [...this.session.shapes].reverse().forEach(shape => {
            const el = document.createElement('div');
            el.className = 'layer-item' + (shape.selected ? ' selected' : '');
            
            const thumb = document.createElement('div');
            thumb.className = 'layer-thumb';
            
            if (shape.type === 'emoji') {
                thumb.textContent = shape.emoji;
                thumb.style.fontSize = '20px';
            } else if (shape.type === 'point') {
                thumb.textContent = '📍';
                thumb.style.fontSize = '16px';
            } else if (shape.type === 'icon' && shape.iconData) {
                const icon = shape.iconData;
                const color = (shape.stroke || '#fafafa').replace('#', '');
                if (icon.type === 'iconify') {
                    thumb.innerHTML = `<img src="https://api.iconify.design/${icon.fullName}.svg?color=%23${color}" alt="${icon.name}">`;
                } else {
                    thumb.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon.svg}</svg>`;
                }
            } else {
                let icon = '?';
                if (shape.type === 'rect') icon = '□';
                else if (shape.type === 'circle') icon = '○';
                else if (shape.type === 'path') icon = '✎';
                else if (shape.type === 'arrow') icon = '→';
                else if (shape.type === 'line') icon = '/';
                else if (shape.type === 'text') icon = 'T';
                else if (shape.type === 'stockImage') icon = '🖼️';
                thumb.textContent = icon;
                thumb.style.color = shape.stroke || '#fff';
            }
            
            const info = document.createElement('div');
            info.className = 'layer-info';
            
            let name = shape.type;
            if (shape.type === 'text') name = (shape.text || 'Text').substring(0, 12);
            else if (shape.type === 'emoji') name = shape.emoji;
            else if (shape.type === 'icon' && shape.iconData) name = shape.iconData.name;
            else if (shape.type === 'point') name = 'Point ' + (Editor.session.shapes.filter(s => s.type === 'point').sort((a,b) => (a.order||0)-(b.order||0)).indexOf(shape) + 1);
            
            info.innerHTML = `
                <div class="layer-name">${name}</div>
                <div class="layer-type">${shape.type}</div>
            `;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'layer-delete';
            deleteBtn.textContent = '×';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.session.shapes = this.session.shapes.filter(s => s.id !== shape.id);
                this.draw();
                this.updateLayers();
                Notes.render();
                this.syncInspectorState();
            });
            
            el.appendChild(thumb);
            el.appendChild(info);
            el.appendChild(deleteBtn);
            
            el.addEventListener('click', () => {
                this.session.shapes.forEach(s => s.selected = false);
                shape.selected = true;
                this.draw();
                this.updateLayers();
                this.syncInspectorState();
                if (shape.type === 'point') {
                    Notes.toggle(true);
                    Notes.render();
                }
            });
            
            list.appendChild(el);
        });
    }
};

