const Browser = {
    _targetUrl: '',
    _scroll: { x: 0, y: 0 },
    _trueViewStream: null,
    _trueViewVideo: null,
    _trueViewTrack: null,

    unwrapProxyUrl(input) {
        const raw = String(input || '').trim();
        if (!raw) return raw;

        try {
            const u = new URL(raw, window.location.origin);
            if (u.pathname === '/proxy' || u.pathname === '/proxy/') {
                const nested = u.searchParams.get('url');
                if (nested && /^https?:\/\//i.test(nested)) return nested;
            }
        } catch (_e) {
            // Keep original value when parsing fails.
        }

        return raw;
    },

    getServiceOrigin() {
        // If opened as file://, route requests to the local Node service explicitly.
        return window.location.protocol === 'file:'
            ? 'http://127.0.0.1:4777'
            : '';
    },

    async captureLiveIframeState(isFullPage) {
        if (typeof window.html2canvas !== 'function') return null;

        const frame = document.getElementById('webFrame');
        if (!frame || !frame.contentWindow || !frame.contentDocument) return null;

        const frameWin = frame.contentWindow;
        const frameDoc = frame.contentDocument;
        if (!frameDoc.documentElement || !frameDoc.body) return null;

        // If nothing is loaded yet, do not attempt a live-state capture.
        const frameHref = String(frameWin.location && frameWin.location.href || '').trim();
        if (!frameHref || frameHref === 'about:blank') return null;

        const rect = frame.getBoundingClientRect();
        const viewportWidth = Math.max(320, Math.round(rect.width || frame.clientWidth || 1280));
        const viewportHeight = Math.max(240, Math.round(rect.height || frame.clientHeight || 720));
        const scale = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

        const opts = {
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff',
            scale
        };

        if (isFullPage) {
            const fullW = Math.min(12000, Math.max(viewportWidth, Math.round(frameDoc.documentElement.scrollWidth || viewportWidth)));
            const fullH = Math.min(16000, Math.max(viewportHeight, Math.round(frameDoc.documentElement.scrollHeight || viewportHeight)));
            opts.width = fullW;
            opts.height = fullH;
            opts.windowWidth = fullW;
            opts.windowHeight = fullH;
            opts.x = 0;
            opts.y = 0;
            opts.scrollX = 0;
            opts.scrollY = 0;
        } else {
            const sx = Math.max(0, Math.round(frameWin.scrollX || 0));
            const sy = Math.max(0, Math.round(frameWin.scrollY || 0));
            opts.width = viewportWidth;
            opts.height = viewportHeight;
            opts.windowWidth = Math.max(viewportWidth, Math.round(frameWin.innerWidth || viewportWidth));
            opts.windowHeight = Math.max(viewportHeight, Math.round(frameWin.innerHeight || viewportHeight));
            opts.x = sx;
            opts.y = sy;
            opts.scrollX = sx;
            opts.scrollY = sy;
        }

        const canvas = await window.html2canvas(frameDoc.documentElement, opts);
        if (!canvas) return null;

        const imageDataUrl = canvas.toDataURL('image/png');
        const img = await Utils.loadImage(imageDataUrl);
        const effectiveUrl = this.unwrapProxyUrl(frameHref) || this._targetUrl;

        return {
            img,
            title: isFullPage ? 'Live Full Capture' : 'Live Capture',
            effectiveUrl
        };
    },

    async captureViaNode(currentUrl, isFullPage) {
        const captureProfile = this.getCaptureProfile();
        Toast.show('Capturing with local Playwright service...');

        const captureEndpoint = Settings.get('nodeCaptureEndpoint') || (this.getServiceOrigin() + '/api/capture');
        const res = await fetch(captureEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: currentUrl,
                fullPage: !!isFullPage,
                viewport: captureProfile.viewport,
                profile: captureProfile
            })
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || `Capture request failed (${res.status})`);
        }

        const data = await res.json();
        if (!data || !data.imageDataUrl) {
            throw new Error('Playwright service returned an invalid response');
        }

        const img = await Utils.loadImage(data.imageDataUrl);
        await Library.addCapture(img, data.title || (isFullPage ? 'Full Capture' : 'Web Capture'));
        Toast.show('Capture success');
    },

    _isTrueViewTrackAlive() {
        return Boolean(this._trueViewTrack && this._trueViewTrack.readyState === 'live');
    },

    async _ensureTrueViewSession() {
        if (this._isTrueViewTrackAlive() && this._trueViewVideo) {
            return;
        }

        this.stopTrueViewSession();

        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
            throw new Error('True View capture is not supported in this browser');
        }

        Toast.show('Select "This Tab" once. Future true-view captures reuse the same session.');

        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                displaySurface: 'browser',
                preferCurrentTab: true,
                selfBrowserSurface: 'include',
                cursor: 'never'
            },
            audio: false
        });

        const track = stream.getVideoTracks()[0];
        if (!track) {
            stream.getTracks().forEach(t => t.stop());
            throw new Error('No video track returned by display capture');
        }

        const captureSettings = typeof track.getSettings === 'function' ? track.getSettings() : {};
        if (captureSettings.displaySurface && captureSettings.displaySurface !== 'browser') {
            stream.getTracks().forEach(t => t.stop());
            throw new Error('Please choose "This Tab" in the share picker');
        }

        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;

        await new Promise((resolve, reject) => {
            const onMeta = () => resolve();
            const onErr = () => reject(new Error('Unable to initialize display capture stream'));
            video.addEventListener('loadedmetadata', onMeta, { once: true });
            video.addEventListener('error', onErr, { once: true });
        });

        await video.play();

        track.addEventListener('ended', () => {
            this.stopTrueViewSession();
            Toast.show('True-view sharing stopped. Capture will ask again next time.', 'error');
        }, { once: true });

        this._trueViewStream = stream;
        this._trueViewVideo = video;
        this._trueViewTrack = track;
    },

    stopTrueViewSession() {
        try {
            if (this._trueViewVideo) {
                this._trueViewVideo.pause();
                this._trueViewVideo.srcObject = null;
            }
        } catch (_e) {}

        if (this._trueViewStream) {
            this._trueViewStream.getTracks().forEach(t => t.stop());
        }

        this._trueViewStream = null;
        this._trueViewVideo = null;
        this._trueViewTrack = null;
    },

    async captureTrueView() {
        const frame = document.getElementById('webFrame');
        if (!frame) throw new Error('Capture frame not available');

        await this._ensureTrueViewSession();

        const video = this._trueViewVideo;
        await new Promise(r => setTimeout(r, 200));

        const vw = Math.max(1, video.videoWidth || 0);
        const vh = Math.max(1, video.videoHeight || 0);
        if (!vw || !vh) throw new Error('Display stream has no video dimensions');

        const rect = frame.getBoundingClientRect();
        const viewportW = Math.max(
            1,
            Math.round(
                (window.visualViewport && window.visualViewport.width)
                || document.documentElement.clientWidth
                || window.innerWidth
                || 1
            )
        );
        const viewportH = Math.max(
            1,
            Math.round(
                (window.visualViewport && window.visualViewport.height)
                || document.documentElement.clientHeight
                || window.innerHeight
                || 1
            )
        );

        const streamScale = Math.min(vw / viewportW, vh / viewportH);
        const mappedW = Math.round(viewportW * streamScale);
        const mappedH = Math.round(viewportH * streamScale);
        const offsetX = Math.max(0, Math.floor((vw - mappedW) / 2));
        const offsetY = Math.max(0, Math.floor((vh - mappedH) / 2));
        const sx = streamScale;
        const sy = streamScale;

        const cropX = Math.max(0, Math.floor(offsetX + (rect.left * sx)));
        const cropY = Math.max(0, Math.floor(offsetY + (rect.top * sy)));
        const cropW = Math.max(1, Math.min(vw - cropX, Math.ceil(rect.width * sx)));
        const cropH = Math.max(1, Math.min(vh - cropY, Math.ceil(rect.height * sy)));

        if (cropW < 10 || cropH < 10) {
            throw new Error('Capture area was too small. Keep MarkedUp visible and retry.');
        }

        const canvas = document.createElement('canvas');
        canvas.width = cropW;
        canvas.height = cropH;

        const ctx = canvas.getContext('2d', { alpha: false });
        ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

        const imageDataUrl = canvas.toDataURL('image/png');
        const img = await Utils.loadImage(imageDataUrl);
        await Library.addCapture(img, 'True View Capture');
        Toast.show('True-view capture success');
    },

    go() {
        let url = this.unwrapProxyUrl(document.getElementById('urlInput').value.trim());
        if (!url) return;
        if (!url.startsWith('http')) url = 'https://' + url;
        document.getElementById('urlInput').value = url;
        const mob = document.getElementById('urlInputMob');
        if (mob) mob.value = url;
        this._targetUrl = url;
        this._scroll = { x: 0, y: 0 };
        const proxyUrl = this.getServiceOrigin() + '/proxy?url=' + encodeURIComponent(url);
        document.getElementById('webFrame').src = proxyUrl;
    },

    async capture() {
        const isFullPage = document.getElementById('fullPageCheck') ? document.getElementById('fullPageCheck').checked : false;
        const allowedModes = ['auto', 'live', 'node', 'trueview'];
        const settingsMode = String(Settings.get('captureMode') || 'auto').toLowerCase();
        const modeSelect = document.getElementById('settingCaptureMode');
        const uiModeRaw = modeSelect ? String(modeSelect.value || '').toLowerCase() : '';
        const uiMode = allowedModes.includes(uiModeRaw) ? uiModeRaw : '';
        const requestedMode = uiMode || settingsMode;
        const captureMode = allowedModes.includes(requestedMode) ? requestedMode : 'auto';
        if (uiMode && uiMode !== settingsMode) Settings.set('captureMode', uiMode);
        if (captureMode !== requestedMode) Settings.set('captureMode', 'auto');

        try {
            let currentUrl = this.unwrapProxyUrl(document.getElementById('urlInput').value.trim());
            if (!currentUrl) {
                Toast.show('Enter a URL first', 'error');
                return;
            }
            if (!currentUrl.startsWith('http')) currentUrl = 'https://' + currentUrl;

            const tryLiveCapture = async () => {
                const live = await this.captureLiveIframeState(isFullPage);
                if (!live || !live.img) {
                    throw new Error('Live iframe capture was not available for this page');
                }

                await Library.addCapture(live.img, live.title);
                if (live.effectiveUrl) {
                    this._targetUrl = live.effectiveUrl;
                }
                Toast.show('Live capture success');
            };

            if (captureMode === 'live') {
                await tryLiveCapture();
                return;
            }

            if (captureMode === 'node') {
                await this.captureViaNode(currentUrl, isFullPage);
                return;
            }

            if (captureMode === 'trueview') {
                if (isFullPage) {
                    Toast.show('True View captures visible viewport only', 'error');
                }
                await this.captureTrueView();
                return;
            }

            // Auto mode: live iframe first, then fallback to Node replay.
            try {
                await tryLiveCapture();
                return;
            } catch (liveErr) {
                console.warn('Live iframe capture failed, falling back to Node capture:', liveErr);
            }

            await this.captureViaNode(currentUrl, isFullPage);
        } catch (e) {
            console.error('Capture failed:', e);
            const message = e && e.message ? e.message : 'Unknown error';
            Toast.show(`Capture failed: ${message}`, 'error');

            if (captureMode === 'trueview') {
                Modal.confirm(
                    'True View Capture Failed',
                    'Use Capture Mode = True View and choose "This Tab" in the browser share picker. If sharing was stopped, capture once to re-authorize.',
                    () => {}
                );
                return;
            }

            if (captureMode === 'node' || window.location.protocol === 'file:') {
                const help = window.location.protocol === 'file:'
                    ? 'Open the app via the local Node server (npm start), not as file://.'
                    : 'Start the local service with npm start and try again.';
                Modal.confirm('Local Capture Service Required', help, () => {});
            }
        }
    },
    getSelectedViewport() {
        const selected = document.getElementById('viewportSelect')?.value || 'desktop';
        if (selected === 'mobile') return { width: 390, height: 844 };
        if (selected === 'tablet') return { width: 834, height: 1194 };
        return { width: 1440, height: 900 };
    },

    getCaptureProfile() {
        const iframe = document.getElementById('webFrame');
        const selected = document.getElementById('viewportSelect')?.value || 'desktop';
        const fallbackViewport = this.getSelectedViewport();
        const rect = iframe ? iframe.getBoundingClientRect() : null;

        const viewport = {
            width: rect ? Math.max(320, Math.round(rect.width)) : fallbackViewport.width,
            height: rect ? Math.max(240, Math.round(rect.height)) : fallbackViewport.height
        };

        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const forcedColorsActive = window.matchMedia && window.matchMedia('(forced-colors: active)').matches;

        const profile = {
            viewport,
            deviceScaleFactor: Math.max(1, Math.min(4, window.devicePixelRatio || 1)),
            userAgent: navigator.userAgent,
            locale: navigator.language || 'en-US',
            timezoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
            colorScheme: prefersDark ? 'dark' : 'light',
            reducedMotion: prefersReducedMotion ? 'reduce' : 'no-preference',
            forcedColors: forcedColorsActive ? 'active' : 'none',
            isMobile: selected === 'mobile',
            hasTouch: selected !== 'desktop' || (navigator.maxTouchPoints || 0) > 0
        };

        // Scroll position reported via postMessage from the proxied page.
        profile.scrollX = this._scroll.x;
        profile.scrollY = this._scroll.y;

        return profile;
    }
};

// Receive scroll and location events posted by the proxy-injected script.
window.addEventListener('message', function (e) {
    if (!e.data || !e.data.type) return;
    const frame = document.getElementById('webFrame');
    if (!frame || e.source !== frame.contentWindow) return;

    if (e.data.type === 'markedup-scroll') {
        Browser._scroll = {
            x: Math.max(0, Math.round(Number(e.data.scrollX) || 0)),
            y: Math.max(0, Math.round(Number(e.data.scrollY) || 0))
        };
        return;
    }

    if (e.data.type === 'markedup-location') {
        const nextUrl = Browser.unwrapProxyUrl(String(e.data.url || '').trim());
        if (!/^https?:\/\//i.test(nextUrl)) return;

        Browser._targetUrl = nextUrl;

        const desktopUrl = document.getElementById('urlInput');
        if (desktopUrl && desktopUrl.value !== nextUrl) desktopUrl.value = nextUrl;

        const mobileUrl = document.getElementById('urlInputMob');
        if (mobileUrl && mobileUrl.value !== nextUrl) mobileUrl.value = nextUrl;
    }
});

window.addEventListener('beforeunload', function () {
    Browser.stopTrueViewSession();
});

