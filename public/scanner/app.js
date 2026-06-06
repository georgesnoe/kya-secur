/* ============================================================
   Scanner QR + Reconnaissance faciale — Frontend
   ============================================================ */

const CFG = window.APP_CONFIG;

// --- Éléments DOM ---
const subtitle = document.getElementById("subtitle");
const stageQr = document.getElementById("stage-qr");
const stageFace = document.getElementById("stage-face");
const stepEls = document.querySelectorAll(".step");
const faceVideo = document.getElementById("face-video");
const faceHint = document.getElementById("face-hint");
const captureCanvas = document.getElementById("capture-canvas");
const overlay = document.getElementById("result-overlay");
const resultText = document.getElementById("result-text");
const torchBtn = document.getElementById("torch-btn");
const switchCamBtn = document.getElementById("switch-cam-btn");

// --- État ---
let qrScanner = null;
let faceStream = null;
let userId = null; // identifiant utilisateur renvoyé par le scan QR
let busy = false; // évite les doubles validations
let cameras = []; // liste des caméras disponibles
let currentCamIndex = 0; // caméra utilisée
let torchOn = false; // état de la lampe torche
let detecting = false; // détection de visage en cours
let stableFrames = 0; // nombre d'images consécutives avec visage
let faceApiLoaded = false; // modèle face-api chargé

/* ---------- Son : bip via Web Audio API ---------- */
let audioCtx = null;
function beep(success = true) {
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "square";
        // bip aigu si succès, bip grave si erreur
        osc.frequency.value = success ? 1000 : 320;
        gain.gain.value = CFG.BEEP_VOLUME;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.18);
        osc.stop(audioCtx.currentTime + 0.18);
    } catch (e) {
        console.warn("Bip impossible :", e);
    }
}

/* ---------- Affichage du résultat (coche / croix) ---------- */
function showResult(success, message) {
    beep(success);
    overlay.classList.remove("success", "error");
    overlay.classList.add(success ? "success" : "error");
    resultText.textContent = message || (success ? "Validé" : "Refusé");
    overlay.classList.add("show");

    return new Promise((resolve) => {
        setTimeout(() => {
            overlay.classList.remove("show");
            resolve();
        }, CFG.RESULT_DURATION_MS);
    });
}

/* ---------- Navigation entre étapes ---------- */
function setStep(name) {
    stepEls.forEach((el) => {
        el.classList.remove("active");
        if (el.dataset.step === name) el.classList.add("active");
        if (el.dataset.step === "qr" && name === "face") el.classList.add("done");
    });
}

function goToFaceStage() {
    setStep("face");
    subtitle.textContent = "Étape 2 — Reconnaissance faciale";
    stageQr.classList.remove("active");
    stageFace.classList.add("active");
    startFaceCamera();
}

/* ============================================================
   ÉTAPE 1 — SCAN DU QR CODE
   ============================================================ */
function qrConfig() {
    // qrbox adaptatif (60% de la zone) + détecteur natif si dispo = scan plus rapide
    const box = Math.round(Math.min(280, window.innerWidth * 0.7) * 0.85);
    const cfg = {
        fps: 15,
        qrbox: { width: box, height: box },
        aspectRatio: 1.0,
        disableFlip: false,
    };
    // Utilise le BarcodeDetector natif du navigateur s'il existe (bien plus efficace)
    if ("BarcodeDetector" in window) {
        cfg.experimentalFeatures = { useBarCodeDetectorIfSupported: true };
    }
    return cfg;
}

