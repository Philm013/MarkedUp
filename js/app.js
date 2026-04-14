const App = {
    mode: 'library',

    async init() {
        Settings.init();
        await Library.init();
        Editor.init();
        SettingsUI.init();
        Notes.init();
        
        this.setupEventListeners();
        this.renderMobileEditorTools();
        this.applyToolbarPosition();
        
        const defaultView = Settings.get('defaultView') || 'library';
        this.setView(defaultView);
        
        window.addEventListener('paste', async e => {
            const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
            if (item) {
                const blob = item.getAsFile();
                const reader = new FileReader();
                reader.onload = async evt => {
                    const img = await Utils.loadImage(evt.target.result);
                    Library.addCapture(img, 'Pasted Image');
                };
                reader.readAsDataURL(blob);
            }
        });
    },

    renderMobileEditorTools() {
        // Sync stroke color and slider for mobile
        const sColorMob = document.getElementById('strokeColorMob');
        if (sColorMob) {
            sColorMob.onchange = (e) => {
                Editor.style.stroke = e.target.value;
                document.getElementById('strokeColor').value = e.target.value;
                Editor.applyStyleToSelected('stroke', e.target.value);
                Editor.saveHistory('Change Stroke Color');
            };
        }

        const fColorMob = document.getElementById('fillColorMob');
        if (fColorMob) {
            fColorMob.onchange = (e) => {
                Editor.style.fill = e.target.value;
                document.getElementById('fillColor').value = e.target.value;
                Editor.applyStyleToSelected('fill', e.target.value);
                Editor.saveHistory('Change Fill Color');
            };
        }

        const sSliderMob = document.getElementById('strokeSliderMob');
        const sValMob = document.getElementById('strokeValMob');
        if (sSliderMob) {
            sSliderMob.oninput = (e) => {
                const val = parseInt(e.target.value);
                Editor.style.strokeWidth = val;
                if (sValMob) sValMob.textContent = val + 'px';
                document.getElementById('strokeSlider').value = val;
                Editor.applyStyleToSelected('strokeWidth', val);
            };
            sSliderMob.onchange = () => Editor.saveHistory('Change Stroke Width');
        }

        // Tray tool buttons
        document.querySelectorAll('.tray-tool-btn[data-tool]').forEach(btn => {
            btn.onclick = () => {
                Editor.setTool(btn.dataset.tool);
                this.closeTray();
            };
        });
    },

    openTray() {
        document.getElementById('mobileActionTray').classList.add('open');
        document.getElementById('trayOverlay').classList.add('active');
    },

    closeTray() {
        document.getElementById('mobileActionTray').classList.remove('open');
        document.getElementById('trayOverlay').classList.remove('active');
    },

    applyToolbarPosition() {
        const trigger = document.getElementById('mobileDrawingTrigger');
        const tray = document.getElementById('mobileActionTray');
        const viewport = document.querySelector('.viewport');
        const isMob = window.innerWidth <= 768;
        const pos = Settings.get('mobileToolbarPosition') || 'bottom';
        
        if (isMob && trigger) {
            this.makeDraggable(trigger);
            
            // Apply position classes
            trigger.classList.remove('pos-top', 'pos-bottom', 'pos-floating');
            if (tray) tray.classList.remove('pos-top', 'pos-bottom');
            
            if (pos === 'top') {
                trigger.classList.add('pos-top');
                if (tray) tray.classList.add('pos-top');
            } else if (pos === 'bottom') {
                trigger.classList.add('pos-bottom');
                if (tray) tray.classList.add('pos-bottom');
            } else {
                trigger.classList.add('pos-floating');
            }
        }

        if (viewport) {
            const header = document.querySelector('.header');
            const headerHeight = (isMob && header) ? header.offsetHeight : 0;
            
            if (isMob) {
                document.documentElement.style.setProperty('--header-h', headerHeight + 'px');
                viewport.style.marginTop = '0';
                viewport.style.marginBottom = (this.mode !== 'library') ? 'var(--nav-h)' : '0';
            } else {
                viewport.style.marginTop = '0';
                viewport.style.marginBottom = '0';
            }
        }
        
        if (this.mode === 'markup') {
            setTimeout(() => Editor.resize(), 50);
        }
    },

    makeDraggable(el) {
        if (el.dataset.draggable) return;
        el.dataset.draggable = "true";

        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        let isDragging = false;
        let startX = 0, startY = 0;
        
        el.onpointerdown = (e) => {
            // Only allow dragging if in floating mode or if specific conditions are met
            if (Settings.get('mobileToolbarPosition') !== 'floating') return;
            
            el.setPointerCapture(e.pointerId);
            isDragging = false;
            startX = e.clientX;
            startY = e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            const onPointerMove = (e) => {
                if (Math.abs(startX - e.clientX) > 10 || Math.abs(startY - e.clientY) > 10) {
                    isDragging = true;
                }
                if (!isDragging) return;

                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                
                const newTop = el.offsetTop - pos2;
                const newLeft = el.offsetLeft - pos1;
                
                // Constrain to screen
                if (newTop > 0 && newTop < window.innerHeight - 80) el.style.top = newTop + "px";
                if (newLeft > 0 && newLeft < window.innerWidth - 60) el.style.left = newLeft + "px";
                
                el.style.bottom = 'auto';
                el.style.right = 'auto';
                el.style.margin = '0';
            };

            const onPointerUp = (e) => {
                el.releasePointerCapture(e.pointerId);
                el.removeEventListener('pointermove', onPointerMove);
                el.removeEventListener('pointerup', onPointerUp);
                
                if (isDragging) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                }
            };

            el.addEventListener('pointermove', onPointerMove);
            el.addEventListener('pointerup', onPointerUp);
        };
    },

    setupEventListeners() {
        const bindKeyboardActivate = (el, handler) => {
            if (!el || !handler) return;
            el.onclick = handler;
            el.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handler(e);
                }
            };
        };

        // Mode Switches
        document.getElementById('btnLibrary').onclick = () => this.setView('library');
        document.getElementById('btnBrowse').onclick = () => this.setView('browse');
        document.getElementById('btnMarkup').onclick = () => this.setView('markup');
        
        // Mobile Navigation
        bindKeyboardActivate(document.getElementById('navLibrary'), () => this.setView('library'));
        bindKeyboardActivate(document.getElementById('navBrowse'), () => this.setView('browse'));
        bindKeyboardActivate(document.getElementById('navMarkup'), () => this.setView('markup'));
        bindKeyboardActivate(document.getElementById('navAssets'), () => {
            document.getElementById('sidebar').classList.add('open');
            document.getElementById('sidebarOverlay').classList.add('active');
            if (Icons.tabBtn) Icons.tabBtn.click();
            else Library.setTab('icons');
        });

        // Mobile Header Controls
        const zInMobH = document.getElementById('zoomInMobHeader');
        if (zInMobH) zInMobH.onclick = () => Editor.zoom(0.25);
        const zOutMobH = document.getElementById('zoomOutMobHeader');
        if (zOutMobH) zOutMobH.onclick = () => Editor.zoom(-0.25);
        const zFitMobH = document.getElementById('zoomFitMobHeader');
        if (zFitMobH) zFitMobH.onclick = () => Editor.fitToView();
        const undoMobH = document.getElementById('undoBtnMobHeader');
        if (undoMobH) undoMobH.onclick = () => Editor.undo();
        const redoMobH = document.getElementById('redoBtnMobHeader');
        if (redoMobH) redoMobH.onclick = () => Editor.redo();
        
        const selMobH = document.getElementById('tool-select-mob-h');
        if (selMobH) selMobH.onclick = () => Editor.setTool('select');
        const handMobH = document.getElementById('tool-hand-mob-h');
        if (handMobH) handMobH.onclick = () => Editor.setTool('hand');

        const goMob = document.getElementById('goBtnMob');
        if (goMob) goMob.onclick = () => {
            const val = document.getElementById('urlInputMob').value;
            document.getElementById('urlInput').value = val;
            Browser.go();
        };
        const capMobH = document.getElementById('captureBtnMobHeader');
        if (capMobH) capMobH.onclick = () => Browser.capture();

        // Tray Logic
        document.getElementById('mobileDrawingTrigger').onclick = () => this.openTray();
        document.getElementById('trayOverlay').onclick = () => this.closeTray();
        document.getElementById('assetsBtnTray').onclick = () => {
            this.closeTray();
            document.getElementById('sidebar').classList.add('open');
            document.getElementById('sidebarOverlay').classList.add('active');
            if (Icons.tabBtn) Icons.tabBtn.click();
            else Library.setTab('icons');
        };

        // Tray Actions
        document.getElementById('layersBtnMobTray').onclick = () => { Editor.toggleLayers(); this.closeTray(); };
        document.getElementById('historyBtnMobTray').onclick = () => { Editor.toggleHistory(); this.closeTray(); };
        document.getElementById('saveBtnMobTray').onclick = async () => { await Library.saveCurrentCapture(); Toast.show('Saved'); this.closeTray(); };
        document.getElementById('deleteBtnMobTray').onclick = () => { Editor.deleteSelected(); this.closeTray(); };

        // Desktop Markup Bar Controls
        const handDesk = document.getElementById('tool-hand-desk');
        if (handDesk) handDesk.onclick = () => Editor.setTool('hand');
        const selectDesk = document.getElementById('tool-select-desk');
        if (selectDesk) selectDesk.onclick = () => Editor.setTool('select');
        
        const zInDesk = document.getElementById('zoomInDesk');
        if (zInDesk) zInDesk.onclick = () => Editor.zoom(0.25);
        const zOutDesk = document.getElementById('zoomOutDesk');
        if (zOutDesk) zOutDesk.onclick = () => Editor.zoom(-0.25);
        const zFitDesk = document.getElementById('zoomFitDesk');
        if (zFitDesk) zFitDesk.onclick = () => Editor.fitToView();

        // Shared Actions
        document.getElementById('startNewBtn').onclick = () => this.startNew();
        document.getElementById('landingNewBtn').onclick = () => this.startNew();
        document.getElementById('landingExportBtn').onclick = () => this.exportMultipleSessions();
        
        // Browse Actions (Desktop + Mobile)
        const go = () => Browser.go();
        document.getElementById('goBtn').onclick = go;
        document.getElementById('urlInput').onkeypress = (e) => e.key === 'Enter' && go();
        
        const setViewport = (val) => {
            const frame = document.getElementById('webFrame');
            if (val === 'desktop') frame.style.width = '100%';
            else if (val === 'tablet') frame.style.width = '768px';
            else if (val === 'mobile') frame.style.width = '375px';
        };
        document.getElementById('viewportSelect').onchange = (e) => setViewport(e.target.value);

        const openPdf = () => Modal.open('pdfModal');
        const pdfBtn = document.getElementById('pdfOpenBtn');
        if (pdfBtn) pdfBtn.onclick = openPdf;

        // Capture Actions
        const capture = () => Browser.capture();
        document.getElementById('captureBtn').onclick = capture;
        
        // Paste Logic
        const doPaste = async () => {
            try {
                const items = await navigator.clipboard.read();
                for (const item of items) {
                    const imageTypes = item.types.filter(type => type.startsWith('image/'));
                    for (const type of imageTypes) {
                        const blob = await item.getType(type);
                        const reader = new FileReader();
                        reader.onload = async evt => {
                            const img = await Utils.loadImage(evt.target.result);
                            Library.addCapture(img, 'Pasted Image');
                            Toast.show('Image pasted from clipboard');
                        };
                        reader.readAsDataURL(blob);
                        return;
                    }
                }
                Toast.show('No image found in clipboard', 'error');
            } catch (e) {
                console.error('Clipboard paste failed:', e);
                Toast.show('Clipboard access denied or not supported', 'error');
            }
        };

        const pasteBtn = document.getElementById('pasteCaptureBtn');
        if (pasteBtn) pasteBtn.onclick = doPaste;

        // Upload Screenshot Logic
        const uploadInput = document.getElementById('screenshotUploadInput');
        if (uploadInput) uploadInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async evt => {
                    const img = await Utils.loadImage(evt.target.result);
                    Library.addCapture(img, 'Uploaded Screenshot');
                    Toast.show('Screenshot imported');
                };
                reader.readAsDataURL(file);
            }
        };

        // Markup Actions (Desktop + Mobile Sync)
        const save = async () => { await Library.saveCurrentCapture(); Toast.show('Saved'); };
        document.getElementById('saveBtn').onclick = save;

        const del = () => Editor.deleteSelected();
        document.getElementById('deleteBtn').onclick = del;

        const undo = () => Editor.undo();
        ['undoBtnDesk'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.onclick = undo;
        });

        const redo = () => Editor.redo();
        ['redoBtnDesk'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.onclick = redo;
        });

        const layers = () => Editor.toggleLayers();
        document.getElementById('layersBtn').onclick = layers;

        // Dialogs
        document.getElementById('settingsBtn').onclick = () => { SettingsUI.loadToUI(); Modal.open('settingsModal'); };
        document.getElementById('settingsCancelBtn').onclick = () => Modal.close('settingsModal');
        document.getElementById('settingsSaveBtn').onclick = () => SettingsUI.save();
        
        document.getElementById('exportBtn').onclick = () => Exporter.showDialog();
        const selectAllBtn = document.getElementById('selectAllBtn');
        if (selectAllBtn) selectAllBtn.onclick = () => Library.selectAllCaptures();
        const clearAllBtn = document.getElementById('clearAllBtn');
        if (clearAllBtn) clearAllBtn.onclick = () => Library.clearSelection();
        document.getElementById('exportCancelBtn').onclick = () => Modal.close('exportModal');
        document.getElementById('exportZipBtn').onclick = () => Exporter.run('zip');
        document.getElementById('exportPdfBtn').onclick = () => Exporter.run('pdf');
        document.getElementById('exportCopyGridBtn').onclick = () => {
            Exporter.copyCombinedToClipboard();
            Modal.close('exportModal');
        };
        
        document.getElementById('confirmCancelBtn').onclick = () => Modal.close('confirmModal');
        document.getElementById('confirmOkBtn').onclick = () => {
            Modal.close('confirmModal');
            if (Modal.confirmCallback) Modal.confirmCallback();
        };

        document.getElementById('promptCancelBtn').onclick = () => {
            Modal.close('promptModal');
            Modal.promptCallback = null;
        };

        document.getElementById('promptOkBtn').onclick = () => {
            const input = document.getElementById('promptInput');
            const value = input ? input.value : '';
            const cb = Modal.promptCallback;
            Modal.close('promptModal');
            Modal.promptCallback = null;
            if (cb) cb(value);
        };

        const promptInput = document.getElementById('promptInput');
        if (promptInput) {
            promptInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('promptOkBtn').click();
                }
            };
        }
        
        document.getElementById('closeNotesBtn').onclick = () => Notes.toggle(false);

        document.getElementById('mobileMenuBtn').onclick = () => this.setView('library');
        document.getElementById('sidebarOverlay').onclick = () => {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('sidebarOverlay').classList.remove('active');
        };
        document.getElementById('sidebarCloseBtn').onclick = () => {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('sidebarOverlay').classList.remove('active');
        };

        // UI Dropdowns
        const setupDropdown = (btnId, menuId) => {
            const btn = document.getElementById(btnId);
            const menu = document.getElementById(menuId);
            if (!btn || !menu) return;
            btn.onclick = (e) => {
                e.stopPropagation();
                const isActive = menu.classList.contains('active');
                document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('active'));
                if (!isActive) menu.classList.add('active');
            };
            // Prevent closure when clicking inside the menu
            menu.onclick = (e) => e.stopPropagation();
        };

        setupDropdown('editorMoreBtn', 'editorMoreMenu');
        setupDropdown('drawToolsBtn', 'drawToolsMenu');
        setupDropdown('annotateToolsBtn', 'annotateToolsMenu');
        setupDropdown('assetToolsBtn', 'assetToolsMenu');

        // PDF Modal Actions
        document.getElementById('pdfCancelBtn').onclick = () => Modal.close('pdfModal');
        document.getElementById('pdfLoadBtn').onclick = () => {
            const url = document.getElementById('pdfUrlInput').value.trim();
            const file = document.getElementById('pdfFileInput').files[0];
            if (url) {
                PDFViewer.loadFromUrl(url);
            } else if (file) {
                PDFViewer.loadFromFile(file);
            } else {
                Toast.show('Please provide a URL or select a file', 'error');
            }
        };

        window.onclick = () => {
            document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('active'));
        };
    },

    setView(mode) {
        this.mode = mode;
        const isMob = window.innerWidth <= 768;

        // Header Buttons
        document.getElementById('btnLibrary').classList.toggle('active', mode === 'library');
        document.getElementById('btnBrowse').classList.toggle('active', mode === 'browse');
        document.getElementById('btnMarkup').classList.toggle('active', mode === 'markup');
        
        // Mobile Nav
        const mobNav = document.getElementById('mobileNav');
        if (mobNav) {
            mobNav.style.display = isMob ? 'flex' : 'none';
            document.getElementById('navLibrary').classList.toggle('active', mode === 'library');
            document.getElementById('navBrowse').classList.toggle('active', mode === 'browse');
            document.getElementById('navMarkup').classList.toggle('active', mode === 'markup');
        }

        // Sidebar cleanup
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('active');
        
        // Mobile Header Controls Swapping
        const mobHeaderBrowse = document.getElementById('mobHeaderBrowse');
        const mobHeaderMarkup = document.getElementById('mobHeaderMarkup');
        const mobTrigger = document.getElementById('mobileDrawingTrigger');

        if (isMob) {
            if (mobHeaderBrowse) mobHeaderBrowse.style.display = (mode === 'browse') ? 'flex' : 'none';
            if (mobHeaderMarkup) mobHeaderMarkup.style.display = (mode === 'markup') ? 'flex' : 'none';
            if (mobTrigger) mobTrigger.style.display = (mode === 'markup') ? 'flex' : 'none';
            
            // Sync desktop URL input to mobile
            if (mode === 'browse') {
                document.getElementById('urlInputMob').value = document.getElementById('urlInput').value;
            }
        } else {
            if (mobTrigger) mobTrigger.style.display = 'none';
        }

        // Desktop Toolbar Visibility
        const browserBar = document.getElementById('browserBar');
        const markupBar = document.getElementById('markupBar');
        const topEditorBar = document.getElementById('editorBar');
        const sessionActions = document.getElementById('sessionActions');

        if (!isMob) {
            if (browserBar) browserBar.style.display = (mode === 'browse') ? 'flex' : 'none';
            if (markupBar) markupBar.style.display = (mode === 'markup') ? 'flex' : 'none';
            if (topEditorBar) topEditorBar.classList.toggle('active', mode === 'markup');
            if (sessionActions) sessionActions.style.display = (mode !== 'library') ? 'flex' : 'none';
        }
        
        // Layers/History panels should close on view change
        document.getElementById('layersPanel').classList.remove('open');
        document.getElementById('historyPanel').classList.remove('open');
        this.closeTray();

        // Main View Layers
        document.getElementById('browseView').classList.toggle('active', mode === 'browse');
        document.getElementById('markupView').classList.toggle('active', mode === 'markup');
        document.getElementById('landingPage').classList.toggle('active', mode === 'library');
        
        // Sidebar display logic
        const sidebar = document.getElementById('sidebar');
        if (isMob) {
            sidebar.style.display = 'flex'; 
        } else {
            sidebar.style.display = (mode === 'library') ? 'none' : 'flex';
            document.querySelector('.app').style.gridTemplateColumns = (mode === 'library') ? '1fr' : 'auto 1fr';
        }
        
        if (mode === 'library') {
            this.renderLandingPage();
        } else if (mode === 'markup') {
            setTimeout(() => {
                Editor.resize();
                if (Editor.session) Editor.fitToView();
                this.renderMobileEditorTools();
            }, 50);
        } else if (mode === 'browse') {
            if (!document.getElementById('webFrame').src) Browser.go();
        }
        
        this.applyToolbarPosition();
    },

    async renderLandingPage() {
        Library.render('landingSessionsGrid');
    },

    async startNew() {
        await Library.createNewCollection();
    },

    async exportMultipleSessions() {
        const selected = Library.captures.filter(c => c.selected);
        if (selected.length === 0) {
            Toast.show('Select items from the collection first', 'error');
            return;
        }
        Exporter.showDialog();
    }
};
