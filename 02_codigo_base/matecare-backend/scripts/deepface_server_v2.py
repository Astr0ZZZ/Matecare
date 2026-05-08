"""
MateCare — DeepFace Advanced Vision Server v2.0
================================================
5 capas de análisis en paralelo:
  1. DeepFace     → emoción, edad, género (núcleo)
  2. YOLOv8-pose  → lenguaje corporal, postura, nivel de energía física
  3. Places365    → clasificación de escena (hogar/trabajo/exterior/restaurante…)
  4. OpenCV HSV   → temperatura de color ambiental, brillo, hora inferida
  5. Ropa (color) → paleta dominante del cuerpo → casual/formal/sport/cómodo

Instalación:
  pip install flask deepface tf-keras pillow ultralytics torch torchvision

Uso:
  DEEPFACE_TOKEN=tu-secreto python deepface_server_v2.py
"""

from flask import Flask, request, jsonify
import base64, io, os, time, logging
import numpy as np
from PIL import Image
from concurrent.futures import ThreadPoolExecutor, as_completed

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("matecare-vision")

app = Flask(__name__)
INTERNAL_TOKEN = os.environ.get("DEEPFACE_TOKEN", "matecare-internal-secret")

# ─── Carga lazy de modelos pesados ─────────────────────────────────────────

_deepface_models = {}
_yolo_model = None
_places_model = None
_places_classes = None
_places_labels = None  # indoor/outdoor labels

def load_deepface():
    """Pre-carga los modelos de DeepFace en memoria para respuestas rápidas."""
    from deepface.extendedmodels import Emotion, Age, Gender
    global _deepface_models
    if not _deepface_models:
        log.info("[Init] Cargando modelos DeepFace...")
        _deepface_models["emotion"] = Emotion.loadModel()
        _deepface_models["age"]     = Age.loadModel()
        _deepface_models["gender"]  = Gender.loadModel()
        log.info("[Init] DeepFace listo.")

def load_yolo():
    global _yolo_model
    if _yolo_model is None:
        from ultralytics import YOLO
        log.info("[Init] Cargando YOLOv8-pose...")
        _yolo_model = YOLO("yolov8n-pose.pt")  # descarga automática (~7MB)
        log.info("[Init] YOLOv8-pose listo.")

def load_places():
    global _places_model, _places_classes, _places_labels
    if _places_model is None:
        try:
            import torch, torchvision.models as models
            log.info("[Init] Cargando Places365 (ResNet18)...")
            model = models.__dict__["resnet18"](num_classes=365)
            model_file = "resnet18_places365.pth.tar"

            if not os.path.exists(model_file):
                import urllib.request
                url = "http://places2.csail.mit.edu/models_places365/resnet18_places365.pth.tar"
                log.info(f"[Init] Descargando {model_file}...")
                urllib.request.urlretrieve(url, model_file)

            checkpoint = torch.load(model_file, map_location="cpu")
            state_dict = {k.replace("module.", ""): v for k, v in checkpoint["state_dict"].items()}
            model.load_state_dict(state_dict)
            model.eval()
            _places_model = model

            # Categorías de escena
            classes_file = "categories_places365.txt"
            if not os.path.exists(classes_file):
                urllib.request.urlretrieve(
                    "https://raw.githubusercontent.com/csailvision/places365/master/categories_places365.txt",
                    classes_file
                )
            with open(classes_file) as f:
                _places_classes = [line.strip().split(" ")[0][3:] for line in f]

            # Labels indoor/outdoor
            labels_file = "IO_places365.txt"
            if not os.path.exists(labels_file):
                urllib.request.urlretrieve(
                    "https://raw.githubusercontent.com/csailvision/places365/master/IO_places365.txt",
                    labels_file
                )
            with open(labels_file) as f:
                _places_labels = {i: int(line.strip().split(" ")[-1]) for i, line in enumerate(f)}

            log.info("[Init] Places365 listo.")
        except Exception as e:
            log.warning(f"[Init] Places365 no disponible: {e}. Se usará heurística de color.")

# ─── Utilidades ─────────────────────────────────────────────────────────────

def decode_image(b64: str) -> Image.Image:
    if "," in b64:
        b64 = b64.split(",")[1]
    return Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")

def pil_to_numpy(img: Image.Image) -> np.ndarray:
    return np.array(img)