async function startQrScanner() {
    // 1) Vérifie que le navigateur autorise la caméra (contexte sécurisé requis)
    if (!window.isSecureContext) {
        showCameraError(
            "Page non sécurisée. Ouvrez le site via http://localhost ou en HTTPS (pas en ouvrant le fichier directement)."
        );
        return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showCameraError(
            "Ce navigateur ne donne pas accès à la caméra ici. Essayez Chrome/Edge via http://localhost ou en HTTPS."
        );
        return;
    }

    qrScanner = new Html5Qrcode("qr-reader", { verbose: false });

    // Récupère la liste des caméras pour pouvoir en changer / cibler l'arrière
    try {
        cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 1) {
            switchCamBtn.classList.remove("hidden");
            // privilégie une caméra arrière par défaut
            const backIdx = cameras.findIndex((c) =>
                /back|arrière|rear|environment/i.test(c.label)
            );
            currentCamIndex = backIdx >= 0 ? backIdx : 0;
        }
    } catch (e) {
        console.warn("Impossible de lister les caméras :", e);
    }

    const camId =
        cameras && cameras.length
            ? cameras[currentCamIndex].id
            : { facingMode: "environment" };

    try {
        await qrScanner.start(camId, qrConfig(), onQrDetected, () => {});
        setupTorchButton();
    } catch (err) {
        console.error("Erreur caméra QR :", err);
        // Repli : retente avec une contrainte simple si l'id de caméra a échoué
        if (cameras && cameras.length) {
            try {
                await qrScanner.start(
                    { facingMode: "environment" },
                    qrConfig(),
                    onQrDetected,
                    () => {}
                );
                setupTorchButton();
                return;
            } catch (err2) {
                showCameraError(describeCamError(err2));
                return;
            }
        }
        showCameraError(describeCamError(err));
    }
}

// Affiche l'erreur précise dans l'interface
function showCameraError(msg) {
    subtitle.textContent = "Caméra inaccessible";
    const reader = document.getElementById("qr-reader");
    if (reader) {
        reader.innerHTML =
            '<div style="padding:18px;font-size:13px;line-height:1.5;color:#ff8a8a;text-align:center;display:flex;align-items:center;height:100%;justify-content:center">' +
            msg +
            "</div>";
    }
}

// Traduit l'erreur technique en message compréhensible
function describeCamError(err) {
    const name = (err && err.name) || "";
    switch (name) {
        case "NotAllowedError":
        case "SecurityError":
            return "Accès à la caméra refusé. Cliquez sur l'icône cadenas du navigateur et autorisez la caméra, puis rechargez.";
        case "NotFoundError":
        case "OverconstrainedError":
            return "Aucune caméra compatible trouvée sur cet appareil.";
        case "NotReadableError":
            return "La caméra est déjà utilisée par une autre application (Zoom, Teams, etc.). Fermez-la puis rechargez.";
        default:
            return (
                "Erreur caméra : " +
                ((err && (err.message || err.name)) || "inconnue") +
                ". Ouvrez le site en http://localhost ou en HTTPS."
            );
    }
}

/* ---------- Lampe torche (flash) ---------- */
function setupTorchButton() {
    let canTorch = false;
    try {
        const caps = qrScanner.getRunningTrackCapabilities();
        canTorch = !!(caps && caps.torch);
    } catch (e) {}
    torchBtn.classList.toggle("hidden", !canTorch);
    torchOn = false;
    torchBtn.classList.remove("on");
}

torchBtn.addEventListener("click", async () => {
    if (!qrScanner) return;
    torchOn = !torchOn;
    try {
        await qrScanner.applyVideoConstraints({
            advanced: [{ torch: torchOn }],
        });
        torchBtn.classList.toggle("on", torchOn);
    } catch (e) {
        console.warn("Lampe torche non supportée :", e);
        torchOn = false;
    }
});

/* ---------- Changer de caméra ---------- */
switchCamBtn.addEventListener("click", async () => {
    if (!cameras || cameras.length < 2 || busy) return;
    currentCamIndex = (currentCamIndex + 1) % cameras.length;
    try {
        await qrScanner.stop();
    } catch (e) {}
    try {
        await qrScanner.start(
            cameras[currentCamIndex].id,
            qrConfig(),
            onQrDetected,
            () => {}
        );
        setupTorchButton();
    } catch (e) {
        console.error("Changement de caméra impossible :", e);
    }
});

