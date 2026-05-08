"""
MateCare - DeepFace Vision Server
Corre en tu VPS. Recibe una imagen base64 y devuelve el análisis.

Instalación en VPS:
  pip install flask deepface tf-keras pillow

Correr:
  python deepface_server.py

Con PM2 (recomendado):
  pm2 start deepface_server.py --interpreter python3 --name deepface
"""

from flask import Flask, request, jsonify
import base64
import io
import os
from PIL import Image

app = Flask(__name__)

# Token simple para que solo tu backend pueda llamar este servicio
INTERNAL_TOKEN = os.environ.get("DEEPFACE_TOKEN", "matecare-internal-secret")


def decode_image(b64_string: str):
    """Convierte base64 → imagen PIL"""
    if "," in b64_string:
        b64_string = b64_string.split(",")[1]
    img_bytes = base64.b64decode(b64_string)
    return Image.open(io.BytesIO(img_bytes)).convert("RGB")


def map_emotion(raw_emotion: str) -> str:
    """Traduce emociones al español para el promptEngine"""
    mapping = {
        "happy": "alegria",
        "sad": "tristeza",
        "angry": "irritabilidad",
        "fear": "ansiedad",
        "surprise": "sorpresa",
        "disgust": "malestar",
        "neutral": "calma",
    }
    return mapping.get(raw_emotion, "calma")


def map_energy(emotion: str, age: float) -> str:
    """Infiere nivel de energía visual a partir de la emoción dominante"""
    high_energy = {"alegria", "sorpresa", "irritabilidad"}
    low_energy = {"tristeza", "ansiedad", "malestar"}
    if emotion in high_energy:
        return "alta"
    if emotion in low_energy:
        return "baja"
    return "media"


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "MateCare DeepFace"})


@app.route("/analyze", methods=["POST"])
def analyze():
    # Auth simple
    token = request.headers.get("X-Internal-Token", "")
    if token != INTERNAL_TOKEN:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    if not data or "image" not in data:
        return jsonify({"error": "Missing image field"}), 400

    try:
        from deepface import DeepFace
        img = decode_image(data["image"])

        # Guardar temporalmente para DeepFace (requiere path o array)
        import numpy as np
        img_array = np.array(img)

        result = DeepFace.analyze(
            img_path=img_array,
            actions=["emotion", "age", "gender"],
            enforce_detection=False,
            silent=True,
        )
        
        # DeepFace devuelve lista si detecta varias caras; tomamos la primera
        face = result[0] if isinstance(result, list) else result

        dominant_emotion_raw = face.get("dominant_emotion", "neutral")
        dominant_emotion = map_emotion(dominant_emotion_raw)
        energy = map_energy(dominant_emotion, face.get("age", 30))

        response = {
            "dominantEmotion": dominant_emotion,
            "allEmotions": {
                map_emotion(k): round(v, 1)
                for k, v in face.get("emotion", {}).items()
            },
            "energyAppearance": energy,
            "estimatedAge": round(face.get("age", 0)),
            "gender": face.get("dominant_gender", "unknown"),
            "environment": None,
            "style": None,
        }

        return jsonify(response)

    except (ImportError, Exception) as e:
        app.logger.warning(f"DeepFace error: {e}")
        # Fallback to neutral if failure occurs
        return jsonify({
            "dominantEmotion": "calma",
            "allEmotions": {"calma": 100.0},
            "energyAppearance": "media",
            "estimatedAge": 30,
            "gender": "unknown",
            "environment": None,
            "style": None,
            "warning": str(e)
        })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=False)
