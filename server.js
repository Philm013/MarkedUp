const http = require('http');
const https = require('https');
const path = require('path');
const express = require('express');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 4777;
const HOST = process.env.HOST || '127.0.0.1';

app.use(express.json({ limit: '2mb' }));
app.use(express.static(__dirname));

async function launchCaptureBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (_err) {
    // Fallback to locally installed Chrome when bundled Chromium is not present.
    return chromium.launch({
      headless: true,
      channel: 'chrome'
    });
  }
}

function normalizeUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) throw new Error('A URL is required');
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function sanitizeViewport(viewport) {
  const width = Number(viewport?.width) || 1440;
  const height = Number(viewport?.height) || 900;
  return {
    width: Math.max(320, Math.min(2560, Math.round(width))),
    height: Math.max(240, Math.min(2560, Math.round(height)))
  };
}

function sanitizeProfile(profile, fallbackViewport) {
  const safeViewport = sanitizeViewport(profile?.viewport || fallbackViewport);
  const dpr = Number(profile?.deviceScaleFactor) || 1;
  const colorScheme = profile?.colorScheme === 'dark' ? 'dark' : 'light';
  const reducedMotion = profile?.reducedMotion === 'reduce' ? 'reduce' : 'no-preference';
  const forcedColors = profile?.forcedColors === 'active' ? 'active' : 'none';

  return {
    viewport: safeViewport,
    screen: safeViewport,
    deviceScaleFactor: Math.max(1, Math.min(4, dpr)),
    userAgent: typeof profile?.userAgent === 'string' && profile.userAgent.trim()
      ? profile.userAgent.trim()
      : undefined,
    locale: typeof profile?.locale === 'string' && profile.locale.trim()
      ? profile.locale.trim()
      : undefined,
    timezoneId: typeof profile?.timezoneId === 'string' && profile.timezoneId.trim()
      ? profile.timezoneId.trim()
      : undefined,
    colorScheme,
    reducedMotion,
    forcedColors,
    isMobile: Boolean(profile?.isMobile),
    hasTouch: Boolean(profile?.hasTouch)
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'playwright-capture', ts: Date.now() });
});

app.post('/api/capture', async (req, res) => {
  const started = Date.now();

  try {
    const url = normalizeUrl(req.body?.url);
    const fullPage = Boolean(req.body?.fullPage);
    const viewport = sanitizeViewport(req.body?.viewport);
    const profile = sanitizeProfile(req.body?.profile, viewport);

    const browser = await launchCaptureBrowser();
    try {
      let context;
      try {
        context = await browser.newContext(profile);
      } catch (_profileErr) {
        // If one of the advanced profile fields is invalid, fall back to the essentials.
        context = await browser.newContext({
          viewport,
          screen: viewport,
          deviceScaleFactor: profile.deviceScaleFactor
        });
      }

      const page = await context.newPage();
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 45000
      });

      const scrollX = Math.max(0, Math.round(Number(req.body?.profile?.scrollX) || 0));
      const scrollY = Math.max(0, Math.round(Number(req.body?.profile?.scrollY) || 0));
      if (scrollX || scrollY) {
        await page.evaluate(([x, y]) => {
          window.scrollTo(x, y);
        }, [scrollX, scrollY]);
      }

      const imageBuffer = await page.screenshot({
        type: 'png',
        fullPage
      });

      await context.close();

      res.json({
        ok: true,
        imageDataUrl: `data:image/png;base64,${imageBuffer.toString('base64')}`,
        title: fullPage ? 'Full Capture' : 'Web Capture',
        meta: {
          url,
          fullPage,
          viewport,
          appliedProfile: {
            viewport: profile.viewport,
            deviceScaleFactor: profile.deviceScaleFactor,
            colorScheme: profile.colorScheme,
            reducedMotion: profile.reducedMotion,
            forcedColors: profile.forcedColors,
            isMobile: profile.isMobile,
            hasTouch: profile.hasTouch,
            locale: profile.locale,
            timezoneId: profile.timezoneId
          },
          elapsedMs: Date.now() - started
        }
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    res.status(400).send(error?.message || 'Capture failed');
  }
});

// ─── Same-Origin Proxy ────────────────────────────────────────────────────────
// Serves external pages through localhost so getCaptureProfile() can read
// iframe scroll position. Stripped of frame-busting headers.

const BLOCKED_HOST_RE = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^::1$/
];

function isBlockedHost(hostname) {
  return BLOCKED_HOST_RE.some(r => r.test(hostname));
}

function proxyFetch(targetUrl, depth = 0) {
  return new Promise((resolve, reject) => {
    if (depth > 5) return reject(new Error('Too many redirects'));
    let parsed;
    try { parsed = new URL(targetUrl); } catch { return reject(new Error('Invalid URL')); }
    if (!['http:', 'https:'].includes(parsed.protocol)) return reject(new Error('Unsupported protocol'));
    if (isBlockedHost(parsed.hostname)) return reject(new Error('Host blocked'));

    const client = parsed.protocol === 'https:' ? https : http;
    const reqOpts = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Cache-Control': 'no-cache',
      },
      rejectUnauthorized: false,
    };

    const req = client.request(reqOpts, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        let loc;
        try { loc = new URL(res.headers.location, targetUrl).toString(); } catch { return reject(new Error('Bad redirect URL')); }
        res.resume();
        return proxyFetch(loc, depth + 1).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode || 200, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Proxy timeout')); });
    req.on('error', reject);
    req.end();
  });
}

