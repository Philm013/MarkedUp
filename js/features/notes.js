const Notes = {
    activeNoteId: null,

    init() {
        // Handled by Editor and UI events
    },

    toggle(force) {
        const panel = document.getElementById('notesPanel');
        const isActive = force !== undefined ? force : !panel.classList.contains('open');
        panel.classList.toggle('open', isActive);
    },

    render() {
        const list = document.getElementById('notesList');
        list.innerHTML = '';
        
        if (!Editor.session) return;
        
        const points = Editor.session.shapes
            .filter(s => s.type === 'point')
            .sort((a, b) => (a.order || 0) - (b.order || 0));
            
        if (points.length === 0) {
            list.innerHTML = '<div style="text-align:center; padding:40px 20px; color:var(--text-dim); font-size:13px;">No comment points added yet. Use the Point tool to add markers.</div>';
            return;
        }
        
        points.forEach((p, i) => {
            const item = document.createElement('div');
            item.className = 'note-item' + (p.selected ? ' active' : '') + (p.collapsed ? ' collapsed' : '');
            
            let iconHtml = `<div class="note-number">${i + 1}</div>`;
            if (p.iconData) {
                const color = (p.stroke || '#ef4444').replace('#', '');
                if (p.iconData.type === 'iconify') {
                    iconHtml = `<div class="note-number" style="background:transparent;"><img src="https://api.iconify.design/${p.iconData.fullName}.svg?color=%23${color}" style="width:24px; height:24px;"></div>`;
                } else {
                    iconHtml = `<div class="note-number" style="background:transparent;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p.iconData.svg}</svg></div>`;
                }
            }

            item.innerHTML = `
                <div class="note-item-header" onclick="Notes.toggleCollapse('${p.id}')">
                    ${iconHtml}
                    <span style="font-size:11px; color:var(--text-dim); font-weight:600; text-transform: uppercase;">Point ${i + 1}</span>
                    <div style="margin-left:auto; display:flex; gap:4px; align-items:center;">
                        <button class="btn btn-ghost btn-sm" style="padding:2px 6px; font-size:10px;" onclick="event.stopPropagation(); Notes.startChangeIcon('${p.id}')">Icon</button>
                        <span class="collapse-arrow">${p.collapsed ? '▼' : '▲'}</span>
                    </div>
                </div>
                <div class="note-content">
                    <textarea class="note-text" placeholder="Add a note or comment here...">${p.note || ''}</textarea>
                    <div class="note-actions">
                        <button class="btn-round" title="Delete Point" onclick="event.stopPropagation(); Notes.deletePoint('${p.id}')">×</button>
                    </div>
                </div>
            `;
            
            const textarea = item.querySelector('.note-text');
            if (textarea) {
                textarea.addEventListener('input', (e) => {
                    e.stopPropagation();
                    p.note = e.target.value;
                    Library.saveCurrentCapture();
                });
                
                textarea.addEventListener('click', (e) => {
                    e.stopPropagation();
                    textarea.focus();
                });
            }
            
            item.addEventListener('click', (e) => {
                if (e.target.closest('.note-item-header') || e.target.closest('.note-content')) return;
                Editor.session.shapes.forEach(s => s.selected = false);
                p.selected = true;
                Editor.draw();
                this.render();
            });
            
            list.appendChild(item);
        });
    },

    toggleCollapse(id) {
        const point = Editor.session.shapes.find(s => s.id === id);
        if (point) {
            point.collapsed = !point.collapsed;
            this.render();
        }
    },

    deletePoint(id) {
        if (!Editor.session) return;
        Editor.session.shapes = Editor.session.shapes.filter(s => s.id !== id);
        Editor.draw();
        Editor.updateLayers();
        this.render();
        Library.saveCurrentCapture();
    },

    pendingPointId: null,
    startChangeIcon(id) {
        this.pendingPointId = id;
        
        // Close notes panel to avoid overlap
        this.toggle(false);
        
        // Show the sidebar if it's hidden (on mobile)
        const isMob = window.innerWidth <= 768;
        if (isMob) {
            document.getElementById('sidebar').classList.add('open');
            document.getElementById('sidebarOverlay').classList.add('active');
        } else {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.style.display = 'flex';
            const app = document.querySelector('.app');
            if (app) app.style.gridTemplateColumns = 'auto 1fr';
        }
        
        // Switch to Icons tab
        if (Icons.tabBtn) Icons.tabBtn.click();
        Toast.show('Select an icon for this point marker');
    },

    applyIcon(iconData) {
        if (!this.pendingPointId || !Editor.session) return false;
        
        const point = Editor.session.shapes.find(s => s.id === this.pendingPointId);
        if (point) {
            point.iconData = iconData;
            this.pendingPointId = null;
            Editor.draw();
            Editor.updateLayers();
            this.render();
            Library.saveCurrentCapture();
            Toast.show('Icon updated');
            
            // Close sidebar
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('sidebarOverlay').classList.remove('active');
            
            // Reopen notes panel
            setTimeout(() => this.toggle(true), 300);
            
            return true; // Handled
        }
        
        this.pendingPointId = null;
        return false;
    }
};

