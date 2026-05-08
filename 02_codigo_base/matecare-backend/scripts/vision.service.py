"""
MateCare — Deep Vision Engine v3.0
==================================
Deep Vision mejorado + Sistema de Dos Agentes (La Intérprete + El Copiloto)

Capas de análisis:
  1. DeepFace (v2) → Emoción, edad, género
  2. Mediapipe Tasks (v3) → EAR (fatiga), tensión mandibular
  3. YOLOv8-Pose (Mejorado) → Postura + Ángulo de cabeza
  4. YOLOv8-Detección (NUEVO) → Objetos de contexto (estrés/confort/social)
  5. ColorThief (NUEVO) → Paleta cromática y mood de color
"""

from flask import Flask, request, jsonify
import base64, io, os, time, logging, math
import numpy as np
from PIL import Image
from concurrent.futures import ThreadPoolExecutor
import cv2
from colorthief import ColorThief
from io import BytesIO

# Importación de Mediapipe Tasks
try:
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
except ImportError:
    mp = None

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("matecare-vision")

app = Flask(__name__)
INTERNAL_TOKEN = os.environ.get("DEEPFACE_TOKEN", "matecare-internal-secret")

# ─── Carga lazy de modelos ───────────────────────────────────────────────────

_deepface_loaded = False
_yolo_model = None
_obj_model = None
_face_landmarker = None

def load_deepface():
    global _deepface_loaded
    if not _deepface_loaded:
        try:
            from deepface import DeepFace
            log.info("[Init] Verificando DeepFace...")
            # En v0.0.99+ no es necesario cargar modelos individuales explícitamente así
            _deepface_loaded = True
            log.info("[Init] DeepFace listo.")
        except Exception as e:
            log.warning(f"[Init] DeepFace no disponible: {e}")

def load_yolo():
    global _yolo_model
    if _yolo_model is None:
        from ultralytics import YOLO
        log.info("[Init] Cargando YOLOv8-pose...")
        _yolo_model = YOLO("yolov8n-pose.pt")
        log.info("[Init] YOLOv8-pose listo.")

def load_obj_model():
    global _obj_model
    if _obj_model is None:
        from ultralytics import YOLO
        log.info("[Init] Cargando YOLOv8-det...")
        _obj_model = YOLO("yolov8n.pt")
        log.info("[Init] YOLOv8-det listo.")

def load_mediapipe():
    global _face_landmarker
    if _face_landmarker is None and mp is not None:
        try:
            log.info("[Init] Cargando Mediapipe FaceLandmarker...")
            # Buscar el modelo en la carpeta del script o en la actual
            script_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(script_dir, "face_landmarker.task")
            
            if not os.path.exists(model_path):
                # Fallback a la carpeta raíz por si acaso
                model_path = "face_landmarker.task"
            
            if not os.path.exists(model_path):
                log.warning(f"[Init] Modelo {model_path} no encontrado.")
                return
            
            base_options = python.BaseOptions(model_asset_path=model_path)
            options = vision.FaceLandmarkerOptions(
                base_options=base_options,
                output_face_blendshapes=True,
                output_facial_transformation_matrixes=True,
                num_faces=1)
            _face_landmarker = vision.FaceLandmarker.create_from_options(options)
            log.info("[Init] Mediapipe listo.")
        except Exception as e:
            log.warning(f"[Init] Error cargando Mediapipe: {e}")

# ─── Capas de Análisis ───────────────────────────────────────────────────────

# Capa 1: DeepFace
def analyze_face_deepface(img_bgr):
    try:
        from deepface import DeepFace
        result = DeepFace.analyze(img_path=img_bgr, actions=["emotion"], enforce_detection=False, silent=True)
        face = result[0] if isinstance(result, list) else result
        return {
            "emotion": face.get("dominant_emotion", "neutral"),
            "all_emotions": face.get("emotion", {}),
            "confidence": face.get("face_confidence", 0.0)
        }
    except Exception as e:
        log.warning(f"[DeepFace] Error: {e}")
        return {"emotion": "neutral", "all_emotions": {}, "confidence": 0.0}

