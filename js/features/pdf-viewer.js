const PDFViewer = {
    pdfDoc: null,
    pdfData: null,
    
    async loadFromUrl(url) {
        try {
            Toast.show('Loading PDF...');
            const response = await fetch(url);
            const blob = await response.blob();
            const base64 = await this.blobToBase64(blob);
            await this.openPageSelector(base64);
            Modal.close('pdfModal');
        } catch (e) {
            console.error('PDF Load Error:', e);
            Toast.show('Failed to load PDF URL', 'error');
        }
    },
    
    async loadFromFile(file) {
        try {
            Toast.show('Uploading PDF...');
            const base64 = await this.blobToBase64(file);
            await this.openPageSelector(base64);
            Modal.close('pdfModal');
        } catch (e) {
            console.error('PDF Upload Error:', e);
            Toast.show('Failed to upload PDF', 'error');
        }
    },
    
    async openPageSelector(base64) {
        this.pdfData = base64;
        const loadingTask = pdfjsLib.getDocument({ data: atob(base64.split(',')[1]) });
        this.pdfDoc = await loadingTask.promise;

        const totalPages = this.pdfDoc.numPages;
        const grid = document.getElementById('pdfPageGrid');
        const desc = document.getElementById('pdfPageModalDesc');
        const countEl = document.getElementById('pdfPageSelectionCount');

        desc.textContent = `${totalPages} page${totalPages !== 1 ? 's' : ''} found. Click pages to toggle selection.`;
        grid.innerHTML = '<div style="color:var(--text-dim);font-size:13px;padding:16px;text-align:center;">Generating previews…</div>';

        Modal.open('pdfPageModal');

        // Build page thumbnails
        grid.innerHTML = '';
        const selectedPages = new Set();

        const updateCount = () => {
            countEl.textContent = `${selectedPages.size} of ${totalPages} selected`;
            document.getElementById('pdfPageImportBtn').disabled = selectedPages.size === 0;
        };

        for (let i = 1; i <= totalPages; i++) {
            const pageNum = i;
            const thumb = await this.renderPageThumb(pageNum, 110);

            const card = document.createElement('div');
            card.style.cssText = `
                cursor:pointer; border-radius:8px; overflow:hidden;
                border:2px solid var(--border); position:relative;
                background:var(--bg-surface); user-select:none;
                transition: border-color .15s, box-shadow .15s;
            `;
            card.title = `Page ${pageNum}`;

            const img = document.createElement('img');
            img.src = thumb;
            img.style.cssText = 'width:100%; display:block;';
            img.alt = `Page ${pageNum}`;

            const label = document.createElement('div');
            label.textContent = `Page ${pageNum}`;
            label.style.cssText = `
                font-size:11px; text-align:center; padding:4px 0;
                color:var(--text-dim); background:var(--bg-panel);
            `;

            const check = document.createElement('div');
            check.style.cssText = `
                position:absolute; top:5px; right:5px;
                width:20px; height:20px; border-radius:50%;
                background:var(--accent,#6c63ff); color:#fff;
                display:none; align-items:center; justify-content:center;
                font-size:13px; font-weight:bold;
            `;
            check.textContent = '✓';

            card.appendChild(img);
            card.appendChild(label);
            card.appendChild(check);

            card.addEventListener('click', () => {
                if (selectedPages.has(pageNum)) {
                    selectedPages.delete(pageNum);
                    card.style.borderColor = 'var(--border)';
                    card.style.boxShadow = '';
                    check.style.display = 'none';
                } else {
                    selectedPages.add(pageNum);
                    card.style.borderColor = 'var(--accent, #6c63ff)';
                    card.style.boxShadow = '0 0 0 2px var(--accent, #6c63ff)';
                    check.style.display = 'flex';
                }
                updateCount();
            });

            grid.appendChild(card);
        }

        updateCount();

        // Select All / None buttons
        document.getElementById('pdfSelectAllPages').onclick = () => {
            grid.querySelectorAll('div[title]').forEach((card, idx) => {
                const pageNum = idx + 1;
                selectedPages.add(pageNum);
                card.style.borderColor = 'var(--accent, #6c63ff)';
                card.style.boxShadow = '0 0 0 2px var(--accent, #6c63ff)';
                card.querySelector('div[style*="position:absolute"]').style.display = 'flex';
            });
            updateCount();
        };

        document.getElementById('pdfSelectNonePages').onclick = () => {
            grid.querySelectorAll('div[title]').forEach(card => {
                card.style.borderColor = 'var(--border)';
                card.style.boxShadow = '';
                card.querySelector('div[style*="position:absolute"]').style.display = 'none';
            });
            selectedPages.clear();
            updateCount();
        };

        document.getElementById('pdfPageCancelBtn').onclick = () => Modal.close('pdfPageModal');

        document.getElementById('pdfPageImportBtn').onclick = async () => {
            if (selectedPages.size === 0) return;
            Modal.close('pdfPageModal');
            const pages = Array.from(selectedPages).sort((a, b) => a - b);
            Toast.show(`Importing ${pages.length} page${pages.length !== 1 ? 's' : ''}…`);
            for (const pageNum of pages) {
                const img = await this.renderPage(pageNum);
                await Library.addCapture(img, `PDF – Page ${pageNum}`, base64);
            }
            Toast.show(`${pages.length} page${pages.length !== 1 ? 's' : ''} imported`);
        };
    },
    
    async renderPage(pageNum) {
        const page = await this.pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); // High quality
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        return await Utils.loadImage(canvas.toDataURL());
    },

    async renderPageThumb(pageNum, width) {
        const page = await this.pdfDoc.getPage(pageNum);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = width / baseViewport.width;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        return canvas.toDataURL('image/jpeg', 0.75);
    },
    
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
};