# ─── CAPA 1: DeepFace — emoción, edad, género ────────────────────────────────

EMOTION_MAP = {
    "happy":   "alegria",
    "sad":     "tristeza",
    "angry":   "irritabilidad",
    "fear":    "ansiedad",
    "surprise":"sorpresa",
    "disgust": "malestar",
    "neutral": "calma",
}

def analyze_face(img_array: np.ndarray) -> dict:
    try:
        from deepface import DeepFace
        result = DeepFace.analyze(
            img_path=img_array,
            actions=["emotion", "age", "gender"],
            enforce_detection=False,
            silent=True,
        )
        face = result[0] if isinstance(result, list) else result
        raw_emotion = face.get("dominant_emotion", "neutral")
        emotions_raw = face.get("emotion", {})

        return {
            "dominantEmotion": EMOTION_MAP.get(raw_emotion, "calma"),
            "allEmotions": {EMOTION_MAP.get(k, k): round(v, 1) for k, v in emotions_raw.items()},
            "estimatedAge": round(face.get("age", 0)),
            "gender": face.get("dominant_gender", "unknown"),
            "faceConfidence": round(face.get("face_confidence", 0.0), 2),
            "error": None,
        }
    except Exception as e:
        log.warning(f"[DeepFace] Error: {e}")
        return {"dominantEmotion": "calma", "allEmotions": {}, "estimatedAge": 0,
                "gender": "unknown", "faceConfidence": 0.0, "error": str(e)}

# ─── CAPA 2: YOLOv8-pose — lenguaje corporal ─────────────────────────────────

def analyze_posture(img_array: np.ndarray) -> dict:
    """
    Detecta postura corporal a partir de keypoints.
    Índices COCO: 0=nariz, 5/6=hombros, 7/8=codos, 11/12=caderas

    Devuelve:
      bodyLanguage: "cerrada" | "abierta" | "encorvada" | "relajada" | "tensa"
      activityLevel: "activa" | "pasiva" | "en_reposo"
      isLyingDown: bool
      isSitting: bool
    """
    defaults = {
        "bodyLanguage": "relajada",
        "activityLevel": "pasiva",
        "isLyingDown": False,
        "isSitting": False,
        "poseDetected": False,
    }
    try:
        load_yolo()
        results = _yolo_model(img_array, verbose=False)
        if not results or results[0].keypoints is None:
            return defaults

        kp = results[0].keypoints.xy[0].numpy()  # shape (17, 2)
        if kp.shape[0] < 13:
            return defaults

        nose      = kp[0]
        l_shoulder, r_shoulder = kp[5], kp[6]
        l_hip,     r_hip       = kp[11], kp[12]

        # Punto medio hombros y caderas
        mid_shoulder = (l_shoulder + r_shoulder) / 2
        mid_hip      = (l_hip + r_hip) / 2

        # Vector torso (hombro→cadera)
        torso_vec = mid_hip - mid_shoulder
        torso_angle = np.degrees(np.arctan2(abs(torso_vec[0]), abs(torso_vec[1]) + 1e-6))

        # ¿Tumbada? El torso es casi horizontal
        is_lying = torso_angle > 60

        # ¿Sentada? Hombros y caderas a altura similar, pero nariz mucho más arriba
        is_sitting = (not is_lying) and (mid_shoulder[1] - mid_hip[1] < 40)

        # Ancho de hombros como proxy de apertura corporal
        shoulder_width = abs(l_shoulder[0] - r_shoulder[0])
        img_width = img_array.shape[1]
        openness = shoulder_width / (img_width + 1e-6)

        body_language = "relajada"
        if openness < 0.12:
            body_language = "cerrada"
        elif openness > 0.30:
            body_language = "abierta"
        elif torso_angle > 15:
            body_language = "encorvada"

        # Nivel de actividad por bounding box del resultado
        bbox = results[0].boxes.xyxy[0].numpy() if len(results[0].boxes) > 0 else None
        activity = "pasiva"
        if bbox is not None:
            box_area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
            img_area  = img_array.shape[0] * img_array.shape[1]
            if box_area / img_area > 0.5:
                activity = "activa"

        return {
            "bodyLanguage":  body_language,
            "activityLevel": activity,
            "isLyingDown":   bool(is_lying),
            "isSitting":     bool(is_sitting),
            "poseDetected":  True,
        }
    except Exception as e:
        log.warning(f"[YOLO] Error: {e}")
        return defaults

