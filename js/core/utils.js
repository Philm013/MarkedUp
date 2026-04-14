const Utils = {
    uid: () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
    
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = src;
        });
    },

    pointInRect(px, py, x, y, w, h) {
        const rx = w < 0 ? x + w : x;
        const ry = h < 0 ? y + h : y;
        return px >= rx && px <= rx + Math.abs(w) && py >= ry && py <= ry + Math.abs(h);
    },

    pointToLine(px, py, x1, y1, x2, y2) {
        const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
        const dot = A * C + B * D, lenSq = C * C + D * D;
        let t = lenSq !== 0 ? Math.max(0, Math.min(1, dot / lenSq)) : 0;
        return Math.hypot(px - (x1 + t * C), py - (y1 + t * D));
    },
    
    debounce(fn, ms) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    },

    /**
     * Calculates new bounds for a shape being resized
     * @param {Object} rs - Original bounds {x, y, w, h}
     * @param {string} handle - Handle being dragged ('nw', 'ne', 'sw', 'se')
     * @param {number} dx - Total mouse X delta
     * @param {number} dy - Total mouse Y delta
     * @param {boolean} proportional - Whether to maintain 1:1 aspect ratio
     * @returns {Object} New bounds {x, y, w, h}
     */
    resizeShape(rs, handle, dx, dy, proportional) {
        let x = rs.x, y = rs.y, w = rs.w, h = rs.h;

        if (proportional) {
            // Calculate outward delta based on handle direction
            let diff = 0;
            if (handle === 'nw') diff = (-dx - dy) / 2;
            else if (handle === 'ne') diff = (dx - dy) / 2;
            else if (handle === 'sw') diff = (-dx + dy) / 2;
            else if (handle === 'se') diff = (dx + dy) / 2;

            const newSize = Math.max(10, rs.w + diff);
            const actualDiff = newSize - rs.w;

            if (handle === 'nw') { x = rs.x - actualDiff; y = rs.y - actualDiff; }
            else if (handle === 'ne') { y = rs.y - actualDiff; }
            else if (handle === 'sw') { x = rs.x - actualDiff; }
            
            w = h = newSize;
        } else {
            // Free-form resize
            if (handle.includes('n')) { y = rs.y + dy; h = rs.h - dy; }
            if (handle.includes('s')) { h = rs.h + dy; }
            if (handle.includes('w')) { x = rs.x + dx; w = rs.w - dx; }
            if (handle.includes('e')) { w = rs.w + dx; }
        }

        return { x, y, w, h };
    }
};