# Capa 2: Mediapipe Facial Signals (EAR, Jaw Tension)
def get_facial_signals(img_rgb):
    try:
        load_mediapipe()
        if _face_landmarker is None:
            return {"ear": None, "jaw_tension": None}
        
        # Mediapipe requiere mp.Image
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
        results = _face_landmarker.detect(mp_image)
        
        if not results or not results.face_landmarks:
            return {"ear": None, "jaw_tension": None}
        
        lm = results.face_landmarks[0]
        
        # Eye Aspect Ratio (EAR) — usando puntos 159, 145 (vertical) y 33, 133 (horizontal)
        # En la nueva API lm[i] es un objeto con x, y, z
        ear = abs(lm[159].y - lm[145].y) / (abs(lm[33].x - lm[133].x) + 1e-6)
        
        # Tensión mandibular — Distancia mentón (152) vs base nariz (1)
        jaw_tension = abs(lm[152].y - lm[1].y)
        
        return {
            "ear": round(float(ear), 3),          
            "jaw_tension": round(float(jaw_tension), 3)
        }
    except Exception as e:
        log.warning(f"[Mediapipe] Error: {e}")
        return {"ear": None, "jaw_tension": None}

# Capa 3: YOLO Pose + Head Tilt
def get_pose_and_tilt(img_rgb):
    try:
        load_yolo()
        results = _yolo_model(img_rgb, verbose=False)
        if not results or not results[0].keypoints or len(results[0].keypoints.xy) == 0:
            return {"posture": "neutral", "head_tilt": -90, "keypoints": None}

        kp = results[0].keypoints.xy[0].cpu().numpy()
        if kp.shape[0] < 7:
            return {"posture": "neutral", "head_tilt": -90, "keypoints": None}

        # Head Tilt: Nariz (0) vs Punto medio hombros (5, 6)
        nose = kp[0]
        mid_shoulder_y = (kp[5][1] + kp[6][1]) / 2
        mid_shoulder_x = (kp[5][0] + kp[6][0]) / 2
        angle = math.degrees(math.atan2(nose[1] - mid_shoulder_y, nose[0] - mid_shoulder_x))

        # Postura
        shoulder_width = abs(kp[5][0] - kp[6][0])
        img_width = img_rgb.shape[1]
        openness = shoulder_width / (img_width + 1e-6)
        posture = "closed" if openness < 0.15 else "open" if openness > 0.25 else "neutral"

        return {
            "posture": posture,
            "head_tilt": round(angle, 1),
            "keypoints": kp.tolist()
        }
    except Exception as e:
        log.warning(f"[YOLO Pose] Error: {e}")
        return {"posture": "neutral", "head_tilt": -90, "keypoints": None}

# Capa 4: Objetos de Contexto
STRESS_OBJECTS   = {"laptop", "keyboard", "book", "cup", "cell phone"}
COMFORT_OBJECTS  = {"bed", "couch", "bottle", "wine glass", "teddy bear"}
SOCIAL_OBJECTS   = {"dining table", "chair", "fork", "knife"}

def classify_environment_objects(img_rgb):
    try:
        load_obj_model()
        results = _obj_model(img_rgb, verbose=False)
        detected_classes = [results[0].names[int(c)] for c in results[0].boxes.cls]
        
        stress  = len([c for c in detected_classes if c in STRESS_OBJECTS])
        comfort = len([c for c in detected_classes if c in COMFORT_OBJECTS])
        social  = len([c for c in detected_classes if c in SOCIAL_OBJECTS])
        
        if stress > comfort and stress > social:
            return "work_stress"
        if comfort >= stress:
            return "rest_comfort"
        return "social_active"
    except Exception as e:
        log.warning(f"[YOLO Det] Error: {e}")
        return "unknown"