async function onQrDetected(decodedText) {
    if (busy) return;
    busy = true;
    // met en pause le flux live pendant la validation
    try {
        await qrScanner.pause(true);
    } catch (e) {}
    await handleQrValue(decodedText, true);
}

// Logique partagée entre le scan live et le scan depuis une photo
async function handleQrValue(decodedText, fromLive) {
    const result = await validateQr(decodedText);

    if (result.valid) {
        userId = result.userId;
        await showResult(true, result.message || "QR code valide");
        await stopQrScanner();
        // on passe au visage seulement si le backend le demande (needFaceScan)
        // ET que la reconnaissance faciale est activée côté frontend
        if (CFG.FACE_RECOGNITION_ENABLED && result.needFaceScan) {
            goToFaceStage();
        } else {
            // pas d'étape visage : accès accordé, retour direct au scan QR
            resetToScan();
        }
    } else {
        await showResult(false, result.message || "QR code invalide");
        if (fromLive) {
            try {
                await qrScanner.resume();
            } catch (e) {}
        }
    }
    busy = false;
}

async function stopQrScanner() {
    if (qrScanner) {
        try {
            await qrScanner.stop();
            await qrScanner.clear();
        } catch (e) {}
        qrScanner = null;
    }
}

/* ============================================================
   ÉTAPE 2 — RECONNAISSANCE FACIALE
   ============================================================ */
async function startFaceCamera() {
    try {
        faceStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
            audio: false,
        });
        faceVideo.srcObject = faceStream;
        // démarre la détection automatique une fois la vidéo prête
        faceVideo.onloadedmetadata = () => {
            faceVideo.play().catch(() => {});
            startFaceDetection();
        };
    } catch (err) {
        subtitle.textContent = "Caméra frontale inaccessible";
        console.error("Erreur caméra visage :", err);
    }
}

/* ---------- Détection automatique du visage ---------- */
async function startFaceDetection() {
    detecting = true;
    stableFrames = 0;
    setFaceHint("Recherche du visage…");

    // 1) Détecteur natif du navigateur (le plus léger), s'il existe
    if ("FaceDetector" in window) {
        try {
            const fd = new window.FaceDetector({ maxDetectedFaces: 1, fastMode: true });
            nativeDetectLoop(fd);
            return;
        } catch (e) {
            console.warn("FaceDetector natif indisponible, repli face-api :", e);
        }
    }

    // 2) Repli : librairie face-api.js
    try {
        await loadFaceApi();
        faceApiDetectLoop();
    } catch (e) {
        console.error("Détection de visage indisponible :", e);
        // 3) Dernier repli : capture automatique après un court délai
        setFaceHint("Détection auto indisponible — capture dans 3 s");
        setTimeout(() => {
            if (detecting) triggerFaceRecognition();
        }, 3000);
    }
}

async function nativeDetectLoop(fd) {
    if (!detecting) return;
    try {
        const faces = await fd.detect(faceVideo);
        onFaceFrame(faces && faces.length > 0);
    } catch (e) {
        // certains navigateurs lèvent une erreur ; on bascule sur face-api
        detecting && console.warn("Erreur détecteur natif :", e);
    }
    if (detecting) requestAnimationFrame(() => nativeDetectLoop(fd));
}

async function loadFaceApi() {
    if (faceApiLoaded) return;
    if (typeof faceapi === "undefined") throw new Error("face-api non chargé");
    await faceapi.nets.tinyFaceDetector.loadFromUri(CFG.FACE_MODEL_URL);
    faceApiLoaded = true;
}

function faceApiDetectLoop() {
    if (!detecting) return;
    const opts = new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,
        scoreThreshold: 0.5,
    });
    faceapi
        .detectSingleFace(faceVideo, opts)
        .then((det) => onFaceFrame(!!det))
        .catch(() => {})
        .finally(() => {
            if (detecting) setTimeout(faceApiDetectLoop, 180);
        });
}

