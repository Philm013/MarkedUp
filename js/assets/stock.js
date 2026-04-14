const Stock = {
    images: [],
    page: 1,
    loading: false,
    query: '',
    provider: 'picsum',

    init() {
        this.setupProviderSelector();
    },

    setupProviderSelector() {
        document.querySelectorAll('#stockProviders .chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const provider = chip.dataset.provider;
                if (provider === 'unsplash' && (!Settings.get('unsplashEnabled') || !Settings.get('unsplashKey'))) {
                    Toast.show('Unsplash is not enabled in settings', 'error');
                    return;
                }
                if (provider === 'pexels' && (!Settings.get('pexelsEnabled') || !Settings.get('pexelsKey'))) {
                    Toast.show('Pexels is not enabled in settings', 'error');
                    return;
                }
                
                document.querySelectorAll('#stockProviders .chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.setProvider(provider);
            });
        });
    },

    setProvider(provider) {
        this.provider = provider;
        this.load(true);
    },

    async load(reset = false) {
        if (this.loading) return;
        if (reset) {
            this.page = 1;
            this.images = [];
        }
        
        this.loading = true;
        this.showLoading();
        
        if (this.provider === 'unsplash') {
            await this.loadFromUnsplash();
        } else if (this.provider === 'pexels') {
            await this.loadFromPexels();
        } else {
            await this.loadFromPicsum();
        }
        
        this.loading = false;
        this.render();
        this.updateApiStatus();
    },
    
    async loadFromUnsplash() {
        try {
            const key = Settings.get('unsplashKey');
            let url = `https://api.unsplash.com/photos?page=${this.page}&per_page=20&client_id=${key}`;
            
            if (this.query) {
                url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(this.query)}&page=${this.page}&per_page=20&client_id=${key}`;
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            const photos = this.query ? data.results : data;
            const newImages = photos.map(photo => ({
                id: photo.id,
                thumb: photo.urls.small,
                full: photo.urls.regular,
                alt: photo.alt_description || 'Unsplash photo',
                author: photo.user?.name || 'Unknown',
                provider: 'unsplash'
            }));
            
            this.images.push(...newImages);
            this.page++;
        } catch (e) {
            console.error('Unsplash API error:', e);
            Toast.show('Unsplash API error', 'error');
            await this.loadFromPicsum();
        }
    },
    
    async loadFromPexels() {
        try {
            const key = Settings.get('pexelsKey');
            let url = `https://api.pexels.com/v1/curated?page=${this.page}&per_page=20`;
            
            if (this.query) {
                url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(this.query)}&page=${this.page}&per_page=20`;
            }
            
            const response = await fetch(url, {
                headers: { 'Authorization': key }
            });
            const data = await response.json();
            
            const newImages = data.photos.map(photo => ({
                id: photo.id,
                thumb: photo.src.medium,
                full: photo.src.large,
                alt: photo.alt || 'Pexels photo',
                author: photo.photographer || 'Unknown',
                provider: 'pexels'
            }));
            
            this.images.push(...newImages);
            this.page++;
        } catch (e) {
            console.error('Pexels API error:', e);
            Toast.show('Pexels API error', 'error');
            await this.loadFromPicsum();
        }
    },
    
    async loadFromPicsum() {
        const newImages = [];
        for (let i = 0; i < 20; i++) {
            const id = this.page * 20 + i + 10;
            newImages.push({
                id: id,
                thumb: `https://picsum.photos/id/${id}/400/300`,
                full: `https://picsum.photos/id/${id}/1200/800`,
                alt: `Photo ${id}`,
                author: 'Lorem Picsum',
                provider: 'picsum'
            });
        }
        this.images.push(...newImages);
        this.page++;
    },
    
    showLoading() {
        if (this.images.length === 0) {
            const grid = document.getElementById('stockGrid');
            grid.innerHTML = '<div class="loading-spinner" style="grid-column:1/-1;"><div class="spinner"></div>Loading images...</div>';
        }
    },
    
    updateApiStatus() {
        const status = document.getElementById('apiStatus');
        const badge = document.getElementById('providerBadge');
        
        if (Library.currentTab === 'stock') {
            status.style.display = 'flex';
            status.className = 'api-status connected';
            
            const providers = { unsplash: 'Unsplash', pexels: 'Pexels', picsum: 'Picsum' };
            badge.textContent = providers[this.provider] || 'Unknown';
        }
    },
    
    search(query) {
        this.query = query;
        this.load(true);
    },

    render() {
        const grid = document.getElementById('stockGrid');
        grid.innerHTML = '';
        
        if (this.images.length === 0) {
            grid.innerHTML = '<div class="no-results" style="grid-column:1/-1;">No images found</div>';
            return;
        }
        
        this.images.forEach(img => {
            const el = document.createElement('div');
            el.className = 'image-item';
            el.innerHTML = `
                <img src="${img.thumb}" alt="${img.alt}" crossorigin="anonymous" onerror="this.parentElement.style.display='none'">
                <div class="image-overlay">${img.author}</div>
            `;

            const star = document.createElement('div');
            star.className = 'favorite-btn' + (Library.isFavorite(img) ? ' active' : '');
            star.innerHTML = '⭐';
            star.onclick = (e) => Library.toggleFavorite(img, e);
            el.appendChild(star);

            el.addEventListener('click', () => this.addToCanvas(img));
            grid.appendChild(el);
        });
        
        const trigger = document.createElement('div');
        trigger.className = 'loading-spinner';
        trigger.style.gridColumn = '1/-1';
        trigger.innerHTML = '<div class="spinner"></div>';
        grid.appendChild(trigger);
        
        // Add manual load more button for better UX
        const moreBtn = document.createElement('button');
        moreBtn.className = 'btn btn-default btn-sm';
        moreBtn.style.gridColumn = '1/-1';
        moreBtn.style.margin = '10px 0';
        moreBtn.textContent = 'Load More Images';
        moreBtn.onclick = () => this.load();
        grid.appendChild(moreBtn);
        
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && !this.loading) {
                observer.disconnect();
                this.load();
            }
        });
        observer.observe(trigger);
    },

    async addToCanvas(img) {
        Toast.show('Loading image...');
        try {
            const image = await Utils.loadImage(img.full);
            if (Editor.session) {
                const shape = {
                    id: Utils.uid(),
                    type: 'stockImage',
                    imgSrc: img.full,
                    x: 50,
                    y: 50,
                    w: Math.min(400, image.width),
                    h: Math.min(300, image.height),
                    selected: false
                };
                Editor.loadedImages.set(shape.id, image);
                Editor.session.shapes.push(shape);
                Editor.draw();
                Editor.updateLayers();
                
                // Close sidebar on mobile
                document.getElementById('sidebar').classList.remove('open');
                document.getElementById('sidebarOverlay').classList.remove('active');
                
                Library.setTab('captures');
                Toast.show('Image added!');
            } else {
                Library.addCapture(image, 'Stock Image');
                Library.setTab('captures');
            }
        } catch (e) {
            Toast.show('Failed to load image', 'error');
        }
    }
};