# Capa 5: Paleta Cromática
def get_color_mood(image_bytes: bytes) -> str:
    try:
        ct = ColorThief(BytesIO(image_bytes))
        r, g, b = ct.get_color(quality=1)
        
        if r > 180 and g > 140 and b < 100:
            return "warm_energized"
        if b > r and b > g:
            return "cool_stressed"
        if r < 80 and g < 80 and b < 80:
            return "dark_withdrawn"
        return "neutral"
    except Exception as e:
        log.warning(f"[ColorThief] Error: {e}")
        return "neutral"

# ─── Lógica de Discrepancia ──────────────────────────────────────────────────

def detect_discrepancy(emotion: str, ear: float, posture: str) -> bool:
    positive_emotions = {"happy", "surprise"}
    if emotion in positive_emotions:
        if ear is not None and ear < 0.25:
            return True
        if posture == "closed":
            return True
    return False

def detect_suppression(emotion: str, ear: float) -> bool:
    return emotion in {"happy", "neutral"} and (ear is not None and ear < 0.22)

# ─── Orquestación ────────────────────────────────────────────────────────────

def synthesize_v3(deepface, mediapipe, yolo, env_context, color_mood):
    emotion = deepface["emotion"]
    ear = mediapipe["ear"]
    posture = yolo["posture"]
    angle = yolo["head_tilt"]

    discrepancy = detect_discrepancy(emotion, ear, posture)
    suppression = detect_suppression(emotion, ear)

    # fatigue_signal
    fatigue = "low"
    if ear is not None:
        if ear < 0.23: fatigue = "high"
        elif ear < 0.26: fatigue = "medium"

    # head_tilt_signal
    tilt_signal = "neutral"
    if angle < -100 or angle > -80:
        tilt_signal = "open"
    elif angle < -115: 
        tilt_signal = "withdrawn"

    # emotional_tone
    tone = "Calm"
    if suppression: tone = "Suppressed Fatigue"
    elif emotion in {"happy", "surprise"}: tone = "Genuine Joy"
    elif emotion in {"angry", "sad", "fear"}: tone = "Stress"

    # social_energy
    energy = "Medium"
    if fatigue == "high" or posture == "closed": energy = "Low (Recharging)"
    elif emotion == "happy" and posture == "open": energy = "High"

    return {
        "estimated_style": "Casual/Comfort",
        "social_energy": energy,
        "emotional_tone": tone,
        "visual_discrepancy": discrepancy,
        "tactical_confidence": round(deepface["confidence"], 2),
        "fatigue_signal": fatigue,
        "environment_context": env_context,
        "color_mood": color_mood,
        "head_tilt_signal": tilt_signal,
        "suppression_detected": suppression
    }

# ─── Servidor ────────────────────────────────────────────────────────────────

@app.route("/analyze", methods=["POST"])
def analyze():
    token = request.headers.get("X-Internal-Token", "")
    if token != INTERNAL_TOKEN:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    if not data or "image" not in data:
        return jsonify({"error": "Missing 'image'"}), 400

    try:
        img_b64 = data["image"]
        if "," in img_b64: img_b64 = img_b64.split(",")[1]
        img_bytes = base64.b64decode(img_b64)
        img_pil = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        img_rgb = np.array(img_pil)
        img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
        
        # Ejecutamos secuencialmente o con cautela para evitar conflictos de modelos en RAM
        res_df = analyze_face_deepface(img_bgr)
        res_mp = get_facial_signals(img_rgb)
        res_yo = get_pose_and_tilt(img_rgb)
        res_env = classify_environment_objects(img_rgb)
        res_col = get_color_mood(img_bytes)

        context = synthesize_v3(res_df, res_mp, res_yo, res_env, res_col)
        return jsonify(context)

    except Exception as e:
        log.error(f"Error en analyze: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    load_deepface()
    load_mediapipe()
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