// Appelé à chaque image : compte les détections stables avant de déclencher
function onFaceFrame(found) {
    if (!detecting || busy) return;
    if (found) {
        stableFrames++;
        setFaceHint("Visage détecté, ne bougez pas…");
        if (stableFrames >= CFG.FACE_STABLE_FRAMES) {
            triggerFaceRecognition();
        }
    } else {
        stableFrames = 0;
        setFaceHint("Recherche du visage…");
    }
}

function stopFaceDetection() {
    detecting = false;
    stableFrames = 0;
}

function setFaceHint(text) {
    if (faceHint) faceHint.textContent = text;
}

function stopFaceCamera() {
    stopFaceDetection();
    if (faceStream) {
        faceStream.getTracks().forEach((t) => t.stop());
        faceStream = null;
    }
}

function captureFaceImage() {
    const w = faceVideo.videoWidth || 480;
    const h = faceVideo.videoHeight || 480;
    captureCanvas.width = w;
    captureCanvas.height = h;
    const ctx = captureCanvas.getContext("2d");
    ctx.drawImage(faceVideo, 0, 0, w, h);
    return captureCanvas.toDataURL("image/jpeg", 0.85);
}

// Déclenchée automatiquement dès qu'un visage stable est détecté
async function triggerFaceRecognition() {
    if (busy) return;
    busy = true;
    stopFaceDetection();
    setFaceHint("Analyse en cours…");

    const image = captureFaceImage();
    const result = await validateFace(image, userId);

    if (result.valid) {
        await showResult(true, result.message || "Visage reconnu");
        stopFaceCamera();
        finishFlow();
    } else {
        await showResult(false, result.message || "Visage non reconnu");
        // échec : retour immédiat au scan QR
        stopFaceCamera();
        resetToScan();
    }
}

// Après la confirmation finale, on revient automatiquement au scan QR
function finishFlow() {
    resetToScan();
}

/* ============================================================
   APPELS BACKEND (gérés par l'équipe backend)
   ============================================================ */
async function validateQr(code) {
    if (CFG.DEMO_MODE) {
        await wait(400);
        return { valid: !!code, needFaceScan: true, message: code ? "QR code valide" : "QR vide", userId: "demo-user" };
    }
    try {
        const res = await fetch(CFG.API_BASE + CFG.QR_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qrcode: code }),
        });
        const json = await res.json();
        const valid = !!(json.success && json.match);
        return {
            valid,
            needFaceScan: !!json.needFaceScan,
            userId: json.data ? json.data.id : null,
            message: valid
                ? "Bienvenue " + ((json.data && json.data.name) || "")
                : json.error || "QR code invalide",
        };
    } catch (e) {
        console.error("Erreur API QR :", e);
        return { valid: false, message: "Serveur injoignable" };
    }
}

async function validateFace(image, userId) {
    if (CFG.DEMO_MODE) {
        await wait(900);
        return { valid: true, message: "Visage reconnu" };
    }
    try {
        // le backend attend du base64 brut (sans le préfixe "data:image/...;base64,")
        const base64 = image.includes(",") ? image.split(",")[1] : image;
        const res = await fetch(CFG.API_BASE + CFG.FACE_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, image: base64 }),
        });
        const json = await res.json();
        const valid = !!(json.success && json.match);
        return {
            valid,
            message: valid
                ? "Visage reconnu" + (json.data && json.data.name ? " — " + json.data.name : "")
                : json.error || "Visage non reconnu",
        };
    } catch (e) {
        console.error("Erreur API visage :", e);
        return { valid: false, message: "Serveur injoignable" };
    }
}

/* ---------- Retour automatique au scan QR ---------- */
function resetToScan() {
    userId = null;
    busy = false;
    stopFaceCamera();
    stageFace.classList.remove("active");
    stageQr.classList.add("active");
    setStep("qr");
    stepEls.forEach((el) => el.classList.remove("done"));
    subtitle.textContent = "Étape 1 — Scannez votre QR code";
    startQrScanner();
}

/* ---------- Utilitaire ---------- */
function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

/* ---------- Démarrage ---------- */
window.addEventListener("load", startQrScanner);
