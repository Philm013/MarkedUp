const SettingsUI = {
    init() {
        const onActivate = (handler) => (e) => {
            if (e.type === 'click' || e.key === 'Enter' || e.key === ' ') {
                if (e.type === 'keydown') e.preventDefault();
                handler();
            }
        };

        // Toggle Buttons
        document.querySelectorAll('.toggle').forEach(toggle => {
            toggle.setAttribute('role', 'switch');
            toggle.setAttribute('tabindex', '0');
            const toggleHandler = () => {
                toggle.classList.toggle('active');
                toggle.setAttribute('aria-checked', toggle.classList.contains('active') ? 'true' : 'false');
                this.updateSettingsVisibility();
            };
            toggle.addEventListener('click', onActivate(toggleHandler));
            toggle.addEventListener('keydown', onActivate(toggleHandler));
        });

        // Tab Navigation
        const navItems = document.querySelectorAll('.settings-nav-item');
        const sections = document.querySelectorAll('.settings-section');
        
        navItems.forEach(item => {
            item.setAttribute('role', 'button');
            item.setAttribute('tabindex', '0');
            const switchSection = () => {
                navItems.forEach(nav => nav.classList.remove('active'));
                sections.forEach(sec => sec.classList.remove('active'));
                
                item.classList.add('active');
                const target = document.getElementById(item.dataset.target);
                if (target) target.classList.add('active');
            };
            item.addEventListener('click', onActivate(switchSection));
            item.addEventListener('keydown', onActivate(switchSection));
        });

        // Color Picker Sync
        const colorInput = document.getElementById('settingDefaultStrokeColor');
        const hexInput = document.getElementById('settingDefaultStrokeColorHex');
        if (colorInput && hexInput) {
            colorInput.addEventListener('input', (e) => hexInput.value = e.target.value);
            hexInput.addEventListener('change', (e) => {
                let val = e.target.value;
                if (!val.startsWith('#')) val = '#' + val;
                if (/^#[0-9A-F]{6}$/i.test(val)) {
                    colorInput.value = val;
                } else {
                    hexInput.value = colorInput.value;
                }
            });
        }

        // Stroke Width Sync
        const widthInput = document.getElementById('settingDefaultStrokeWidth');
        const widthDisplay = document.getElementById('settingStrokeWidthDisplay');
        if (widthInput && widthDisplay) {
            widthInput.addEventListener('input', (e) => widthDisplay.textContent = e.target.value + 'px');
        }

        // Pinch Sensitivity Sync
        const pinchInput = document.getElementById('settingPinchSensitivity');
        const pinchDisplay = document.getElementById('settingPinchSensitivityDisplay');
        if (pinchInput && pinchDisplay) {
            pinchInput.addEventListener('input', (e) => pinchDisplay.textContent = parseFloat(e.target.value).toFixed(1) + 'x');
        }

        // Data Management Buttons
        document.getElementById('dangerClearDataBtn').addEventListener('click', () => this.clearAllData());
        document.getElementById('exportSettingsBtn').addEventListener('click', () => this.exportSettings());

        const captureModeSelect = document.getElementById('settingCaptureMode');
        if (captureModeSelect) {
            captureModeSelect.addEventListener('change', (e) => {
                const mode = String(e.target.value || 'auto').toLowerCase();
                console.log(`[SettingsUI] Capture mode select changed to: "${mode}"`);
                Settings.set('captureMode', mode);
                Toast.show(`Capture mode: ${mode}`);
                console.log(`[SettingsUI] Mode saved and toast shown`);
            });
        } else {
            console.warn('[SettingsUI] settingCaptureMode element not found at init');
        }
        
        const fileInput = document.getElementById('settingsFileInput');
        document.getElementById('importSettingsBtn').addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.importSettings(e));
        
        this.loadToUI();
    },
    
    async loadToUI() {
        const settings = Settings.getAll();
        
        // Toggles
        document.getElementById('toggleBuiltinIcons').classList.toggle('active', settings.builtinIcons);
        document.getElementById('toggleIconify').classList.toggle('active', settings.iconifyEnabled);
        document.getElementById('togglePicsum').classList.toggle('active', settings.picsumEnabled);
        document.getElementById('toggleUnsplash').classList.toggle('active', settings.unsplashEnabled);
        document.getElementById('togglePexels').classList.toggle('active', settings.pexelsEnabled);
        document.getElementById('toggleDefaultToSelect').classList.toggle('active', settings.defaultToSelect);
        document.getElementById('toggleRightClickPan').classList.toggle('active', settings.rightClickPan);
        document.querySelectorAll('.toggle').forEach(toggle => {
            toggle.setAttribute('aria-checked', toggle.classList.contains('active') ? 'true' : 'false');
        });
        
        // Inputs
        document.getElementById('iconifySet').value = settings.iconifySet || '';
        document.getElementById('unsplashKey').value = settings.unsplashKey || '';
        document.getElementById('pexelsKey').value = settings.pexelsKey || '';
        
        const color = settings.defaultStrokeColor || '#ef4444';
        document.getElementById('settingDefaultStrokeColor').value = color;
        document.getElementById('settingDefaultStrokeColorHex').value = color;
        
        const width = settings.defaultStrokeWidth || 4;
        document.getElementById('settingDefaultStrokeWidth').value = width;
        document.getElementById('settingStrokeWidthDisplay').textContent = width + 'px';
        
        const pinch = settings.pinchSensitivity || 1.0;
        document.getElementById('settingPinchSensitivity').value = pinch;
        document.getElementById('settingPinchSensitivityDisplay').textContent = parseFloat(pinch).toFixed(1) + 'x';
        
        document.getElementById('settingMobileToolbarPosition').value = settings.mobileToolbarPosition || 'bottom';
        document.getElementById('settingCaptureMode').value = settings.captureMode || 'auto';
        document.getElementById('settingDefaultView').value = settings.defaultView || 'library';
        
        this.updateSettingsVisibility();

        // Load Stats
        try {
            const sessions = await DB.countStore(DB.STORES.SESSIONS);
            const captures = await DB.countStore(DB.STORES.CAPTURES);
            document.getElementById('settingsStatSessions').textContent = sessions;
            document.getElementById('settingsStatCaptures').textContent = captures;
        } catch (e) {
            console.error('Failed to load DB stats for settings', e);
        }
    },
    
    updateSettingsVisibility() {
        document.getElementById('iconifySettings').style.display = 
            document.getElementById('toggleIconify').classList.contains('active') ? 'block' : 'none';
        document.getElementById('unsplashSettings').style.display = 
            document.getElementById('toggleUnsplash').classList.contains('active') ? 'block' : 'none';
        document.getElementById('pexelsSettings').style.display = 
            document.getElementById('togglePexels').classList.contains('active') ? 'block' : 'none';
    },
    
    save() {
        Settings.setAll({
            builtinIcons: document.getElementById('toggleBuiltinIcons').classList.contains('active'),
            iconifyEnabled: document.getElementById('toggleIconify').classList.contains('active'),
            iconifySet: document.getElementById('iconifySet').value,
            picsumEnabled: document.getElementById('togglePicsum').classList.contains('active'),
            unsplashEnabled: document.getElementById('toggleUnsplash').classList.contains('active'),
            unsplashKey: document.getElementById('unsplashKey').value,
            pexelsEnabled: document.getElementById('togglePexels').classList.contains('active'),
            pexelsKey: document.getElementById('pexelsKey').value,
            defaultToSelect: document.getElementById('toggleDefaultToSelect').classList.contains('active'),
            rightClickPan: document.getElementById('toggleRightClickPan').classList.contains('active'),
            defaultStrokeColor: document.getElementById('settingDefaultStrokeColor').value,
            defaultStrokeWidth: parseInt(document.getElementById('settingDefaultStrokeWidth').value),
            pinchSensitivity: parseFloat(document.getElementById('settingPinchSensitivity').value),
            mobileToolbarPosition: document.getElementById('settingMobileToolbarPosition').value,
            captureMode: document.getElementById('settingCaptureMode').value,
            defaultView: document.getElementById('settingDefaultView').value
        });
        
        // Update Editor's current style if no active shape is selected
        if (!Editor.activeShape) {
            Editor.style.stroke = Settings.get('defaultStrokeColor');
            Editor.style.strokeWidth = Settings.get('defaultStrokeWidth');
            document.getElementById('strokeColor').value = Editor.style.stroke;
            document.getElementById('strokeSlider').value = Editor.style.strokeWidth;
        }

        Icons.imageCache.clear();
        Icons.loadIcons();
        Stock.load(true);
        
        App.applyToolbarPosition();
        
        Modal.close('settingsModal');
        Toast.show('Settings saved!');
    },

    clearAllData() {
        Modal.confirm(
            'Clear All Data', 
            'Are you absolutely sure? This will delete all sessions, captures, and annotations. This cannot be undone.', 
            async () => {
                Toast.show('Clearing database...');
                try {
                    await DB.clear(DB.STORES.CAPTURES);
                    await DB.clear(DB.STORES.SESSIONS);
                    Library.sessions = [];
                    Library.captures = [];
                    Library.activeSessionId = null;
                    Library.activeCaptureId = null;
                    Editor.session = null;
                    App.setView('library');
                    Modal.close('settingsModal');
                    Toast.show('All data cleared successfully.');
                    // Reload to ensure completely clean state
                    setTimeout(() => window.location.reload(), 1500);
                } catch (e) {
                    console.error('Failed to clear data', e);
                    Toast.show('Failed to clear data', 'error');
                }
            }
        );
    },

    exportSettings() {
        const settingsStr = localStorage.getItem('devmarkup_settings');
        if (!settingsStr) {
            Toast.show('No custom settings to export', 'error');
            return;
        }
        
        const blob = new Blob([settingsStr], { type: 'application/json' });
        saveAs(blob, 'markedup-settings.json');
        Toast.show('Settings exported');
    },

    importSettings(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                // Basic validation
                if (typeof json === 'object' && json !== null) {
                    Settings.setAll(json);
                    this.loadToUI();
                    Toast.show('Settings imported successfully!');
                } else {
                    throw new Error('Invalid JSON format');
                }
            } catch (err) {
                console.error('Settings import failed:', err);
                Toast.show('Failed to import: Invalid file', 'error');
            }
            // Reset input so the same file can be selected again
            event.target.value = '';
        };
        reader.readAsText(file);
    }
};