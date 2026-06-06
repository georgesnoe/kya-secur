// ============================================================
//  CONFIGURATION — À adapter avec la personne qui gère le back
// ============================================================
// Renseignez ici les URL fournies par le développeur backend.
// Le frontend enverra :
//   - QR    : POST { code: "<contenu du QR>" }   -> réponse { valid: true|false, message? }
//   - VISAGE: POST { image: "<dataURL base64>", code: "<QR validé>" }
//             -> réponse { valid: true|false, message? }
// ============================================================

window.APP_CONFIG = {
    // Adresse de base du backend (Kya Secur)
    API_BASE: "http://192.168.1.124:3000",

    // URL du backend pour valider le QR code
    QR_ENDPOINT: "/api/scan/qr",

    // URL du backend pour la reconnaissance faciale
    FACE_ENDPOINT: "/api/scan/face",

    // Mettre à true pour simuler les réponses (test sans backend).
    DEMO_MODE: false,

    // Active/désactive l'étape de reconnaissance faciale.
    // false = après un QR valide on revient directement au scan QR (pas d'étape visage).
    FACE_RECOGNITION_ENABLED: true,

    // Durée d'affichage du résultat (coche/croix) en millisecondes
    RESULT_DURATION_MS: 1800,

    // Volume du bip (0 à 1)
    BEEP_VOLUME: 0.4,

    // URL des modèles de détection de visage (librairie face-api.js)
    FACE_MODEL_URL: "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model",

    // Nombre d'images consécutives avec visage avant de déclencher (anti-faux positif)
    FACE_STABLE_FRAMES: 6,
};