function buildBridgeInject(initialUrl, proxyOrigin) {
  const safeInitialUrl = JSON.stringify(String(initialUrl || ''));
  const safeProxyOrigin = JSON.stringify(String(proxyOrigin || ''));

  return `<script>(function(){
    var initialTargetUrl = ${safeInitialUrl};
    var proxyOrigin = ${safeProxyOrigin};

    function post(type, payload) {
      try {
        window.parent.postMessage(Object.assign({ type: type }, payload || {}), '*');
      } catch (e) {}
    }

    function getTargetUrl() {
      try {
        var current = new URL(window.location.href);
        if (current.pathname === '/proxy' || current.pathname === '/proxy/') {
          var q = current.searchParams.get('url');
          if (q) return q;
        }
      } catch (e) {}
      return initialTargetUrl || window.location.href;
    }

    function reportScroll() {
      post('markedup-scroll', {
        scrollX: window.scrollX || 0,
        scrollY: window.scrollY || 0
      });
    }

    function reportLocation() {
      post('markedup-location', {
        url: getTargetUrl(),
        title: document.title || ''
      });
    }

    var origPushState = history.pushState;
    history.pushState = function() {
      var out = origPushState.apply(this, arguments);
      reportLocation();
      return out;
    };

    var origReplaceState = history.replaceState;
    history.replaceState = function() {
      var out = origReplaceState.apply(this, arguments);
      reportLocation();
      return out;
    };

    document.addEventListener('click', function(e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;

      var href = a.getAttribute('href') || '';
      if (!href || href.charAt(0) === '#') return;
      if (/^(javascript:|mailto:|tel:)/i.test(href)) return;
      if ((a.target || '').toLowerCase() === '_blank') return;

      var dest;
      try {
        dest = new URL(href, getTargetUrl());
      } catch (err) {
        return;
      }

      if (!/^https?:$/i.test(dest.protocol)) return;

      e.preventDefault();
      var proxyUrl = (proxyOrigin || window.location.origin) + '/proxy?url=' + encodeURIComponent(dest.toString());
      window.location.href = proxyUrl;
    }, true);

    window.addEventListener('scroll', reportScroll, { passive: true });
    window.addEventListener('hashchange', reportLocation);
    window.addEventListener('popstate', reportLocation);
    window.addEventListener('load', function() {
      reportLocation();
      reportScroll();
      setTimeout(reportLocation, 250);
      setTimeout(reportScroll, 600);
    });
  }());<\/script>`;
}

const STRIP_HEADERS = [
  'x-frame-options', 'content-security-policy',
  'content-security-policy-report-only', 'x-content-type-options',
  'strict-transport-security', 'permissions-policy',
  'cross-origin-opener-policy', 'cross-origin-embedder-policy'
];

app.get('/proxy', async (req, res) => {
  const rawUrl = (req.query.url || '').trim();
  if (!rawUrl) return res.status(400).send('Missing url parameter');

  let parsed;
  try {
    parsed = new URL(rawUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only http/https supported');
    if (isBlockedHost(parsed.hostname)) return res.status(403).send('Access to this host is blocked');
  } catch (e) {
    return res.status(400).send(e.message || 'Invalid URL');
  }

  try {
    const result = await proxyFetch(rawUrl);
    for (const h of STRIP_HEADERS) delete result.headers[h];

    const ct = ((result.headers['content-type'] || '').split(';')[0] || '').trim().toLowerCase();
    const isHtml = ct === 'text/html' || ct === 'application/xhtml+xml' || ct === '';

    if (isHtml) {
      let html = result.body.toString('utf8');
      const safeBase = rawUrl.replace(/['"<>]/g, c => encodeURIComponent(c));
      const proxyOrigin = `${req.protocol}://${req.get('host')}`;
      const inject = `<base href="${safeBase}">\n${buildBridgeInject(rawUrl, proxyOrigin)}`;
      html = /<head[^>]*>/i.test(html)
        ? html.replace(/<head([^>]*)>/i, `<head$1>${inject}`)
        : inject + html;
      delete result.headers['content-encoding'];
      delete result.headers['transfer-encoding'];
      delete result.headers['content-length'];
      res.set('content-type', 'text/html; charset=utf-8').status(result.status).send(html);
    } else {
      delete result.headers['content-length'];
      try { Object.entries(result.headers).forEach(([k, v]) => res.set(k, v)); } catch {}
      res.status(result.status).send(result.body);
    }
  } catch (err) {
    res.status(502).send(`Proxy error: ${err.message || 'Unknown'}`);
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`DevMarkup Pro local server running at http://${HOST}:${PORT}`);
});
