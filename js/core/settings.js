const Settings = {
    defaults: {
        builtinIcons: true,
        iconifyEnabled: false,
        iconifySet: '',
        picsumEnabled: true,
        unsplashEnabled: false,
        unsplashKey: '',
        pexelsEnabled: false,
        pexelsKey: '',
        defaultToSelect: true,
        rightClickPan: true,
        defaultStrokeColor: '#ef4444',
        defaultStrokeWidth: 4,
        pinchSensitivity: 1.0,
        mobileToolbarPosition: 'bottom', // 'top', 'bottom', 'floating'
        captureMode: 'auto', // 'auto' | 'live' | 'node' | 'trueview'
        nodeCaptureEndpoint: '/api/capture',
        defaultView: 'browse', // 'browse' or 'markup'
        favorites: [] // List of favorite asset objects
    },
    
    data: {},
    
    init() {
        const stored = localStorage.getItem('devmarkup_settings');
        this.data = stored ? { ...this.defaults, ...JSON.parse(stored) } : { ...this.defaults };
    },
    
    get(key) {
        const val = this.data[key];
        if (key === 'captureMode') {
            console.log(`[Settings.get] captureMode = "${val}"`);
        }
        return val;
    },
    
    set(key, value) {
        if (key === 'captureMode') {
            console.log(`[Settings.set] Setting captureMode = "${value}" (was: "${this.data[key]}")`);
        }
        this.data[key] = value;
        this.save();
    },
    
    save() {
        console.log(`[Settings.save] Persisting to localStorage, captureMode = "${this.data.captureMode}"`);
        localStorage.setItem('devmarkup_settings', JSON.stringify(this.data));
    },
    
    getAll() {
        return { ...this.data };
    },
    
    setAll(newData) {
        this.data = { ...this.data, ...newData };
        this.save();
    }
};