# ─── CAPA 3: Places365 — clasificación de escena ─────────────────────────────

SCENE_MAP = {
    # HOGAR
    "bedroom": "hogar", "living_room": "hogar", "kitchen": "hogar",
    "bathroom": "hogar", "home_office": "hogar", "closet": "hogar",
    "dining_room": "hogar", "staircase": "hogar",
    # TRABAJO
    "office": "trabajo", "conference_room": "trabajo", "cubicle/office": "trabajo",
    "computer_room": "trabajo", "hospital_room": "trabajo", "laboratory": "trabajo",
    # OCIO / SOCIAL
    "restaurant": "restaurante", "coffee_shop": "cafe", "bar": "bar",
    "pub/indoor": "bar", "fast_food_restaurant": "restaurante",
    "gym/indoor_cycling": "gym", "gymnasium/indoor": "gym",
    "movie_theater/indoor": "cine", "bowling_alley": "ocio",
    # EXTERIOR / NATURALEZA
    "street": "exterior", "park": "exterior", "beach": "exterior",
    "forest": "exterior", "mountain": "exterior", "garden": "exterior",
    "patio": "exterior", "balcony/exterior": "exterior",
    # TIENDAS / OTROS
    "supermarket": "tienda", "shopping_mall/indoor": "tienda",
    "clothing_store": "tienda", "library/indoor": "biblioteca",
}

def analyze_scene(img: Image.Image) -> dict:
    defaults = {"environment": "hogar", "sceneCategory": "desconocido",
                "isIndoor": True, "sceneConfidence": 0.0}
    try:
        import torch
        import torchvision.transforms as T

        load_places()
        if _places_model is None:
            return defaults

        tf = T.Compose([T.Resize((256, 256)), T.CenterCrop(224), T.ToTensor(),
                        T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])])
        tensor = tf(img).unsqueeze(0)

        with torch.no_grad():
            logits = _places_model(tensor)
            probs  = torch.nn.functional.softmax(logits, dim=1)[0]

        top5_idx  = probs.topk(5).indices.tolist()
        top5_prob = probs.topk(5).values.tolist()

        top_category = _places_classes[top5_idx[0]] if _places_classes else "desconocido"
        top_conf     = round(top5_prob[0] * 100, 1)

        # Mapear a categoría útil para MateCare
        is_indoor = True
        if _places_labels:
            is_indoor = _places_labels.get(top5_idx[0], 1) == 1
        
        # Heurística extra: Si hay mucho brillo y azul (cielo) o verde (campo), es probable que sea exterior
        # aunque el modelo de escenas dude.
        img_np = np.array(img.resize((50, 50)))
        r, g, b = img_np[:,:,0].mean(), img_np[:,:,1].mean(), img_np[:,:,2].mean()
        avg_br = (r + g + b) / 3
        
        # Si es muy brillante y el azul/verde dominan, forzar exterior
        if avg_br > 180 and (b > r or g > r):
            is_indoor = False
            log.info("[Scene] Heurística de brillo/color forzó EXTERIOR")

        environment = "hogar" if is_indoor else "exterior"
        for cat, env in SCENE_MAP.items():
            if cat in top_category:
                environment = env
                break

        return {
            "environment":     environment,
            "sceneCategory":   top_category.replace("_", " "),
            "isIndoor":        is_indoor,
            "sceneConfidence": top_conf,
        }
    except Exception as e:
        log.warning(f"[Places365] Error: {e}")
        return defaults

# ─── CAPA 4: OpenCV HSV — luz ambiental y hora inferida ──────────────────────

