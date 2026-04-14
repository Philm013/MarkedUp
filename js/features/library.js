const Library = {
    collections: [],
    captures: [],
    activeCollectionId: null,
    currentTab: 'captures',
    viewMode: 'grid', // 'grid' or 'list'
    sortMode: 'newest',
    searchQuery: '',
    
    // Drag and Drop state
    draggedItem: null,
    longPressTimer: null,

    async init() {
        await DB.init();
        await this.loadData();
        this.setupEventListeners();
        
        // Ensure all components are initialized
        if (typeof Icons !== 'undefined') Icons.init();
        if (typeof Emojis !== 'undefined') Emojis.init();
        if (typeof Stock !== 'undefined') {
            Stock.init();
            Stock.load(true);
        }
        
        this.render();
    },

    async loadData() {
        try {
            const [collections, captures] = await Promise.all([
                DB.getAll(DB.STORES.SESSIONS),
                DB.getAll(DB.STORES.CAPTURES)
            ]);
            
            this.collections = collections.map(c => ({ ...c, type: 'collection', selected: false }));
            this.captures = captures.map(c => ({
                ...c,
                type: 'capture',
                img: null,
                loaded: false,
                selected: false
            }));
            
            this.sortItems();
        } catch (e) {
            console.error('Library: Failed to load data', e);
        }
    },

    setupEventListeners() {
        this.setupTabs();
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            const debouncedSearch = Utils.debounce((q) => {
                const tab = this.currentTab;
                if (tab === 'captures') {
                    this.searchQuery = q.toLowerCase();
                    this.render();
                } else if (tab === 'icons' && typeof Icons !== 'undefined') Icons.search(q);
                else if (tab === 'emojis' && typeof Emojis !== 'undefined') Emojis.search(q);
                else if (tab === 'stock' && typeof Stock !== 'undefined') Stock.search(q);
            }, 300);

            searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value.trim()));
        }

        const vGrid = document.getElementById('viewGridBtn');
        if (vGrid) vGrid.onclick = () => this.setViewMode('grid');
        const vList = document.getElementById('viewListBtn');
        if (vList) vList.onclick = () => this.setViewMode('list');

        const sortSel = document.getElementById('librarySort');
        if (sortSel) {
            sortSel.onchange = (e) => {
                this.sortMode = e.target.value;
                this.sortItems();
                this.render();
            };
        }

        const newCol = document.getElementById('newCollectionBtn');
        if (newCol) newCol.onclick = () => this.createNewCollection();
        
        const switcher = document.getElementById('sessionSwitcher');
        if (switcher) {
            switcher.addEventListener('change', (e) => {
                if (e.target.value === 'ROOT') this.navigateTo(null);
                else this.navigateTo(e.target.value);
            });
        }
        this.updateCollectionSwitcher();

        window.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                document.querySelectorAll('.dropdown-menu.active').forEach(m => m.classList.remove('active'));
            }
        });
    },

    setViewMode(mode) {
        this.viewMode = mode;
        const vGrid = document.getElementById('viewGridBtn');
        const vList = document.getElementById('viewListBtn');
        if (vGrid) vGrid.classList.toggle('active', mode === 'grid');
        if (vList) vList.classList.toggle('active', mode === 'list');
        
        const grid = document.getElementById('capturesGrid');
        if (grid) grid.className = `grid grid-sessions ${mode}-view`;
        this.render();
    },

    sortItems() {
        const sorter = (a, b) => {
            if (this.sortMode === 'newest') return b.createdAt - a.createdAt;
            if (this.sortMode === 'oldest') return a.createdAt - b.createdAt;
            if (this.sortMode === 'name') return (a.name || a.title || '').localeCompare(b.name || b.title || '');
            return 0;
        };
        this.collections.sort(sorter);
        this.captures.sort(sorter);
    },

    async createNewCollection() {
        Modal.prompt(
            'New Collection',
            'Create a new collection in your library.',
            'New Collection',
            { label: 'Collection name', placeholder: 'Enter collection name...', selectAll: true },
            async (value) => {
                const name = String(value || '').trim();
                if (!name) return;

                const collection = {
                    id: Utils.uid(),
                    name,
                    createdAt: Date.now(),
                    type: 'collection'
                };

                await DB.save(DB.STORES.SESSIONS, collection);
                this.collections.unshift(collection);
                this.updateCollectionSwitcher();
                this.render();
                Toast.show('Collection created');
            }
        );
    },

    async addCapture(img, title = 'Capture', pdfData = null) {
        const thumbData = await this.generateThumb(img);
        const capture = {
            id: Utils.uid(),
            sessionId: this.activeCollectionId,
            title: title,
            imageData: img.src,
            thumbData: thumbData,
            pdfData: pdfData,
            width: img.width,
            height: img.height,
            shapes: [],
            viewport: { x: 0, y: 0, scale: 1 },
            createdAt: Date.now(),
            type: 'capture'
        };
        
        await DB.save(DB.STORES.CAPTURES, capture);
        this.captures.unshift({ ...capture, img, loaded: true, selected: false });
        this.render();
        this.loadCapture(capture.id);
    },

    async generateThumb(img) {
        const canvas = document.createElement('canvas');
        canvas.width = 200; canvas.height = 140;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#18181b'; ctx.fillRect(0, 0, 200, 140);
        const scale = Math.min(200 / img.width, 140 / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (200 - w) / 2, (140 - h) / 2, w, h);
        return canvas.toDataURL('image/jpeg', 0.7);
    },

    async loadCapture(id) {
        const capture = this.captures.find(c => c.id === id);
        if (!capture) return;
        try {
            if (!capture.loaded || !capture.img) {
                capture.img = await Utils.loadImage(capture.imageData);
                capture.loaded = true;
            }
            App.setView('markup');
            Editor.load(capture);
            this.activeCaptureId = id;
            this.render();
        } catch (e) {
            console.error('Library: Load failed', e);
            Toast.show('Failed to load capture', 'error');
        }
    },

    async deleteItem(item) {
        Modal.confirm('Delete', `Delete this ${item.type === 'collection' ? 'collection and its contents' : 'capture'}?`, async () => {
            if (item.type === 'collection') {
                const childCaptures = this.captures.filter(c => c.sessionId === item.id);
                for (const c of childCaptures) await DB.delete(DB.STORES.CAPTURES, c.id);
                await DB.delete(DB.STORES.SESSIONS, item.id);
                this.collections = this.collections.filter(c => c.id !== item.id);
                this.captures = this.captures.filter(c => c.sessionId !== item.id);
            } else {
                await DB.delete(DB.STORES.CAPTURES, item.id);
                this.captures = this.captures.filter(c => c.id !== item.id);
            }
            this.render();
            Toast.show('Deleted');
        });
    },

    async renameItem(item) {
        const oldName = item.name || item.title;
        Modal.prompt(
            'Rename',
            `Update the ${item.type === 'collection' ? 'collection' : 'capture'} name.`,
            oldName,
            { label: 'Name', placeholder: 'Enter new name...', selectAll: true },
            async (value) => {
                const newName = String(value || '').trim();
                if (!newName || newName === oldName) return;

                if (item.type === 'collection') {
                    item.name = newName;
                    await DB.save(DB.STORES.SESSIONS, item);
                } else {
                    item.title = newName;
                    await DB.save(DB.STORES.CAPTURES, item);
                }
                this.render();
            }
        );
    },

    render(containerId = 'capturesGrid') {
        const grid = document.getElementById(containerId);
        const isLanding = containerId === 'landingSessionsGrid';
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (!isLanding) {
            const breadcrumbs = document.getElementById('libraryBreadcrumbs');
            if (this.activeCollectionId) {
                breadcrumbs.style.display = 'flex';
                const col = this.collections.find(c => c.id === this.activeCollectionId);
                breadcrumbs.innerHTML = `<button type="button" class="breadcrumb-item" id="libraryRootCrumb">Library</button><span class="breadcrumb-sep">/</span><span class="breadcrumb-item active">${col ? col.name : '...'}</span>`;
                const rootCrumb = document.getElementById('libraryRootCrumb');
                if (rootCrumb) rootCrumb.onclick = () => this.navigateTo(null);
            } else {
                breadcrumbs.style.display = 'none';
            }
        }

        const activeId = isLanding ? null : this.activeCollectionId;
        const items = [
            ...(activeId === null ? this.collections : []),
            ...this.captures.filter(c => c.sessionId === activeId)
        ].filter(item => (item.name || item.title || '').toLowerCase().includes(this.searchQuery));

        if (items.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-dim); opacity:0.5;">📂 Empty</div>`;
            return;
        }

        items.forEach(item => grid.appendChild(this.createCard(item, isLanding)));
        
        if (!isLanding && document.getElementById('landingPage').classList.contains('active')) {
            this.render('landingSessionsGrid');
        }
    },

    createCard(item, isLanding = false) {
        const card = document.createElement('div');
        const isCollection = item.type === 'collection';
        const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
        
        card.className = `session-card ${isLanding ? 'landing-card' : 'compact'} ${item.id === this.activeCaptureId ? 'active' : ''} ${item.selected ? 'selected' : ''}`;
        card.draggable = !isMobile;
        card.dataset.id = item.id;

        if (isLanding || item.type === 'capture') {
            const check = document.createElement('div');
            check.className = 'session-select';
            check.setAttribute('role', 'button');
            check.setAttribute('tabindex', '0');
            check.setAttribute('aria-label', `Select ${item.name || item.title}`);
            check.setAttribute('aria-pressed', item.selected ? 'true' : 'false');
            const toggleSelection = (e) => {
                e.stopPropagation();
                item.selected = !item.selected;
                this.render();
            };
            check.onclick = toggleSelection;
            check.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleSelection(e);
                }
            };
            card.appendChild(check);
        }

        const thumbCont = document.createElement('div');
        thumbCont.className = 'session-thumb-container';
        if (isCollection) {
            thumbCont.innerHTML = `<div class="folder-icon" style="display:flex; align-items:center; justify-content:center; height:100%; font-size: 32px;">📁</div>`;
        } else {
            const img = document.createElement('img');
            img.src = item.thumbData;
            img.className = 'session-thumb';
            thumbCont.appendChild(img);
        }
        card.appendChild(thumbCont);

        const info = document.createElement('div');
        info.className = 'session-info';
        info.innerHTML = `<div class="session-title">${item.name || item.title}</div>${isLanding ? `<div class="session-meta">${isCollection ? 'Collection' : 'Capture'}</div>` : ''}`;
        card.appendChild(info);

        const actions = document.createElement('div');
        actions.className = 'session-card-actions';
        const ren = document.createElement('button'); ren.className = 'session-btn'; ren.innerHTML = '✏️'; ren.onclick = (e) => { e.stopPropagation(); this.renameItem(item); };
        const del = document.createElement('button'); del.className = 'session-btn session-delete'; del.innerHTML = '×'; del.onclick = (e) => { e.stopPropagation(); this.deleteItem(item); };
        actions.appendChild(ren); actions.appendChild(del);
        card.appendChild(actions);

        card.onclick = () => {
            if (isCollection) { this.navigateTo(item.id); if (isLanding) App.setView('browse'); }
            else this.loadCapture(item.id);
        };

        this.setupDragEvents(card, item);
        return card;
    },

    navigateTo(colId) {
        this.activeCollectionId = colId;
        this.updateCollectionSwitcher();
        this.render();
    },

    updateCollectionSwitcher() {
        const switcher = document.getElementById('sessionSwitcher');
        if (!switcher) return;
        switcher.innerHTML = '<option value="ROOT">Library (Root)</option>';
        this.collections.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id; opt.textContent = c.name; opt.selected = c.id === this.activeCollectionId;
            switcher.appendChild(opt);
        });
    },

    setupDragEvents(el, item) {
        el.addEventListener('dragstart', (e) => {
            this.draggedItem = item;
            el.classList.add('dragging');
            e.dataTransfer.setData('text/plain', item.id);
        });

        el.addEventListener('dragend', () => {
            el.classList.remove('dragging');
            this.draggedItem = null;
            document.querySelectorAll('.session-card').forEach(c => c.classList.remove('drag-over', 'drop-after', 'drop-before'));
        });

        el.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!this.draggedItem || this.draggedItem.id === item.id) return;
            if (item.type === 'collection') el.classList.add('drag-over');
            else {
                const r = el.getBoundingClientRect();
                const isAfter = this.viewMode === 'grid' ? e.clientX > (r.left + r.width/2) : e.clientY > (r.top + r.height/2);
                el.classList.toggle('drop-after', isAfter);
                el.classList.toggle('drop-before', !isAfter);
            }
        });

        el.addEventListener('dragleave', () => el.classList.remove('drag-over', 'drop-after', 'drop-before'));

        el.addEventListener('drop', async (e) => {
            e.preventDefault();
            const isAfter = el.classList.contains('drop-after');
            el.classList.remove('drag-over', 'drop-after', 'drop-before');
            if (!this.draggedItem || this.draggedItem.id === item.id) return;

            if (this.draggedItem.type === 'capture' && item.type === 'collection') {
                this.draggedItem.sessionId = item.id;
                await DB.save(DB.STORES.CAPTURES, this.draggedItem);
            } else {
                const list = this.draggedItem.type === 'collection' ? this.collections : this.captures;
                const from = list.findIndex(x => x.id === this.draggedItem.id);
                list.splice(from, 1);
                const to = list.findIndex(x => x.id === item.id);
                list.splice(isAfter ? to + 1 : to, 0, this.draggedItem);
                this.draggedItem.createdAt = isAfter ? item.createdAt - 1 : item.createdAt + 1;
                await DB.save(this.draggedItem.type === 'collection' ? DB.STORES.SESSIONS : DB.STORES.CAPTURES, this.draggedItem);
            }
            this.render();
        });

        // Mobile Long-Press Move
        el.addEventListener('touchstart', () => {
            this.longPressTimer = setTimeout(() => {
                this.draggedItem = item;
                el.classList.add('long-pressing');
                Toast.show('Tapping a folder will move this item');
            }, 800);
        }, { passive: true });

        el.addEventListener('touchend', () => {
            clearTimeout(this.longPressTimer);
            if (this.draggedItem && this.draggedItem !== item && item.type === 'collection') {
                this.moveItemToCollection(this.draggedItem, item.id);
            }
            el.classList.remove('long-pressing');
        });
    },

    async moveItemToCollection(item, targetId) {
        item.sessionId = targetId;
        await DB.save(item.type === 'collection' ? DB.STORES.SESSIONS : DB.STORES.CAPTURES, item);
        this.draggedItem = null;
        this.render();
        Toast.show('Moved');
    },

    setupTabs() {
        const container = document.getElementById('tabsContainer');
        if (!container) return;
        container.innerHTML = '';
        const tabs = [
            { id: 'captures', icon: '📷', label: 'Library' },
            { id: 'icons', icon: '⚡', label: 'Icons' },
            { id: 'emojis', icon: '😀', label: 'Emoji' },
            { id: 'stock', icon: '🖼️', label: 'Stock' },
            { id: 'favorites', icon: '⭐', label: 'Favs' }
        ];
        tabs.forEach(tab => {
            const el = document.createElement('button');
            el.className = 'tab' + (tab.id === this.currentTab ? ' active' : '');
            el.dataset.tab = tab.id;
            el.innerHTML = `<span class="tab-icon">${tab.icon}</span>${tab.label}`;
            el.onclick = () => this.setTab(tab.id);
            container.appendChild(el);
            if (tab.id === 'icons') Icons.tabBtn = el;
        });
    },

    setTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        
        const grids = { captures: 'capturesGrid', icons: 'iconsGrid', emojis: 'emojisGrid', stock: 'stockGrid', favorites: 'favoritesGrid' };
        Object.keys(grids).forEach(k => {
            const el = document.getElementById(grids[k]);
            if (el) el.style.display = (k === tab) ? 'grid' : 'none';
        });
        
        const libToolbar = document.getElementById('libraryToolbar');
        if (libToolbar) libToolbar.style.display = tab === 'captures' ? 'flex' : 'none';
        
        const actBar = document.getElementById('actionsBar');
        if (actBar) actBar.style.display = (tab === 'captures') ? 'flex' : 'none';
        
        const chips = document.getElementById('categoryChips');
        if (chips) chips.style.display = tab === 'emojis' ? 'flex' : 'none';
        
        const stock = document.getElementById('stockProviders');
        if (stock) stock.style.display = tab === 'stock' ? 'flex' : 'none';
        
        if (tab === 'icons' && typeof Icons !== 'undefined') Icons.render();
        if (tab === 'emojis' && typeof Emojis !== 'undefined') Emojis.render();
        if (tab === 'stock' && typeof Stock !== 'undefined') Stock.render();
        if (tab === 'favorites') this.renderFavorites();
        
        if (typeof Icons !== 'undefined') Icons.updateApiStatus();
        
        const sInput = document.getElementById('searchInput');
        if (sInput) sInput.placeholder = `Search ${tab}...`;
    },

    getVisibleCaptures() {
        return this.captures.filter(c => {
            const inCollection = c.sessionId === this.activeCollectionId;
            const matchesSearch = (c.title || '').toLowerCase().includes(this.searchQuery);
            return inCollection && matchesSearch;
        });
    },

    selectAllCaptures() {
        this.getVisibleCaptures().forEach(c => c.selected = true);
        this.render();
        Toast.show('All visible captures selected');
    },

    clearSelection() {
        this.captures.forEach(c => c.selected = false);
        this.collections.forEach(c => c.selected = false);
        this.render();
        Toast.show('Selection cleared');
    },

    getSelected() { return this.captures.filter(c => c.selected); },
    async ensureCaptureLoaded(capture) {
        if (capture.loaded && capture.img) return true;
        capture.img = await Utils.loadImage(capture.imageData);
        capture.loaded = true;
        return true;
    },
    async saveCurrentCapture() {
        if (this.activeCaptureId && Editor.session) {
            const current = this.captures.find(c => c.id === this.activeCaptureId);
            if (current) {
                current.shapes = [...Editor.session.shapes];
                current.viewport = { ...Editor.viewport };
                await DB.save(DB.STORES.CAPTURES, current);
            }
        }
    },

    isFavorite(item) {
        const favs = Settings.get('favorites') || [];
        // Unique ID for assets: 
        // Icons: icon_${name}
        // Emojis: emoji_${char}
        // Stock: stock_${id}
        const id = this.getAssetId(item);
        return favs.some(f => f.favId === id);
    },

    getAssetId(item) {
        if (item.fullName) return `icon_${item.fullName}`;
        if (item.name && item.svg) return `icon_${item.name}`;
        if (typeof item === 'string') return `emoji_${item}`;
        if (item.thumb && item.full) return `stock_${item.id}`;
        return null;
    },

    toggleFavorite(item, e) {
        if (e) e.stopPropagation();
        let favs = Settings.get('favorites') || [];
        const id = this.getAssetId(item);
        const index = favs.findIndex(f => f.favId === id);
        
        if (index > -1) {
            favs.splice(index, 1);
            Toast.show('Removed from favorites');
        } else {
            const favItem = { favId: id, data: item };
            if (item.fullName || (item.name && item.svg)) favItem.favType = 'icon';
            else if (typeof item === 'string') favItem.favType = 'emoji';
            else favItem.favType = 'stock';
            
            favs.push(favItem);
            Toast.show('Added to favorites');
        }
        
        Settings.set('favorites', favs);
        
        // Re-render current tab to update stars
        if (this.currentTab === 'icons') Icons.render();
        else if (this.currentTab === 'emojis') Emojis.render();
        else if (this.currentTab === 'stock') Stock.render();
        else if (this.currentTab === 'favorites') this.renderFavorites();
    },

    renderFavorites() {
        const grid = document.getElementById('favoritesGrid');
        if (!grid) return;
        grid.innerHTML = '';
        const favs = Settings.get('favorites') || [];
        
        if (favs.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-dim); opacity:0.5;">⭐ No favorites yet</div>`;
            return;
        }

        favs.forEach(fav => {
            const item = fav.data;
            let el;
            if (fav.favType === 'icon') {
                el = document.createElement('div');
                el.className = 'icon-item selected';
                if (item.type === 'iconify') {
                    el.innerHTML = `<img src="https://api.iconify.design/${item.fullName}.svg?color=%23fafafa" alt="${item.name}"><span>${item.name}</span>`;
                } else {
                    el.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${item.svg}</svg><span>${item.name}</span>`;
                }
                el.onclick = () => Icons.select(item);
            } else if (fav.favType === 'emoji') {
                el = document.createElement('div');
                el.className = 'emoji-item selected';
                el.textContent = item;
                el.onclick = () => Emojis.select(item);
            } else {
                el = document.createElement('div');
                el.className = 'image-item';
                el.innerHTML = `<img src="${item.thumb}" alt="${item.alt}" crossorigin="anonymous"><div class="image-overlay">${item.author}</div>`;
                el.onclick = () => Stock.addToCanvas(item);
            }
            
            const star = document.createElement('div');
            star.className = 'favorite-btn active';
            star.innerHTML = '⭐';
            star.onclick = (e) => this.toggleFavorite(item, e);
            el.appendChild(star);
            grid.appendChild(el);
        });
    }
};
