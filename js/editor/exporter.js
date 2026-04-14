const Exporter = {
    showDialog() {
        const selected = Library.getSelected();
        if (selected.length === 0) {
            Toast.show('No captures selected', 'error');
            return;
        }
        document.getElementById('exportInfo').textContent = `Export ${selected.length} capture(s).`;
        Modal.open('exportModal');
    },

    async run(format) {
        Modal.close('exportModal');
        const selected = Library.getSelected();
        if (selected.length === 0) return;
        
        Toast.show('Generating export...');
        
        try {
            // Ensure all selected sessions are loaded
            for (const session of selected) {
                await Library.ensureCaptureLoaded(session);
            }
            
            if (format === 'zip') {
                const zip = new JSZip();
                for (const session of selected) {
                    const blob = await this.render(session);
                    zip.file(session.title.replace(/[^a-z0-9]/gi, '_') + '.png', blob);
                }
                saveAs(await zip.generateAsync({ type: 'blob' }), 'markup-export.zip');
            } else {
                const { jsPDF } = window.jspdf;
                let pdf = null;
                
                for (let i = 0; i < selected.length; i++) {
                    const session = selected[i];
                    const blob = await this.render(session);
                    const imgData = await this.blobToDataURL(blob);
                    
                    const pointsWithNotes = (session.shapes || [])
                        .filter(s => s.type === 'point')
                        .sort((a, b) => (a.order || 0) - (b.order || 0));
                    const noteSectionHeight = pointsWithNotes.length > 0 ? 200 + (pointsWithNotes.length * 40) : 0;
                    const finalHeight = session.height + noteSectionHeight;
                    
                    const orientation = session.width > finalHeight ? 'l' : 'p';
                    if (!pdf) {
                        pdf = new jsPDF({ orientation, unit: 'px', format: [session.width, finalHeight] });
                    } else {
                        pdf.addPage([session.width, finalHeight], orientation);
                    }
                    
                    pdf.addImage(imgData, 'PNG', 0, 0, session.width, finalHeight);
                }
                pdf.save('markup-export.pdf');
            }
            Toast.show('Export complete!');
        } catch (e) {
            console.error(e);
            Toast.show('Export failed', 'error');
        }
    },

    async copyCombinedToClipboard() {
        const selected = Library.getSelected();
        if (selected.length === 0) {
            Toast.show('No captures selected', 'error');
            return;
        }

        Toast.show('Generating grid...');
        try {
            // Ensure images loaded
            for (const s of selected) await Library.ensureCaptureLoaded(s);

            const cols = Math.ceil(Math.sqrt(selected.length));
            const rows = Math.ceil(selected.length / cols);
            
            // Fixed max width for the combined image
            const maxWidth = 2400;
            const itemWidth = maxWidth / cols;
            
            // Calculate total height based on item aspect ratios
            let currentX = 0;
            let currentY = 0;
            let maxHeightInRow = 0;
            let totalHeight = 0;
            
            const layout = [];
            for (let i = 0; i < selected.length; i++) {
                const s = selected[i];
                const aspect = s.height / s.width;
                const h = itemWidth * aspect;
                
                if (i > 0 && i % cols === 0) {
                    currentX = 0;
                    currentY += maxHeightInRow;
                    maxHeightInRow = 0;
                }
                
                layout.push({ s, x: currentX, y: currentY, w: itemWidth, h: h });
                maxHeightInRow = Math.max(maxHeightInRow, h);
                currentX += itemWidth;
                totalHeight = Math.max(totalHeight, currentY + h);
            }

            const canvas = document.createElement('canvas');
            canvas.width = maxWidth;
            canvas.height = totalHeight;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            for (const item of layout) {
                const blob = await this.render(item.s);
                const img = await Utils.loadImage(URL.createObjectURL(blob));
                ctx.drawImage(img, item.x, item.y, item.w, item.h);
            }

            canvas.toBlob(async (blob) => {
                try {
                    const data = [new ClipboardItem({ [blob.type]: blob })];
                    await navigator.clipboard.write(data);
                    Toast.show('Combined grid copied!');
                } catch (err) {
                    console.error('Clipboard error:', err);
                    Toast.show('Copy failed', 'error');
                }
            }, 'image/png');

        } catch (e) {
            console.error(e);
            Toast.show('Grid generation failed', 'error');
        }
    },

    blobToDataURL(blob) {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    },

    async render(session) {
        const pointsWithNotes = (session.shapes || [])
            .filter(s => s.type === 'point')
            .sort((a, b) => (a.order || 0) - (b.order || 0));
            
        const noteSectionHeight = pointsWithNotes.length > 0 ? 200 + (pointsWithNotes.length * 40) : 0;
        
        const canvas = document.createElement('canvas');
        canvas.width = session.width;
        canvas.height = session.height + noteSectionHeight;
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.drawImage(session.img, 0, 0);
        
        for (const shape of session.shapes) {
            ctx.strokeStyle = shape.stroke || '#ef4444';
            ctx.fillStyle = shape.fill || 'transparent';
            ctx.lineWidth = shape.strokeWidth || 4;
            
            if (shape.type === 'rect') {
                if (shape.fill && shape.fill !== 'transparent') ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
                ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
            } else if (shape.type === 'point') {
                const drawSize = 30;
                const cx = shape.x + drawSize / 2;
                const cy = shape.y + drawSize / 2;
                if (shape.iconData) {
                    const img = await Icons.getIconImage(shape.iconData, shape.stroke || '#ef4444');
                    if (img) ctx.drawImage(img, shape.x, shape.y, drawSize, drawSize);
                } else {
                    ctx.shadowBlur = 4;
                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                    ctx.fillStyle = shape.stroke || '#ef4444';
                    ctx.beginPath();
                    ctx.arc(cx, cy, drawSize / 2, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.shadowBlur = 0;
                    ctx.shadowColor = 'transparent';
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;
                    
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.fillStyle = '#fff';
                    ctx.font = `bold ${drawSize/2}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const order = pointsWithNotes.indexOf(shape) + 1;
                    ctx.fillText(order, cx, cy);
                    ctx.textAlign = 'left';
                }
            } else if (shape.type === 'path') {
                if (!shape.points || shape.points.length < 2) continue;
                ctx.beginPath();
                ctx.moveTo(shape.points[0].x, shape.points[0].y);
                for (let i = 1; i < shape.points.length; i++) {
                    ctx.lineTo(shape.points[i].x, shape.points[i].y);
                }
                ctx.stroke();
            } else if (shape.type === 'circle') {
                ctx.beginPath();
                ctx.ellipse(shape.x + shape.w / 2, shape.y + shape.h / 2, Math.abs(shape.w / 2), Math.abs(shape.h / 2), 0, 0, Math.PI * 2);
                if (shape.fill && shape.fill !== 'transparent') ctx.fill();
                ctx.stroke();
            } else if (shape.type === 'text') {
                const fontSize = shape.fontSize || 24;
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.textBaseline = 'top';
                ctx.fillStyle = shape.stroke || '#ef4444';
                const width = shape.w || 200;
                
                const words = (shape.text || '').split(' ');
                let line = '';
                let ty = shape.y;
                for (let n = 0; n < words.length; n++) {
                    let testLine = line + words[n] + ' ';
                    if (ctx.measureText(testLine).width > width && n > 0) {
                        ctx.fillText(line, shape.x, ty);
                        line = words[n] + ' ';
                        ty += fontSize * 1.2;
                    } else {
                        line = testLine;
                    }
                }
                ctx.fillText(line, shape.x, ty);
            } else if (shape.type === 'emoji') {
                ctx.font = `${shape.size || 48}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
                ctx.textBaseline = 'top';
                ctx.fillText(shape.emoji, shape.x, shape.y);
            } else if (shape.type === 'icon' && shape.iconData) {
                const img = await Icons.getIconImage(shape.iconData, shape.stroke || '#ef4444');
                if (img) ctx.drawImage(img, shape.x, shape.y, shape.size || 48, shape.size || 48);
            } else if (shape.type === 'stockImage') {
                const img = Editor.loadedImages.get(shape.id);
                if (img) ctx.drawImage(img, shape.x, shape.y, shape.w, shape.h);
            } else if (shape.type === 'arrow') {
                const headLen = (shape.strokeWidth || 4) * 4;
                const angle = Math.atan2(shape.y2 - shape.y, shape.x2 - shape.x);
                ctx.beginPath();
                ctx.moveTo(shape.x, shape.y);
                ctx.lineTo(shape.x2, shape.y2);
                ctx.stroke();
                ctx.fillStyle = shape.stroke || '#ef4444';
                ctx.beginPath();
                ctx.moveTo(shape.x2, shape.y2);
                ctx.lineTo(shape.x2 - headLen * Math.cos(angle - Math.PI / 6), shape.y2 - headLen * Math.sin(angle - Math.PI / 6));
                ctx.lineTo(shape.x2 - headLen * Math.cos(angle + Math.PI / 6), shape.y2 - headLen * Math.sin(angle + Math.PI / 6));
                ctx.closePath();
                ctx.fill();
            } else if (shape.type === 'line') {
                ctx.beginPath();
                ctx.moveTo(shape.x, shape.y);
                ctx.lineTo(shape.x2, shape.y2);
                ctx.stroke();
            }
        }
        
        // Render Notes Section
        if (noteSectionHeight > 0) {
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(0, session.height, canvas.width, noteSectionHeight);
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, session.height);
            ctx.lineTo(canvas.width, session.height);
            ctx.stroke();
            
            ctx.fillStyle = '#333';
            ctx.font = 'bold 24px sans-serif';
            ctx.textBaseline = 'top';
            ctx.fillText('Notes & Annotations', 40, session.height + 40);
            
            let currentY = session.height + 80;
            for (const p of pointsWithNotes) {
                const i = pointsWithNotes.indexOf(p);
                const order = i + 1;
                const size = 24;
                const cx = 43 + size / 2;
                const cy = currentY + size / 2;

                if (p.iconData) {
                    const img = await Icons.getIconImage(p.iconData, p.stroke || '#ef4444');
                    if (img) ctx.drawImage(img, 43, currentY, size, size);
                } else {
                    ctx.fillStyle = p.stroke || '#ef4444';
                    ctx.beginPath();
                    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(order, cx, cy);
                }
                
                ctx.textBaseline = 'top';
                ctx.textAlign = 'left';
                ctx.fillStyle = '#444';
                ctx.font = '16px sans-serif';
                const linesHeight = this.wrapText(ctx, p.note || '(No note provided)', 80, currentY + 4, canvas.width - 120, 22);
                currentY += Math.max(40, linesHeight + 10);
            }
        }
        
        return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    },

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let totalHeight = 0;
        for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            if (ctx.measureText(testLine).width > maxWidth && n > 0) {
                ctx.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
                totalHeight += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, y);
        return totalHeight + lineHeight;
    }
};

