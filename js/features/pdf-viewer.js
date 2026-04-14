const PDFViewer = {
    pdfDoc: null,
    pdfData: null,
    
    async loadFromUrl(url) {
        try {
            Toast.show('Loading PDF...');
            const response = await fetch(url);
            const blob = await response.blob();
            const base64 = await this.blobToBase64(blob);
            await this.loadFromBase64(base64);
            Modal.close('pdfModal');
            Toast.show('PDF Loaded');
        } catch (e) {
            console.error('PDF Load Error:', e);
            Toast.show('Failed to load PDF URL', 'error');
        }
    },
    
    async loadFromFile(file) {
        try {
            Toast.show('Uploading PDF...');
            const base64 = await this.blobToBase64(file);
            await this.loadFromBase64(base64);
            Modal.close('pdfModal');
            Toast.show('PDF Uploaded');
        } catch (e) {
            console.error('PDF Upload Error:', e);
            Toast.show('Failed to upload PDF', 'error');
        }
    },
    
    async loadFromBase64(base64) {
        this.pdfData = base64;
        const loadingTask = pdfjsLib.getDocument({ data: atob(base64.split(',')[1]) });
        this.pdfDoc = await loadingTask.promise;
        
        // Render first page as the "capture"
        const img = await this.renderPage(1);
        Library.addCapture(img, 'PDF Capture', base64);
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
    
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
};

