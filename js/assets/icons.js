const Icons = {
    builtinIcons: [
        { name: 'check', svg: '<polyline points="20 6 9 17 4 12"/>' },
        { name: 'x', svg: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' },
        { name: 'plus', svg: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>' },
        { name: 'minus', svg: '<line x1="5" y1="12" x2="19" y2="12"/>' },
        { name: 'star', svg: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' },
        { name: 'heart', svg: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>' },
        { name: 'alert-circle', svg: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' },
        { name: 'alert-triangle', svg: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
        { name: 'arrow-up', svg: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>' },
        { name: 'arrow-down', svg: '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>' },
        { name: 'arrow-left', svg: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>' },
        { name: 'arrow-right', svg: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>' },
        { name: 'user', svg: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
        { name: 'users', svg: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
        { name: 'settings', svg: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>' },
        { name: 'home', svg: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
        { name: 'mail', svg: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>' },
        { name: 'phone', svg: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>' },
        { name: 'camera', svg: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>' },
        { name: 'image', svg: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>' },
        { name: 'video', svg: '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>' },
        { name: 'trash', svg: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' },
        { name: 'edit', svg: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>' },
        { name: 'search', svg: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' },
        { name: 'lock', svg: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>' },
        { name: 'unlock', svg: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>' },
        { name: 'eye', svg: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' },
        { name: 'download', svg: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>' },
        { name: 'upload', svg: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>' },
        { name: 'share', svg: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>' },
        { name: 'link', svg: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>' },
        { name: 'globe', svg: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>' },
        { name: 'zap', svg: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>' },
        { name: 'clock', svg: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' },
        { name: 'calendar', svg: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
        { name: 'thumbs-up', svg: '<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>' },
        { name: 'thumbs-down', svg: '<path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>' },
        { name: 'flag', svg: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>' },
        { name: 'bookmark', svg: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>' },
        { name: 'bell', svg: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>' },
        { name: 'message-circle', svg: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>' },
        { name: 'send', svg: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>' },
        { name: 'file', svg: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>' },
        { name: 'folder', svg: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>' },
        { name: 'copy', svg: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' },
        { name: 'save', svg: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>' },
        { name: 'printer', svg: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>' },
        { name: 'refresh-cw', svg: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>' },
        { name: 'terminal', svg: '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>' },
        { name: 'code', svg: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>' },
        { name: 'database', svg: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>' },
        { name: 'server', svg: '<rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>' },
        { name: 'wifi', svg: '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>' },
        { name: 'battery', svg: '<rect x="1" y="6" width="18" height="12" rx="2" ry="2"/><line x1="23" y1="13" x2="23" y2="11"/>' },
        { name: 'cpu', svg: '<rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>' },
    ],
    
    icons: [],
    filtered: [],
    selected: null,
    loading: false,
    provider: 'builtin',
    imageCache: new Map(),

    init() {
        this.loadIcons();
    },
    
    async loadIcons() {
        this.loading = true;
        this.showLoading();
        
        if (Settings.get('iconifyEnabled')) {
            this.provider = 'iconify';
            await this.loadFromIconify();
        } else if (Settings.get('builtinIcons')) {
            this.provider = 'builtin';
            this.icons = [...this.builtinIcons];
        }
        
        this.filtered = [...this.icons];
        this.loading = false;
        this.render();
        this.updateApiStatus();
    },
    
    async loadFromIconify(query = '') {
        try {
            const prefix = Settings.get('iconifySet') || '';
            let url;
            
            if (query) {
                url = `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=60`;
                if (prefix) url += `&prefix=${prefix}`;
            } else {
                const set = prefix || 'mdi';
                url = `https://api.iconify.design/collection?prefix=${set}`;
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (query) {
                this.icons = data.icons ? data.icons.map(icon => ({
                    name: icon.split(':')[1] || icon,
                    prefix: icon.split(':')[0],
                    fullName: icon,
                    type: 'iconify'
                })) : [];
            } else {
                const iconNames = data.uncategorized || Object.values(data.categories || {}).flat().slice(0, 100);
                this.icons = iconNames.map(name => ({
                    name: name,
                    prefix: prefix || 'mdi',
                    fullName: `${prefix || 'mdi'}:${name}`,
                    type: 'iconify'
                }));
            }
        } catch (e) {
            console.error('Iconify API error:', e);
            this.icons = [...this.builtinIcons];
            this.provider = 'builtin';
        }
    },
    
    async getIconImage(icon, color = '#fafafa') {
        const colorHex = color.replace('#', '');
        const cacheKey = icon.type === 'iconify' 
            ? `iconify_${icon.fullName}_${colorHex}`
            : `builtin_${icon.name}_${colorHex}`;
        
        if (this.imageCache.has(cacheKey)) {
            return this.imageCache.get(cacheKey);
        }
        
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            if (icon.type === 'iconify') {
                img.src = `https://api.iconify.design/${icon.fullName}.svg?color=%23${colorHex}`;
            } else {
                const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#${colorHex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon.svg}</svg>`;
                img.src = 'data:image/svg+xml,' + encodeURIComponent(svgContent);
            }
            
            img.onload = () => {
                this.imageCache.set(cacheKey, img);
                resolve(img);
            };
            
            img.onerror = () => {
                resolve(null);
            };
        });
    },
    
    showLoading() {
        const grid = document.getElementById('iconsGrid');
        grid.innerHTML = '<div class="loading-spinner" style="grid-column:span 5;"><div class="spinner"></div>Loading icons...</div>';
    },
    
    updateApiStatus() {
        const status = document.getElementById('apiStatus');
        const badge = document.getElementById('providerBadge');
        
        if (Library.currentTab === 'icons') {
            status.style.display = 'flex';
            status.className = 'api-status connected';
            badge.textContent = this.provider === 'iconify' ? 'Iconify' : 'Built-in';
        }
    },

    search(query) {
        if (Settings.get('iconifyEnabled') && query.length >= 2) {
            this.loadFromIconify(query).then(() => {
                this.filtered = [...this.icons];
                this.render();
            });
        } else {
            if (!query) {
                this.filtered = [...this.icons];
            } else {
                const q = query.toLowerCase();
                this.filtered = this.icons.filter(i => i.name.toLowerCase().includes(q));
            }
            this.render();
        }
    },

    render() {
        const grid = document.getElementById('iconsGrid');
        grid.innerHTML = '';
        
        if (this.filtered.length === 0) {
            grid.innerHTML = '<div class="no-results" style="grid-column:span 5;">No icons found</div>';
            return;
        }
        
        this.filtered.forEach(icon => {
            const el = document.createElement('div');
            el.className = 'icon-item' + (this.selected === icon.name ? ' selected' : '');
            
            if (icon.type === 'iconify') {
                el.innerHTML = `
                    <img src="https://api.iconify.design/${icon.fullName}.svg?color=%23fafafa" alt="${icon.name}">
                    <span>${icon.name}</span>
                `;
            } else {
                el.innerHTML = `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon.svg}</svg>
                    <span>${icon.name}</span>
                `;
            }
            
            const star = document.createElement('div');
            star.className = 'favorite-btn' + (Library.isFavorite(icon) ? ' active' : '');
            star.innerHTML = '⭐';
            star.onclick = (e) => Library.toggleFavorite(icon, e);
            el.appendChild(star);

            el.addEventListener('click', () => this.select(icon));
            grid.appendChild(el);
        });

        if (this.provider === 'iconify' && this.filtered.length >= 60) {
            const more = document.createElement('button');
            more.className = 'btn btn-default btn-sm';
            more.style.gridColumn = '1/-1';
            more.style.margin = '10px 0';
            more.textContent = 'Load More Icons';
            more.onclick = () => this.loadMore();
            grid.appendChild(more);
        }
    },

    async loadMore() {
        if (this.loading) return;
        this.loading = true;
        
        // Iconify API search doesn't have offset easily but we can try to search again or suggest search
        Toast.show('Try a specific search query for more targeted results');
        this.loading = false;
    },

    select(icon) {
        this.selected = icon.name;
        
        // Check if we are in "Change Icon" mode for a point marker
        if (Notes.applyIcon(icon)) {
            this.selected = null;
            return;
        }

        Editor.pendingAsset = { type: 'icon', data: icon };
        Editor.setTool('image', true);
        
        // Close sidebar on mobile
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('active');
        
        Toast.show(`Icon "${icon.name}" selected - tap canvas to place`);
        Library.setTab('captures');
        this.render();
    }
};

