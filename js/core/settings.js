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
        editorToolbarPosition: 'floating', // 'floating' | 'top-docked' | 'bottom-docked' | 'left-docked' | 'right-docked'
        defaultView: 'markup', // 'library' or 'markup'
        favorites: [] // List of favorite asset objects
    },
    
    data: {},
    
    init() {
        const stored = localStorage.getItem('devmarkup_settings');
        this.data = stored ? { ...this.defaults, ...JSON.parse(stored) } : { ...this.defaults };
    },
    
    get(key) {
        return this.data[key];
    },
    
    set(key, value) {
        this.data[key] = value;
        this.save();
    },
    
    save() {
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