def analyze_lighting(img_array: np.ndarray) -> dict:
    """
    Analiza temperatura de color y brillo para inferir:
      - lightCondition: "natural_diurna" | "artificial_cálida" | "artificial_fría" | "oscura"
      - timeOfDayHint:  "mañana" | "tarde" | "noche" | "desconocido"
      - ambientMood:    "energizante" | "relajante" | "intimo" | "neutro"
    """
    import cv2
    hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV).astype(np.float32)
    brightness = float(hsv[:, :, 2].mean())   # V canal: 0-255
    saturation = float(hsv[:, :, 1].mean())   # S canal

    # Temperatura de color: relación R vs B
    r_mean = float(img_array[:, :, 0].mean())
    g_mean = float(img_array[:, :, 1].mean())
    b_mean = float(img_array[:, :, 2].mean())
    warmth  = (r_mean - b_mean) / (r_mean + b_mean + 1e-6)  # >0 = cálido, <0 = frío

    # Clasificar condición de luz
    if brightness < 60:
        light_condition = "oscura"
        time_hint = "noche"
        mood = "intimo"
    elif warmth > 0.15 and brightness > 150:
        light_condition = "natural_diurna"
        time_hint = "tarde" if warmth > 0.25 else "mañana"
        mood = "energizante"
    elif warmth > 0.05:
        light_condition = "artificial_calida"
        time_hint = "noche"
        mood = "relajante"
    else:
        light_condition = "artificial_fria"
        time_hint = "desconocido"
        mood = "neutro"

    return {
        "lightCondition": light_condition,
        "timeOfDayHint":  time_hint,
        "ambientMood":    mood,
        "brightness":     round(brightness, 1),
        "colorWarmth":    round(warmth, 3),
    }

# ─── CAPA 5: Análisis de ropa por color dominante ────────────────────────────

# Paletas de colores típicos por estilo
STYLE_PALETTES = {
    "formal":  [(0,0,0), (50,50,50), (255,255,255), (128,128,128), (0,0,128)],   # negro, gris, blanco, azul marino
    "casual":  [(0,120,200), (200,100,0), (0,150,0), (180,80,80)],               # azul, naranja, verde, rojo
    "sport":   [(255,80,0), (0,200,255), (200,0,200), (50,50,50)],               # naranja neón, cian, fucsia
    "comodo":  [(200,180,160), (220,210,200), (160,200,160), (180,160,200)],     # beige, crema, verde suave, lila
}

def _color_distance(c1, c2):
    return sum((a - b) ** 2 for a, b in zip(c1, c2)) ** 0.5

def analyze_clothing(img_array: np.ndarray) -> dict:
    """
    Toma la zona del torso (centro de la imagen) y extrae los
    colores dominantes para inferir el estilo de ropa.
    """
    try:
        h, w, _ = img_array.shape
        # Zona del torso: 20-75% de altura, 20-80% de anchura
        torso = img_array[int(h*0.20):int(h*0.75), int(w*0.20):int(w*0.80)]

        if torso.size == 0:
            return {"clothingStyle": "casual", "dominantColor": "desconocido"}

        # Reducir para eficiencia
        small = Image.fromarray(torso).resize((50, 50))
        pixels = np.array(small).reshape(-1, 3).astype(float)

        # Color medio dominante del torso
        dominant = pixels.mean(axis=0).astype(int).tolist()

        # Clasificar por distancia euclidiana a paletas
        best_style = "casual"
        best_dist  = float("inf")
        for style, palette in STYLE_PALETTES.items():
            min_d = min(_color_distance(dominant, ref) for ref in palette)
            if min_d < best_dist:
                best_dist  = min_d
                best_style = style

        # Detectar si es ropa oscura vs clara (útil para el prompt)
        brightness = sum(dominant) / 3
        tone = "oscuro" if brightness < 100 else "claro" if brightness > 180 else "medio"

        return {
            "clothingStyle":  best_style,
            "clothingTone":   tone,
            "dominantColor":  f"rgb({dominant[0]},{dominant[1]},{dominant[2]})",
        }
    except Exception as e:
        log.warning(f"[Clothing] Error: {e}")
        return {"clothingStyle": "casual", "clothingTone": "desconocido", "dominantColor": "desconocido"}

# ─── Síntesis final → VisionContext para el promptEngine ─────────────────────

