// ═════════════════════════════════════════════════════════════════
// Editor Toolbar & Mode Manager
// Handles multiple toolbar positions and view mode switching
// ═════════════════════════════════════════════════════════════════

const ToolbarManager = {
    currentMode: 'browse',
    currentToolbarPosition: 'floating',

    init() {
        this.setupModeTabListeners();
        this.setupToolbarToggle();
        this.setupToolbarPositionSwitcher();
        this.loadToolbarPosition();
    },

    // ─────────────────────────────────────────────────────────────
    // Mode Tab Handling (Library, Browse, Markup)
    // ─────────────────────────────────────────────────────────────

    setupModeTabListeners() {
        const modeLibrary = document.getElementById('modeLibrary');
        const modeBrowse = document.getElementById('modeBrowse');
        const modeMarkup = document.getElementById('modeMarkup');

        // Sidebar mode tabs
        if (modeLibrary) modeLibrary.addEventListener('click', () => this.switchMode('library'));
        if (modeBrowse) modeBrowse.addEventListener('click', () => this.switchMode('browse'));
        if (modeMarkup) modeMarkup.addEventListener('click', () => this.switchMode('markup'));

        // Header view tabs (if they exist)
        const btnLibrary = document.getElementById('btnLibrary');
        const btnBrowse = document.getElementById('btnBrowse');
        const btnMarkup = document.getElementById('btnMarkup');

        if (btnLibrary) btnLibrary.addEventListener('click', () => this.switchMode('library'));
        if (btnBrowse) btnBrowse.addEventListener('click', () => this.switchMode('browse'));
        if (btnMarkup) btnMarkup.addEventListener('click', () => this.switchMode('markup'));
    },

    switchMode(mode) {
        this.currentMode = mode;

        // Update sidebar tabs
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.mode === mode) tab.classList.add('active');
        });

        // Update header tabs
        document.querySelectorAll('.view-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.id === `btn${mode.charAt(0).toUpperCase() + mode.slice(1)}`) {
                tab.classList.add('active');
            }
        });

        // Switch views
        const browseView = document.getElementById('browseView');
        const markupView = document.getElementById('markupView');
        const contentArea = document.getElementById('contentArea');

        if (mode === 'library') {
            if (contentArea) contentArea.style.display = 'block';
            if (browseView) browseView.classList.remove('active');
            if (markupView) markupView.classList.remove('active');
        } else if (mode === 'browse') {
            if (contentArea) contentArea.style.display = 'none';
            if (browseView) browseView.classList.add('active');
            if (markupView) markupView.classList.remove('active');
        } else if (mode === 'markup') {
            if (contentArea) contentArea.style.display = 'none';
            if (browseView) browseView.classList.remove('active');
            if (markupView) markupView.classList.add('active');
        }
    },

    // ─────────────────────────────────────────────────────────────
    // Toolbar Toggle (Floating Mode)
    // ─────────────────────────────────────────────────────────────

    setupToolbarToggle() {
        const trigger = document.getElementById('editorToolbarTrigger');
        const menu = document.getElementById('editorToolbarMenu');

        if (trigger && menu) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.classList.toggle('active');
            });

            // Close menu when clicking outside
            document.addEventListener('click', () => {
                if (menu.classList.contains('active')) menu.classList.remove('active');
            });

            // Menu item clicks
            menu.querySelectorAll('.toolbar-menu-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const tool = item.dataset.tool;
                    this.handleToolClick(tool);
                    menu.classList.remove('active');
                });
            });
        }
    },

    handleToolClick(tool) {
        // Route to appropriate tool handler
        if (tool === 'undo') {
            if (window.Canvas && window.Canvas.undo) Canvas.undo();
        } else if (tool === 'redo') {
            if (window.Canvas && window.Canvas.redo) Canvas.redo();
        } else {
            // Tool selection will be handled by the drawing system
            console.log(`Selected tool: ${tool}`);
        }
    },

    // ─────────────────────────────────────────────────────────────
    // Toolbar Position Manager
    // ─────────────────────────────────────────────────────────────

    setupToolbarPositionSwitcher() {
        const select = document.getElementById('settingEditorToolbarPosition');
        if (select) {
            select.addEventListener('change', (e) => {
                const position = e.target.value;
                this.setToolbarPosition(position);
                Settings.set('editorToolbarPosition', position);
            });
        }
    },

    loadToolbarPosition() {
        const saved = Settings.get('editorToolbarPosition') || 'floating';
        this.setToolbarPosition(saved);
        const select = document.getElementById('settingEditorToolbarPosition');
        if (select) select.value = saved;
    },

    setToolbarPosition(position) {
        const wrapper = document.getElementById('editorToolbarWrapper');
        if (!wrapper) return;

        this.currentToolbarPosition = position;

        // Remove all mode classes
        wrapper.classList.remove(
            'mode-floating',
            'mode-top-docked',
            'mode-bottom-docked',
            'mode-left-docked',
            'mode-right-docked'
        );

        // Add the current mode class
        wrapper.classList.add(`mode-${position}`);
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    ToolbarManager.init();
});
