const DB = {
    db: null,
    NAME: 'DevMarkupPro',
    VERSION: 5,
    STORES: {
        SESSIONS: 'sessions_v2',
        CAPTURES: 'captures_v2'
    },

    async init() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.NAME, this.VERSION);
            req.onerror = () => reject(req.error);
            req.onsuccess = () => { this.db = req.result; resolve(); };
            req.onupgradeneeded = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.STORES.SESSIONS)) {
                    db.createObjectStore(this.STORES.SESSIONS, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(this.STORES.CAPTURES)) {
                    const store = db.createObjectStore(this.STORES.CAPTURES, { keyPath: 'id' });
                    store.createIndex('sessionId', 'sessionId', { unique: false });
                }
            };
        });
    },

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const req = tx.objectStore(storeName).getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
    },

    async getCapturesForSession(sessionId) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.STORES.CAPTURES, 'readonly');
            const index = tx.objectStore(this.STORES.CAPTURES).index('sessionId');
            const req = index.getAll(sessionId);
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
    },

    async save(storeName, data) {
        // Strip non-clonable properties if they exist
        const persistable = { ...data };
        if (persistable.img) delete persistable.img;
        if (persistable.loaded) delete persistable.loaded;

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const req = tx.objectStore(storeName).put(persistable);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    },

    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const req = tx.objectStore(storeName).delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    },

    async countStore(storeName) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const req = tx.objectStore(storeName).count();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async countIndex(storeName, indexName, key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const req = tx.objectStore(storeName).index(indexName).count(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async getLatestCaptureForSession(sessionId) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.STORES.CAPTURES, 'readonly');
            const index = tx.objectStore(this.STORES.CAPTURES).index('sessionId');
            const req = index.openCursor(IDBKeyRange.only(sessionId), 'prev');
            req.onsuccess = () => resolve(req.result ? req.result.value : null);
            req.onerror = () => reject(req.error);
        });
    },

    async getTotalShapesCount() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.STORES.CAPTURES, 'readonly');
            const req = tx.objectStore(this.STORES.CAPTURES).openCursor();
            let count = 0;
            req.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    count += (cursor.value.shapes || []).length;
                    cursor.continue();
                } else {
                    resolve(count);
                }
            };
            req.onerror = () => reject(req.error);
        });
    },

    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const req = tx.objectStore(storeName).clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }
};

