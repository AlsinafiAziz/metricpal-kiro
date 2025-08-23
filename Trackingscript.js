/**
 * MetricPal Analytics - Feature Complete v2.2.0
 * Complete implementation with all features
 */
(function(w, d) {
    "use strict";
    
    // Prevent multiple initializations
    if (w.MetricPal && w.MetricPal.initialized) return w.MetricPal;
    
    // Core variables
    const mp = {};
    let ep = "http://localhost:3000/api/v1/collect/optimized";
    const al = []; // action log
    const el = []; // event listeners
    const se = d.currentScript || d.querySelector('script[data-apikey]');
    const ak = se?.getAttribute("apikey") || se?.getAttribute("data-apikey");
    
    // Configuration with all options
    let iv = parseInt(se?.getAttribute("data-interval-start")) || 5000;
    const ivInc = parseInt(se?.getAttribute("data-interval-increment")) || 2000;
    const bs = parseInt(se?.getAttribute("data-batch-size")) || 50;
    const st = parseInt(se?.getAttribute("data-session-timeout")) || 30;
    const cl = se?.getAttribute("data-cookieless") === "true";
    const pm = se?.getAttribute("data-privacy-mode") === "true";
    const ai = se?.getAttribute("data-auto-identify") !== "false";
    const oi = se?.getAttribute("data-only-identify") === "true";
    const cd = se?.getAttribute("data-cross-domain") === "true";
    const db = w.location.search.includes("debug=true") || se?.getAttribute("data-debug") === "true";
    
    if (se?.getAttribute("data-endpoint")) ep = se.getAttribute("data-endpoint");
    if (se?.getAttribute("data-server-url")) ep = se.getAttribute("data-server-url");
    
    // Early exit conditions
    if (!ak) {
        console.error("MetricPal: No API key provided");
        return;
    }
    
    // Enhanced bot detection
    const isBot = () => {
        const ua = navigator.userAgent.toLowerCase();
        return w.location.search.includes("disable_tracking") ||
               /(preview|funnelytics|crawl|hexometer|curl|lynx|ptst|nuhk|googlebot|googlesecurityscanner|gtmetrix|slurp|ask jeeves\/teoma|ia_archiver|google web preview|mediapartners-google|baiduspider|ezooms|yahooseeker|altavista|mercator|scooter|infoseek|ultraseek|lycos|wget|yadirectfetcher|magpie-crawler|nutch crawler|cms crawler|domnutch|netseer|digincore|fr-crawler|wesee|aliasio|bingpreview|headlesschrome|facebookexternalhit|facebookplatform|facebookexternalua|bot|crawler|sp(i|y)der|search|worm|fetch|nutch)/i.test(ua) ||
               navigator.webdriver;
    };
    
    if (isBot()) return;
    
    // Device detection
    const getDeviceType = ua => {
        ua = ua.toLowerCase();
        if (/(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/i.test(ua)) return "tablet";
        if (/(mobi|ipod|phone|blackberry|opera mini|fennec|minimo|symbian|psp|nintendo ds|archos|skyfire|puffin|blazer|bolt|gobrowser|iris|maemo|semc|teashark|uzard)/i.test(ua)) return "phone";
        return "desktop";
    };
    
    const deviceType = getDeviceType(navigator.userAgent);
    const isMobile = deviceType === "phone";
    
    // Utility functions
    const log = (...args) => db && console.log("[MetricPal]:", ...args);
    const err = (e, ctx) => console.error("[MetricPal Error]:", e, ctx);   
 
    // UUID generation (optimized)
    const uuid = () => {
        let t = Date.now();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = (t + 16 * Math.random()) % 16 | 0;
            t = Math.floor(t / 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    };
    
    // Email validation
    const isEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).toLowerCase());
    
    // Storage management
    const setCookie = (name, value, days) => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        const expires = days ? "; expires=" + date.toUTCString() : "";
        const domain = cd ? `;domain=${w.location.hostname}` : '';
        d.cookie = name + "=" + value + expires + "; path=/;SameSite=Lax" + domain;
    };
    
    const getCookie = name => {
        const nameEQ = name + "=";
        const ca = d.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    };
    
    const removeCookie = name => {
        d.cookie = `${name}=; expires=${new Date("2020-01-01").toUTCString()}; path=/`;
        if (d.cookie.includes(name)) d.cookie = name + "=;";
    };
    
    // SHA-1 hash implementation
    const hash = str => {
        const rotateLeft = (n, s) => (n << s) | (n >>> (32 - s));
        const toHexStr = val => {
            let s = "";
            for (let i = 7; i >= 0; i--) {
                const v = (val >>> (i * 4)) & 0x0f;
                s += v.toString(16);
            }
            return s;
        };
        
        // UTF-8 encode
        str = str.replace(/\r\n/g, "\n");
        let utf8 = "";
        for (let i = 0; i < str.length; i++) {
            const c = str.charCodeAt(i);
            if (c < 128) {
                utf8 += String.fromCharCode(c);
            } else if (c > 127 && c < 2048) {
                utf8 += String.fromCharCode((c >> 6) | 192);
                utf8 += String.fromCharCode((c & 63) | 128);
            } else {
                utf8 += String.fromCharCode((c >> 12) | 224);
                utf8 += String.fromCharCode(((c >> 6) & 63) | 128);
                utf8 += String.fromCharCode((c & 63) | 128);
            }
        }
        
        const strLen = utf8.length;
        const wordArray = [];
        
        let i;
        for (i = 0; i < strLen - 3; i += 4) {
            wordArray.push(utf8.charCodeAt(i) << 24 | utf8.charCodeAt(i + 1) << 16 | 
                          utf8.charCodeAt(i + 2) << 8 | utf8.charCodeAt(i + 3));
        }
        
        switch (strLen % 4) {
            case 0: i = 0x80000000; break;
            case 1: i = utf8.charCodeAt(strLen - 1) << 24 | 0x800000; break;
            case 2: i = utf8.charCodeAt(strLen - 2) << 24 | utf8.charCodeAt(strLen - 1) << 16 | 0x8000; break;
            case 3: i = utf8.charCodeAt(strLen - 3) << 24 | utf8.charCodeAt(strLen - 2) << 16 | 
                       utf8.charCodeAt(strLen - 1) << 8 | 0x80; break;
        }
        
        wordArray.push(i);
        while (wordArray.length % 16 !== 14) wordArray.push(0);
        wordArray.push(strLen >>> 29);
        wordArray.push((strLen << 3) & 0x0ffffffff);
        
        let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
        
        for (let j = 0; j < wordArray.length; j += 16) {
            const w = new Array(80);
            for (let t = 0; t < 16; t++) w[t] = wordArray[j + t];
            for (let t = 16; t < 80; t++) w[t] = rotateLeft(w[t-3] ^ w[t-8] ^ w[t-14] ^ w[t-16], 1);
            
            let a = h0, b = h1, c = h2, d = h3, e = h4;
            
            for (let t = 0; t < 80; t++) {
                let temp;
                if (t < 20) temp = (rotateLeft(a, 5) + ((b & c) | (~b & d)) + e + w[t] + 0x5A827999) & 0x0ffffffff;
                else if (t < 40) temp = (rotateLeft(a, 5) + (b ^ c ^ d) + e + w[t] + 0x6ED9EBA1) & 0x0ffffffff;
                else if (t < 60) temp = (rotateLeft(a, 5) + ((b & c) | (b & d) | (c & d)) + e + w[t] + 0x8F1BBCDC) & 0x0ffffffff;
                else temp = (rotateLeft(a, 5) + (b ^ c ^ d) + e + w[t] + 0xCA62C1D6) & 0x0ffffffff;
                
                e = d; d = c; c = rotateLeft(b, 30); b = a; a = temp;
            }
            
            h0 = (h0 + a) & 0x0ffffffff;
            h1 = (h1 + b) & 0x0ffffffff;
            h2 = (h2 + c) & 0x0ffffffff;
            h3 = (h3 + d) & 0x0ffffffff;
            h4 = (h4 + e) & 0x0ffffffff;
        }
        
        return (toHexStr(h0) + toHexStr(h1) + toHexStr(h2) + toHexStr(h3) + toHexStr(h4)).toLowerCase();
    }; 
   
    // Enhanced fingerprinting
    const generateFingerprint = () => {
        if (!cl) return uuid();
        
        const data = [
            navigator.language || 'unknown',
            navigator.platform || 'unknown',
            w.screen.width || 0,
            w.screen.height || 0,
            w.screen.colorDepth + w.screen.pixelDepth || 0,
            (!!w.localStorage).toString() + !!w.indexedDB + navigator.cookieEnabled,
            navigator.hardwareConcurrency || 0
        ];
        
        // MimeTypes
        let mimeTypes = "";
        const mimes = navigator.mimeTypes || [];
        for (const mime of mimes) mimeTypes += mime.type;
        data.push(mimeTypes);
        
        // Plugins
        let plugins = "";
        for (const plugin of navigator.plugins) plugins += plugin.filename;
        data.push(plugins);
        
        if (navigator.javaEnabled) data.push(navigator.javaEnabled().toString());
        
        return hash(data.join('|'));
    };
    
    // Core tracking variables
    let vid = cl ? generateFingerprint() : (getCookie('mp_uuid') || (() => { 
        const id = uuid(); 
        setCookie('mp_uuid', id, 365); 
        return id; 
    })());
    
    let sid = uuid();
    let sessionStart = new Date();
    let lastActivity = new Date();
    let currentUrl = (w.location.origin + w.location.pathname + w.location.search + w.location.hash).toLowerCase();
    let scrollDepth = 0;
    let maxScrollDepth = 0;
    let userIdentity = null;
    let sessionEnded = false;
    let pageUnloaded = false;
    let activityCounter = 0;
    let trackedForms = [];
    
    // Mouse tracking for click validation
    w.innerPageClick = false;
    
    // User and customer objects
    const userObject = {
        language: navigator.language,
        platform: navigator.platform,
        uuid: cl ? vid : getCookie('mp_uuid'),
        ...(cl && {
            screen: {
                availHeight: w.screen.availHeight,
                height: w.screen.height,
                width: w.screen.width,
                depth: w.screen.colorDepth + w.screen.pixelDepth
            },
            mimeTypes: (() => {
                let result = "";
                const mimes = navigator.mimeTypes || [];
                for (const mime of mimes) result += mime.type;
                return result;
            })(),
            plugins: (() => {
                let result = "";
                for (const plugin of navigator.plugins) result += plugin.filename;
                return result;
            })(),
            storageEnabled: (!!localStorage).toString() + !!indexedDB + navigator.cookieEnabled,
            otherInfo: navigator.hardwareConcurrency + (navigator.javaEnabled ? navigator.javaEnabled() : false)
        }),
        identity: userIdentity,
        custom: {},
        shared: []
    };
    
    const customerObject = {
        website: w.location.hostname,
        apiKey: ak,
        isFingerprint: cl,
        debugMode: db,
        serverPath: "/optimized",
        serverURL: ep,
        version: "2.2.0"
    };
    
    // Referrer processing
    const processReferrer = (url, referrer) => {
        if (/(\?.*utm_.*=)/.test(url) || /((\?|&)ref=)/.test(url) || /((\?|&)(gclid|fbclid|msclkid)=)/.test(url)) {
            return url;
        }
        return referrer !== "" ? referrer : "";
    };    

    // Data transmission
    const sendViaBeacon = (endpoint, payload) => {
        const canUseBeacon = typeof navigator === "object" && 
                           typeof navigator.sendBeacon === "function" && 
                           typeof Blob === "function";
        
        if (!canUseBeacon) return sendViaXHR(endpoint, payload);
        
        try {
            // Add API key as query parameter for beacon requests
            const separator = endpoint.includes('?') ? '&' : '?';
            const endpointWithKey = `${endpoint}${separator}api_key=${encodeURIComponent(ak)}`;
            
            const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
            const success = navigator.sendBeacon(endpointWithKey, blob);
            log("Beacon sent:", success);
            
            // If beacon fails, fallback to XHR
            if (!success) {
                log("Beacon failed, falling back to XHR");
                return sendViaXHR(endpoint, payload);
            }
            
            return success;
        } catch (e) {
            err(e, { operation: "sendViaBeacon" });
            return sendViaXHR(endpoint, payload);
        }
    };
    
    const sendViaXHR = (endpoint, payload) => {
        if (al.length === 0) return false;
        
        try {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", endpoint, true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.setRequestHeader("x-api-key", ak);
            xhr.send(JSON.stringify(payload));
            xhr.onreadystatechange = () => true;
            return true;
        } catch (e) {
            err(e, { operation: "sendViaXHR" });
            return false;
        }
    };
    
    const sendData = method => {
        if (isBot() || navigator.webdriver || al.length === 0) return;
        
        const actionLogCopy = JSON.parse(JSON.stringify(al));
        const referrer = processReferrer(currentUrl, d.referrer);
        
        const payload = {
            customerObject: customerObject,
            userObject: userObject,
            actionLog: actionLogCopy.map(event => {
                const actionData = {
                    timestamp: event.action.actionDate,
                    action_type: event.action.actionType,
                    url: event.url
                };
                
                // Only include optional fields if they have values
                if (event.action.actionElement) actionData.element = event.action.actionElement;
                if (event.action.actionText) actionData.text = event.action.actionText;
                if (event.action.actionValue) actionData.value = event.action.actionValue;
                else if (event.action.formData) actionData.value = JSON.stringify(event.action.formData);
                if (event.action.actionProperties) actionData.properties = event.action.actionProperties;
                
                return actionData;
            }),
            referrer: referrer
        };
        
        let success;
        if (method === "beacon") {
            success = sendViaBeacon(ep, payload);
        } else {
            success = sendViaXHR(ep, payload);
        }
        
        if (success) {
            al.length = 0;
        }
        
        return success;
    };
    
    // Enhanced element path building
    const getElementInfo = element => {
        const path = [];
        let text = "";
        let url = "";
        
        if (!element) return {};
        
        // Extract text
        if (element.placeholder) {
            text = element.placeholder;
        } else if (element.innerText) {
            let innerText = element.innerText.replace(/\n/g, " ");
            if (innerText.length > 103) {
                innerText = innerText.substring(0, 100) + "...";
            }
            text = innerText;
        } else if (element.tagName.toLowerCase() === "input" && 
                  (element.type === "button" || element.type === "submit")) {
            text = element.value;
        }
        text = text.trim();
        
        // Extract URL
        if (element.src) {
            url = element.src;
        } else if (element.href && element.href !== "") {
            url = element.href;
        }
        url = url.trim();
        
        // Build CSS path with enhancements
        let current = element;
        while (current.parentNode) {
            let selector = current.tagName.toLowerCase();
            
            if (current.id) {
                selector = "#" + current.id;
                path.unshift(selector);
                break;
            } else {
                // Enhanced class handling for SVG and regular elements
                const className = (current.nodeType === 1 && current.namespaceURI === "http://www.w3.org/2000/svg") ?
                    (current.className ? current.className.baseVal : current.getAttribute("class")) :
                    [...current.classList].join(" ");
                
                const trimmedClassName = (className || "").trim();
                if (trimmedClassName !== "") {
                    // Advanced CSS selector escaping
                    selector += "." + trimmedClassName.replace(/ +/g, ".").replace(/[:/]|\.[0-9]|\[|\]|%|~|=|&|#|@|`/g, "\\$&");
                }
                
                // Enhanced nth-of-type calculation
                const parent = current.parentElement;
                if (parent) {
                    const siblings = parent.querySelectorAll(selector);
                    if (siblings.length > 1) {
                        for (let i = 0; i < siblings.length; i++) {
                            if (siblings[i] === current) {
                                selector += ":nth-of-type(" + (i + 1) + ")";
                                break;
                            }
                        }
                    }
                }
                
                path.unshift(selector);
                current = current.parentNode;
            }
        }
        
        const result = { element: path.join(" ") };
        if (text !== "") result.text = text;
        if (url !== "") result.url = url;
        
        return result;
    };    
    
    // URL parameter auto-identification feature
    const autoIdentifyFromURL = paramName => {
        const urlParams = [...new URLSearchParams(w.location.search)];
        const emailParam = urlParams.find(([key, value]) => {
            const keyLower = key.toLowerCase();
            const hasEmailKey = paramName ? keyLower === paramName : keyLower.includes("email");
            if (hasEmailKey) {
                log("Possible identify through URL:", JSON.stringify([key, value]));
                return isEmail(value);
            }
            return false;
        });
        
        if (emailParam && emailParam[1]) {
            identify(emailParam[1]);
        }
    };
    
    // Advanced session management
    const updateActivity = () => {
        const now = new Date();
        
        // Check for session timeout (10 minutes)
        if (now.getTime() - sessionStart.getTime() > 600000) { // 10 minutes
            sessionEnded = true;
            endSession();
        }
        
        lastActivity = new Date();
        activityCounter = 0; // Reset activity counter
        
        // Restart session if it was ended
        if (sessionEnded) {
            setTimeout(() => {
                if (d.hasFocus()) {
                    initSession();
                }
            }, 5000);
        }
        
        sessionEnded = false;
    };
    
    const endSession = (force = false) => {
        let scrollPercentage = isScrollable() ? 
            parseInt(maxScrollDepth / (getDocumentHeight() - getWindowHeight()) * 100) : 100;
        
        if (scrollPercentage > 100) scrollPercentage = 100;
        
        if (sessionEnded && (force === undefined || !force)) {
            addAction("scroll-depth", null, scrollPercentage);
            addAction("end-session");
            sendData("beacon");
            return;
        }
        
        if (!sessionEnded && force !== undefined && force) {
            addAction("scroll-depth", null, scrollPercentage);
            sendData("beacon");
            return;
        }
        
        // Check for same-site navigation
        const activeElementHref = d.activeElement.href;
        if (isSameSite(activeElementHref) && currentUrl !== activeElementHref) {
            const cleanHref = activeElementHref.split("#")[0];
            const newUrl = getCurrentUrl();
            if (cleanHref.startsWith("http") && newUrl !== cleanHref) {
                addAction("scroll-depth", null, scrollPercentage);
                sendData("beacon");
            }
        } else {
            addAction("scroll-depth", null, scrollPercentage);
            addAction("end-session");
            sendData("beacon");
        }
    };
    
    const initSession = () => {
        sessionEnded = false;
        sessionStart = new Date();
        lastActivity = new Date();
        activityCounter = 0;
        sid = uuid();
        userObject.sessionData = {
            id: sid,
            startTime: sessionStart.toISOString(),
            referrer: d.referrer,
            landingPage: currentUrl
        };
    };
    
    // Helper functions
    const getCurrentUrl = () => (w.location.origin + w.location.pathname + w.location.search + w.location.hash).toLowerCase();
    
    const isSameSite = url => {
        if (url === undefined) return false;
        try {
            const urlObj = new URL(url);
            return w.location.hostname === urlObj.hostname;
        } catch (e) {
            err(e, { operation: "isSameSite", uri: url });
            return false;
        }
    };
    
    const getDocumentHeight = () => {
        const doc = d;
        return Math.max(
            Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight),
            Math.max(doc.body.offsetHeight, doc.documentElement.offsetHeight),
            Math.max(doc.body.clientHeight, doc.documentElement.clientHeight)
        );
    };
    
    const getWindowHeight = () => {
        const doc = d;
        return Math.min(
            Math.min(doc.body.clientHeight, doc.documentElement.clientHeight),
            Math.min(doc.body.offsetHeight, doc.documentElement.offsetHeight),
            w.innerHeight
        );
    };
    
    const isScrollable = () => {
        return w.innerHeight ? 
            Math.max(d.body.scrollHeight, d.documentElement.scrollHeight) > w.innerHeight :
            d.documentElement.scrollHeight > d.documentElement.offsetHeight || 
            d.body.scrollHeight > d.body.offsetHeight;
    };   
 
    // Action creation
    const addAction = (actionType, targetUrl, actionData) => {
        log("Creating action", actionType, targetUrl, JSON.stringify(actionData));
        
        const url = targetUrl || getCurrentUrl();
        const currentPageUrl = currentUrl;
        
        if (oi && actionType !== "identify") return;
        
        const action = {
            actionType: actionType,
            actionDate: sessionEnded ? new Date(sessionStart.getTime()).toISOString() : new Date().toISOString()
        };
        
        // Add action-specific properties
        if (actionType === "onclick") {
            if (actionData?.element) action.actionElement = actionData.element;
            if (actionData?.text) action.actionText = actionData.text;
            if (actionData?.url) {
                action.actionUrl = actionData.url;
                // Prevent duplicate clicks on same URL
                if (actionData.url === url && url !== currentPageUrl) {
                    addAction("onclick", currentPageUrl, actionData);
                    return;
                }
            }
        } else if (actionType === "onsearch") {
            action.actionValue = actionData?.value;
            action.actionElement = actionData?.element;
        } else if (actionType === "scroll-depth") {
            action.actionNumber = actionData || 100;
        } else if (actionType === "onsubmit") {
            action.actionElement = actionData?.element;
            if (actionData?.formData) action.formData = actionData.formData;
        } else if (actionType === "identify") {
            if (actionData?.email) action.actionEmail = actionData.email;
            if (actionData?.domain) action.emailDomain = actionData.domain;
        }
        
        // Check for page changes before adding action
        if (!["enter-page", "scroll-depth"].includes(actionType) && url !== currentUrl) {
            checkPageChange();
        }
        
        al.push({
            action: action,
            url: url.toLowerCase()
        });
        
        // Send immediately for critical actions
        if (["onsubmit", "identify"].includes(actionType)) {
            sendData("beacon");
        }
    };
    
    // Page change detection
    const checkPageChange = () => {
        const newUrl = getCurrentUrl();
        if (newUrl !== currentUrl) {
            const scrollPercentage = isScrollable() ? 
                parseInt(maxScrollDepth / (getDocumentHeight() - getWindowHeight()) * 100) : 100;
            
            addAction("scroll-depth", currentUrl, scrollPercentage > 100 ? 100 : scrollPercentage);
            addAction("enter-page", null);
            sendData("beacon");
            
            currentUrl = newUrl;
        }
    };
    
    // Enhanced form handling with intelligence
    const identifyThroughForm = (email, form) => {
        const trimmedEmail = email.trim();
        log("identifyThroughForm fired", trimmedEmail);
        
        let formInfo = {};
        try {
            formInfo = getElementInfo(form);
        } catch (e) {
            err(e, { operation: "identifyThroughForm/getClickInfo" });
        }
        
        if (isEmail(trimmedEmail)) {
            identify(trimmedEmail);
            trackGoal("Identified from Form", {
                email: pm ? hash(trimmedEmail.toLowerCase()) : trimmedEmail.toLowerCase(),
                ...JSON.parse(JSON.stringify(formInfo))
            });
        }
    };
    
    // Advanced click handling
    const handleClick = event => {
        if (!w.innerPageClick) return; // Only track if mouse was over page
        
        let clickInfo;
        updateActivity();
        
        try {
            clickInfo = getElementInfo(event.target);
            addAction("onclick", null, clickInfo);
        } catch (e) {
            err(e, { operation: "onClickFunc/getClickInfo" });
        }
        
        // Advanced form submission detection via button clicks
        const button = event.target.closest("button") || event.target.closest("a");
        if (!button) return;
        if (button.nodeName === "A" && !button.className.includes("button")) return;
        
        log("checkSubmitClickInForm fired", button);
        
        const form = event.target.closest("form");
        if (form) {
            log("found form", form);
            const elements = form.elements;
            let isValid = true;
            
            // Check form validity and auto-identify
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                if (element && element.type !== "hidden") {
                    // Check validity
                    if (element.validity && !element.validity.valid) {
                        isValid = false;
                    }
                    
                    // Auto-identify from email fields
                    if (ai && element.type === "email") {
                        identifyThroughForm(element.value, form);
                    }
                }
            }
            
            // CTA button detection
            const isCTAButton = !!button.className.match(/(cta |submit|submission|book\-demo)/g);
            const hasExistingSubmit = al.find(event => event.action.actionType === "onsubmit");
            
            if (isValid && !hasExistingSubmit && (button.type === "submit" || isCTAButton)) {
                let formInfo = {};
                try {
                    formInfo = getElementInfo(form);
                } catch (e) {
                    err(e, { operation: "checkSubmitClickInForm/getClickInfo" });
                }
                
                const formInfoCopy = JSON.parse(JSON.stringify(formInfo));
                addAction("onsubmit", null, {
                    ...formInfoCopy,
                    eventSource: "checkSubmitClickInForm"
                });
            }
        } else if (ai) {
            // Auto-identify from any email inputs on page
            const emailInputs = [...d.querySelectorAll("input")];
            log("found all inputs to search for email", emailInputs);
            
            emailInputs.forEach(input => {
                if (input.type !== "email" && 
                    !input.placeholder?.toLowerCase().includes("email") && 
                    !input.name?.toLowerCase().includes("email")) {
                    return;
                }
                
                const email = input.value.trim();
                if (isEmail(email)) {
                    identify(email);
                }
            });
        }
        
        checkPageChange();
    };    
  
    // Enhanced form submission handling
    const handleFormSubmit = event => {
        updateActivity();
        log("onsubmit fired");
        
        const form = event.target;
        let formInfo = {};
        
        try {
            formInfo = getElementInfo(form);
        } catch (e) {
            err(e, { operation: "onSubmitFunc/getClickInfo" });
        }
        
        // Skip HubSpot forms (they have their own handling)
        if (formInfo && formInfo.element && formInfo.element.startsWith("#hsForm_")) {
            return;
        }
        
        try {
            const elements = form.elements;
            
            // Advanced search form detection
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                log("form element", element.type, element.name, element.value);
                
                // Search input type detection
                if (element.type === "search" && elements.length <= 2) {
                    const searchInfo = { ...formInfo, value: element.value };
                    addAction("onsearch", null, searchInfo);
                    return;
                }
                
                // Text input with search-related names
                if (element.type === "text" && 
                    (["s", "q", "k"].includes(element.name) || /search|query|keyword/i.test(element.name)) && 
                    elements.length <= 2) {
                    const searchInfo = { ...formInfo, value: element.value };
                    addAction("onsearch", null, searchInfo);
                    return;
                }
                
                // Auto-identify from form fields
                if (ai && ["email", "text"].includes(element.type)) {
                    identifyThroughForm(element.value, form);
                    
                    // Cross-frame communication
                    if (w.parent) {
                        w.parent.postMessage({
                            name: "metricpal-identify-form",
                            value: element.value
                        }, "*");
                    }
                }
            }
            
            // Submit button text analysis for search detection
            const submitButton = event.target.querySelector("input[type=submit]");
            if (submitButton && /search/i.test(submitButton.value) && 
                event.target.querySelectorAll("input[type=text]").length === 1) {
                
                const textInput = event.target.querySelector("input[type=text]");
                const searchInfo = { ...formInfo, value: textInput.value };
                addAction("onsearch", null, searchInfo);
                return;
            }
            
            // Regular form submission
            const formInfoCopy = JSON.parse(JSON.stringify(formInfo));
            addAction("onsubmit", null, {
                ...formInfoCopy,
                eventSource: "onSubmitFunc"
            });
            
            // Cross-frame communication for form submission
            if (w.parent) {
                w.parent.postMessage({
                    name: "metricpal-onsubmit",
                    element: (formInfo || {}).element
                }, "*");
            }
            
        } catch (e) {
            err(e, { operation: "onSubmitFunc" });
        }
    };
    
    // Event listener management
    const addEventListener = (element, eventType, handler) => {
        if (["submit", "change"].includes(eventType) && el.includes(eventType)) {
            return;
        }
        
        log("Adding event listener for", eventType, "on", element);
        
        if (element.addEventListener !== undefined) {
            element.addEventListener(eventType, handler, false);
        } else {
            element.attachEvent("on" + eventType, handler);
        }
        
        el.push(eventType);
    };
    
    // Cross-frame message handling
    const handleMessage = event => {
        if (event.data && event.data.name === "metricpal-identify" && event.data.email) {
            identify(event.data.email);
        } else if (event.data && event.data.name === "metricpal-onsubmit" && 
                  event.data.element && event.source !== w) {
            addAction("onsubmit", null, {
                element: event.data.element,
                eventSource: "metricpal-onsubmit"
            });
        } else if (event.data && event.data.name === "metricpal-identify-form" && event.data.value) {
            identifyThroughForm(event.data.value, null);
        } else if (event.data && event.data.type === "hsFormCallback" && 
                  event.data.eventName === "onFormSubmit") {
            // HubSpot Forms integration
            if (ai) {
                const emailField = event.data.data.find(field => field.name === "email");
                if (emailField) {
                    identify(emailField.value);
                }
            }
            addAction("onsubmit", null, {
                element: "#hsForm_" + event.data.id,
                eventSource: "hsFormCallback"
            });
        } else if (event.data && event.data.meetingBookSucceeded) {
            // HubSpot Meetings integration
            if (ai) {
                const email = event.data.meetingsPayload.bookingResponse.postResponse.contact.email;
                identify(email);
            }
            trackGoal("Meeting Booked on Website", {
                integration: "HubSpot"
            });
        }
    };
    
    // Klaviyo Forms integration
    const handleKlaviyoForms = event => {
        const metaData = event.detail.metaData;
        if (metaData) {
            if (ai) {
                const email = metaData.$email;
                identify(email);
            }
            trackGoal("Submit Klaviyo Form", {
                integration: "Klaviyo",
                klaviyoFormId: event.detail.formId
            });
        }
    };    

    // Public API functions
    const identify = (email, customProps) => {
        log("Identify called with", email, customProps);
        
        if (typeof email === "string") {
            const processedEmail = pm ? hash(email.toLowerCase()) : email.toLowerCase();
            userIdentity = processedEmail;
            userObject.identity = processedEmail;
            
            // Cross-frame communication
            if (w.parent && w.parent.postMessage) {
                w.parent.postMessage({
                    name: "metricpal-identify",
                    identity: userIdentity
                }, "*");
            }
        } else if (typeof email === "object") {
            userObject.custom = Object.assign(userObject.custom || {}, email);
        }
        
        if (customProps && typeof customProps === "object") {
            userObject.custom = Object.assign(userObject.custom || {}, customProps);
        }
        
        addAction("identify", null);
    };
    
    const addSharedProperty = ({ key, value, properties }) => {
        const sharedProperty = { key, value, properties };
        log("Shared property called with", JSON.stringify(sharedProperty));
        
        try {
            const existingIndex = userObject.shared.findIndex(prop => prop.key === key);
            if (existingIndex !== -1) {
                userObject.shared.splice(existingIndex, 1, sharedProperty);
            } else {
                userObject.shared.push(sharedProperty);
            }
        } catch (e) {
            err(e, { operation: "addSharedProperty", sharedObject: sharedProperty });
        }
    };
    
    const trackGoal = (goalName, goalProperties = {}, goalDate) => {
        log("Goal called with", goalName, JSON.stringify(goalProperties), goalDate);
        
        const url = w.location.origin + w.location.pathname + w.location.search;
        const action = {
            actionName: goalName,
            actionProperties: goalProperties,
            actionType: "custom",
            actionDate: goalDate ? 
                new Date(goalDate).toISOString() : 
                (sessionEnded ? new Date(sessionStart.getTime()).toISOString() : new Date().toISOString())
        };
        
        al.push({
            action: action,
            url: url.toLowerCase()
        });
    };
    
    // Session tracking initialization
    const trackSession = () => {
        sessionEnded = false;
        
        // Page hide/show events
        addEventListener(w, "pagehide", () => {
            if (!pageUnloaded) {
                pageUnloaded = true;
                endSession();
            }
        });
        
        // Mobile-specific pageshow handling
        if (isMobile) {
            addEventListener(w, "pageshow", event => {
                if (event.persisted) {
                    initSession();
                }
            });
        }
        
        // Focus tracking for session management
        let hasFocus = d.hasFocus();
        setInterval(() => {
            const currentFocus = d.hasFocus();
            if (hasFocus !== currentFocus) {
                hasFocus = currentFocus;
                if (hasFocus) {
                    pageUnloaded = false;
                    updateActivity();
                } else if (isMobile && !pageUnloaded) {
                    pageUnloaded = true;
                    endSession();
                }
            }
        }, 500);
        
        // Mouse tracking for click validation
        addEventListener(d, "mouseover", () => {
            w.innerPageClick = true;
        });
        
        addEventListener(d, "mouseleave", () => {
            w.innerPageClick = false;
        });
        
        // Activity tracking
        addEventListener(w, "mousemove", updateActivity);
        addEventListener(w, "mousedown", handleClick);
        addEventListener(w, "keydown", updateActivity);
        
        // Scroll tracking
        let maxScroll = 0;
        addEventListener(w, "scroll", () => {
            updateActivity();
            maxScroll = Math.max(maxScroll, w.scrollY, d.body.scrollTop, d.documentElement.scrollTop);
            if (maxScroll > maxScrollDepth) {
                maxScrollDepth = maxScroll;
            }
        });
        
        // Form tracking with dynamic detection
        trackedForms = [...d.querySelectorAll("form")];
        trackedForms.forEach(form => addEventListener(form, "submit", handleFormSubmit));
        
        setInterval(() => {
            const newForms = [...d.querySelectorAll("form")].filter(form => !trackedForms.includes(form));
            newForms.forEach(form => addEventListener(form, "submit", handleFormSubmit));
            trackedForms = trackedForms.concat(newForms);
        }, 5000);
        
        // Fallback form submission handler
        addEventListener(w, "submit", event => {
            if (!trackedForms.includes(event.target)) {
                handleFormSubmit(event);
            }
        });
        
        // Cross-frame message handling
        addEventListener(w, "message", handleMessage);
        
        // Klaviyo integration
        addEventListener(w, "klaviyoForms", handleKlaviyoForms);
        
        // Activity counter for session timeout
        const activityInterval = setInterval(() => {
            activityCounter++;
            if (activityCounter >= 10) {
                clearInterval(activityInterval);
                sessionEnded = true;
                endSession();
            }
        }, 60000); // Check every minute
    }; 
   
    // Interval data sending
    const sendIntervalData = () => {
        setTimeout(() => {
            if (d.hasFocus()) {
                iv += ivInc; // Increase interval
                endSession(true);
                sendIntervalData();
            } else {
                sendIntervalData();
            }
        }, iv);
    };
    
    // Page change monitoring
    setInterval(() => {
        checkPageChange();
    }, 500);
    
    // Initialization function
    const init = apiKey => {
        if (isBot() || navigator.webdriver) return;
        
        try {
            // Dummy check
            0;
        } catch (e) {
            return;
        }
        
        mp.apiKey = apiKey;
        sessionStart = new Date();
        
        // Initialize UUID handling
        if (!getCookie('mp_uuid') && !cl) {
            setCookie('mp_uuid', uuid(), 365);
        } else if (getCookie('mp_uuid') && cl) {
            vid = getCookie('mp_uuid');
            removeCookie('mp_uuid');
        }
        
        // Set up objects
        customerObject.apiKey = mp.apiKey;
        userObject.uuid = cl ? vid : getCookie('mp_uuid');
        
        // Auto-identify from URL parameters
        autoIdentifyFromURL();
        
        // Initialize tracking
        addAction("enter-page", null);
        sendData("beacon");
        
        // Start session tracking
        trackSession();
        sendIntervalData();
    };
    
    // Process pre-load queue
    const processQueue = () => {
        while (w.clientTrackerQueue && w.clientTrackerQueue.length > 0) {
            const item = w.clientTrackerQueue.shift();
            if (Array.isArray(item) && item.length > 0) {
                const method = item[0];
                const args = item.slice(1);
                if (typeof mp[method] === "function") {
                    try {
                        mp[method](...args);
                    } catch (e) {
                        err(e, { operation: "processQueue", method });
                    }
                }
            }
        }
    };
    
    // Expose public API
    Object.assign(mp, {
        initialized: true,
        init,
        sendIntervalData,
        endSession,
        trackSession,
        identify,
        addSharedProperty,
        goal: trackGoal,
        getClickInfo: getElementInfo,
        
        // Additional API methods
        trackEvent: (name, props = {}) => {
            trackGoal(name, props);
        },
        
        getVisitorId: () => vid,
        getUserIdentity: () => userIdentity,
        isIdentified: () => !!userIdentity,
        sendData,
        
        getConfig: () => ({
            apiKey: ak,
            cookieless: cl,
            privacyMode: pm,
            autoIdentify: ai,
            onlyIdentify: oi,
            debug: db,
            deviceType: deviceType,
            isMobile: isMobile
        })
    });
    
    // Initialize with API key
    if (ak) {
        init(ak);
    }
    
    // Set up command queue
    w.MetricPal = mp;
    w.clientTrackerQueue = w.clientTrackerQueue || [];
    processQueue();
    
    return mp;
    
})(window, document);

// Process any queued commands
if (window.metricpalQueue) {
    window.metricpalQueue.forEach(command => command());
}