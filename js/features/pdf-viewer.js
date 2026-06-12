const PDFViewer = {
    defaultName: 'PDF Capture',
    pdfDoc: null,
    pdfData: null,
    pdfName: '',
    preparedSourceKey: null,
    selectionMode: 'all',
    
    getSourceKey(url, file) {
        if (file) return `file:${file.name}:${file.size}:${file.lastModified}`;
        return `url:${String(url || '').trim()}`;
    },

    isPreparedFor(url, file) {
        return Boolean(this.pdfDoc) && this.preparedSourceKey === this.getSourceKey(url, file);
    },

    async handlePrimaryAction({ url, file }) {
        if (!this.isPreparedFor(url, file)) {
            await this.prepareSource({ url, file });
            return;
        }

        await this.importSelectedPages();
    },

    async prepareSource({ url, file }) {
        const sourceKey = this.getSourceKey(url, file);
        const fromUrl = Boolean(url);

        Toast.show(fromUrl ? 'Loading PDF...' : 'Reading PDF...');

        const base64 = fromUrl
            ? await this.fetchBase64FromUrl(url)
            : await this.blobToBase64(file);

        this.pdfData = base64;
        this.pdfName = this.getPdfName(url, file);
        this.preparedSourceKey = sourceKey;

        const loadingTask = pdfjsLib.getDocument({ data: this.base64ToUint8Array(base64) });
        this.pdfDoc = await loadingTask.promise;
        this.renderSelectionUI();

        const pageCount = this.pdfDoc.numPages;
        const pageLabel = `${pageCount} page${pageCount === 1 ? '' : 's'}`;
        Toast.show(`PDF ready — ${pageLabel} detected`);
    },

    async importSelectedPages() {
        if (!this.pdfDoc || !this.pdfData) {
            throw new Error('Load a PDF before importing pages');
        }

        const pages = this.getSelectedPages();
        if (pages.length === 0) {
            throw new Error('Select at least one page to import');
        }

        const countLabel = `${pages.length} page${pages.length === 1 ? '' : 's'}`;
        Toast.show(`Importing ${countLabel}...`);

        let firstCaptureId = null;
        for (const pageNum of pages) {
            const img = await this.renderPage(pageNum);
            const capture = await Library.addCapture(
                img,
                `${this.pdfName} · Page ${pageNum}`,
                this.pdfData,
                { activate: false, render: false }
            );
            if (!firstCaptureId) firstCaptureId = capture.id;
        }

        Library.render();
        if (firstCaptureId) await Library.loadCapture(firstCaptureId);

        Modal.close('pdfModal');
        this.resetModalState();
        Toast.show(`Imported ${countLabel}`);
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

    renderSelectionUI() {
        const panel = document.getElementById('pdfSelectionPanel');
        const count = document.getElementById('pdfPageCount');
        const loadBtn = document.getElementById('pdfLoadBtn');
        const name = document.getElementById('pdfFileSummary');
        const rangeInput = document.getElementById('pdfPageRangeInput');

        if (panel) panel.hidden = false;
        if (count) {
            const totalPages = this.pdfDoc?.numPages || 0;
            count.textContent = `${totalPages} page${totalPages === 1 ? '' : 's'} available`;
        }
        if (name) name.textContent = this.pdfName;
        if (loadBtn) loadBtn.textContent = 'Import Selected Pages';
        if (rangeInput && !rangeInput.value.trim()) rangeInput.value = '';

        this.setSelectionMode('all');
        this.updateCustomSelectionPreview();
    },

    setSelectionMode(mode) {
        this.selectionMode = mode === 'custom' ? 'custom' : 'all';

        document.querySelectorAll('[data-pdf-page-mode]').forEach(btn => {
            const active = btn.dataset.pdfPageMode === this.selectionMode;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });

        const customGroup = document.getElementById('pdfCustomPagesGroup');
        const rangeInput = document.getElementById('pdfPageRangeInput');
        if (customGroup) customGroup.hidden = this.selectionMode !== 'custom';
        if (rangeInput) {
            rangeInput.disabled = this.selectionMode !== 'custom';
            if (this.selectionMode === 'custom') rangeInput.focus();
        }

        this.updateCustomSelectionPreview();
    },

    updateCustomSelectionPreview() {
        const status = document.getElementById('pdfPageRangeStatus');
        if (!status) return;

        const totalPages = this.pdfDoc?.numPages || 0;
        if (!totalPages) {
            status.textContent = '';
            status.dataset.state = '';
            return;
        }

        if (this.selectionMode === 'all') {
            status.textContent = `All ${totalPages} page${totalPages === 1 ? '' : 's'} will be imported.`;
            status.dataset.state = 'valid';
            return;
        }

        const rangeInput = document.getElementById('pdfPageRangeInput');
        const rawValue = String(rangeInput?.value || '').trim();
        if (!rawValue) {
            status.textContent = `Use page numbers and ranges between 1 and ${totalPages} (for example: 1-3, 5, 8-10).`;
            status.dataset.state = '';
            return;
        }

        try {
            const pages = this.parsePageRanges(rawValue, totalPages);
            status.textContent = `${pages.length} page${pages.length === 1 ? '' : 's'} selected: ${pages.join(', ')}`;
            status.dataset.state = 'valid';
        } catch (error) {
            status.textContent = error.message;
            status.dataset.state = 'error';
        }
    },

    getSelectedPages() {
        const totalPages = this.pdfDoc?.numPages || 0;
        if (this.selectionMode !== 'custom') {
            return Array.from({ length: totalPages }, (_, index) => index + 1);
        }

        const rangeInput = document.getElementById('pdfPageRangeInput');
        return this.parsePageRanges(String(rangeInput?.value || ''), totalPages);
    },

    parsePageRanges(rawValue, totalPages) {
        const raw = String(rawValue || '').trim();
        if (!raw) {
            throw new Error('Enter at least one page number or range');
        }

        const pages = new Set();
        raw.split(',').forEach(part => {
            const token = part.trim();
            if (!token) return;

            const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
            if (rangeMatch) {
                const start = Number(rangeMatch[1]);
                const end = Number(rangeMatch[2]);
                if (start > end) {
                    throw new Error(`Invalid range "${token}"`);
                }
                if (start < 1 || end > totalPages) {
                    throw new Error(`Pages must be between 1 and ${totalPages}`);
                }
                for (let page = start; page <= end; page += 1) pages.add(page);
                return;
            }

            if (!/^\d+$/.test(token)) {
                throw new Error(`Invalid page token "${token}"`);
            }

            const pageNum = Number(token);
            if (pageNum < 1 || pageNum > totalPages) {
                throw new Error(`Pages must be between 1 and ${totalPages}`);
            }
            pages.add(pageNum);
        });

        return Array.from(pages).sort((a, b) => a - b);
    },

    invalidatePreparedDocument() {
        this.pdfDoc = null;
        this.pdfData = null;
        this.pdfName = this.defaultName;
        this.preparedSourceKey = null;
        this.selectionMode = 'all';

        const panel = document.getElementById('pdfSelectionPanel');
        const count = document.getElementById('pdfPageCount');
        const name = document.getElementById('pdfFileSummary');
        const rangeInput = document.getElementById('pdfPageRangeInput');
        const customGroup = document.getElementById('pdfCustomPagesGroup');
        const status = document.getElementById('pdfPageRangeStatus');
        const loadBtn = document.getElementById('pdfLoadBtn');

        if (panel) panel.hidden = true;
        if (count) count.textContent = '';
        if (name) name.textContent = '';
        if (rangeInput) {
            rangeInput.value = '';
            rangeInput.disabled = true;
        }
        if (customGroup) customGroup.hidden = true;
        if (status) {
            status.textContent = '';
            status.dataset.state = '';
        }
        if (loadBtn) loadBtn.textContent = 'Review Pages';

        document.querySelectorAll('[data-pdf-page-mode]').forEach(btn => {
            const active = btn.dataset.pdfPageMode === 'all';
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    },

    resetModalState() {
        this.invalidatePreparedDocument();

        const urlInput = document.getElementById('pdfUrlInput');
        const fileInput = document.getElementById('pdfFileInput');
        if (urlInput) urlInput.value = '';
        if (fileInput) fileInput.value = '';
    },

    async fetchBase64FromUrl(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch PDF (${response.status})`);
        }
        const blob = await response.blob();
        return this.blobToBase64(blob);
    },

    getPdfName(url, file) {
        const rawName = file?.name || this.extractNameFromUrl(url);

        const cleanName = String(rawName || '').replace(/\.pdf$/i, '').trim();
        return cleanName || this.defaultName;
    },

    extractNameFromUrl(url) {
        try {
            const pathname = new URL(url).pathname;
            return decodeURIComponent(pathname.split('/').pop() || '');
        } catch (_error) {
            return '';
        }
    },

    base64ToUint8Array(base64) {
        const encoded = String(base64 || '').split(',').pop() || '';
        const binary = atob(encoded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
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