def synthesize_context(face: dict, posture: dict, scene: dict,
                       lighting: dict, clothing: dict) -> dict:
    """
    Combina las 5 capas en el VisionContext que consume el promptEngine.
    La lógica de síntesis es el valor añadido real sobre el DeepFace básico.
    """
    emotion = face["dominantEmotion"]

    # Nivel de energía: combina emoción + postura + brillo
    high_energy_emotions = {"alegria", "sorpresa"}
    low_energy_emotions  = {"tristeza", "ansiedad", "malestar"}

    energy_votes = []
    if emotion in high_energy_emotions:   energy_votes.append("alta")
    elif emotion in low_energy_emotions:  energy_votes.append("baja")
    else:                                 energy_votes.append("media")

    if posture["isLyingDown"]:            energy_votes.append("baja")
    elif posture["activityLevel"] == "activa": energy_votes.append("alta")
    else:                                 energy_votes.append("media")

    if lighting["brightness"] < 80:      energy_votes.append("baja")
    elif lighting["brightness"] > 180:   energy_votes.append("alta")

    energy_count = {"alta": 0, "media": 0, "baja": 0}
    for v in energy_votes:
        energy_count[v] += 1
    energy_appearance = max(energy_count, key=energy_count.get)

    # Descripción enriquecida de lenguaje corporal
    body_desc = posture["bodyLanguage"]
    if posture["isLyingDown"]:
        body_desc = "descansando_acostada"
    elif posture["isSitting"]:
        body_desc = f"sentada_{posture['bodyLanguage']}"

    # Hora del día enriquecida
    time_hint = lighting["timeOfDayHint"]

    return {
        # Campos base (compatibles con v1)
        "dominantEmotion":   emotion,
        "energyAppearance":  energy_appearance,
        "environment":       scene["environment"],
        "style":             clothing["clothingStyle"],

        # Campos enriquecidos (v2)
        "allEmotions":       face.get("allEmotions", {}),
        "faceConfidence":    face.get("faceConfidence", 0.0),
        "estimatedAge":      face.get("estimatedAge", 0),
        "bodyLanguage":      body_desc,
        "activityLevel":     posture["activityLevel"],
        "isIndoor":          scene["isIndoor"],
        "sceneCategory":     scene["sceneCategory"],
        "lightCondition":    lighting["lightCondition"],
        "timeOfDayHint":     time_hint,
        "ambientMood":       lighting["ambientMood"],
        "clothingTone":      clothing.get("clothingTone", "desconocido"),
        "poseDetected":      posture["poseDetected"],
        "analysisVersion":   "2.0",
    }

# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "MateCare DeepFace Advanced v2.0",
        "layers": ["deepface", "yolov8-pose", "places365", "opencv-hsv", "clothing-color"],
    })


@app.route("/analyze", methods=["POST"])
def analyze():
    token = request.headers.get("X-Internal-Token", "")
    if token != INTERNAL_TOKEN:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    if not data or "image" not in data:
        return jsonify({"error": "Missing 'image' field"}), 400

    t0 = time.time()

    try:
        img_pil   = decode_image(data["image"])
        img_array = pil_to_numpy(img_pil)
    except Exception as e:
        return jsonify({"error": f"Invalid image: {e}"}), 400

    # Ejecutar las 5 capas en paralelo para minimizar latencia
    results = {}
    tasks = {
        "face":     lambda: analyze_face(img_array),
        "posture":  lambda: analyze_posture(img_array),
        "scene":    lambda: analyze_scene(img_pil),
        "lighting": lambda: analyze_lighting(img_array),
        "clothing": lambda: analyze_clothing(img_array),
    }

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(fn): name for name, fn in tasks.items()}
        for future in as_completed(futures):
            name = futures[future]
            try:
                results[name] = future.result(timeout=10)
            except Exception as e:
                log.warning(f"[Layer:{name}] Timeout/error: {e}")
                results[name] = {}

    # Síntesis
    context = synthesize_context(
        face     = results.get("face", {}),
        posture  = results.get("posture", {}),
        scene    = results.get("scene", {}),
        lighting = results.get("lighting", {}),
        clothing = results.get("clothing", {}),
    )

    context["processingMs"] = round((time.time() - t0) * 1000)
    log.info(f"[Analyze] Done in {context['processingMs']}ms — emotion={context['dominantEmotion']} energy={context['energyAppearance']}")

    return jsonify(context)


# ─── Startup: pre-calentar DeepFace al arrancar ──────────────────────────────

if __name__ == "__main__":
    log.info("[Startup] Pre-cargando DeepFace...")
    load_deepface()
    # YOLOv8 y Places365 se cargan lazy en el primer request
    port = int(os.environ.get("PORT", 5001))
    log.info(f"[Startup] Servidor listo en puerto {port}")
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
