import os
import cv2 as cv
import numpy as np
from keras.models import load_model
from keras_vggface.utils import preprocess_input as vggface_preprocess_input
from flask import current_app
import logging

def verify_user_with_image(user_id: str, image_bytes: bytes, app_config: dict, logger=None):
    """
    Verifies if the provided image matches the specified user_id using their trained model.

    Args:
        user_id (str): The ID of the user to verify against.
        image_bytes (bytes): The image file in bytes.
        app_config (dict): Application configuration.
        logger: Optional logger instance.

    Returns:
        tuple: (is_match: bool, probability: float, message: str)
    """
    if logger is None:
        logger = current_app.logger if current_app else logging.getLogger(__name__)

    # --- Configuration Loading ---
    base_models_dir = app_config.get('MODELS_DIR')
    model_name = app_config.get('AI_BEST_MODEL_FILENAME', 'best_vggface_model.keras') 
    model_path = os.path.join(base_models_dir, user_id, model_name)
    
    image_size_config = app_config.get('AI_MODEL_INPUT_SIZE', (224, 224)) 
    cv_image_size = (image_size_config[1], image_size_config[0])

    verification_threshold = float(app_config.get('AI_VERIFICATION_THRESHOLD', 0.5))
    vggface_preprocess_version = int(app_config.get('AI_VGGFACE_PREPROCESS_VERSION', 1))

    logger.info(f"Attempting verification for user_id: {user_id}")
    logger.info(f"Loading model from: {model_path}")

    # --- Model Loading ---
    if not os.path.exists(model_path):
        msg = f"Verification failed: Model for user {user_id} not found at {model_path}."
        logger.error(msg)
        return False, 0.0, msg

    try:
        trained_model = load_model(model_path, compile=False) 
        logger.info(f"Model for user {user_id} loaded successfully.")
    except Exception as e:
        msg = f"Verification failed: Error loading model for user {user_id}: {e}"
        logger.error(msg, exc_info=True)
        return False, 0.0, msg

    # --- Image Preprocessing ---
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv.imdecode(nparr, cv.IMREAD_COLOR)
        if img is None:
            msg = "Verification failed: Could not decode image."
            logger.error(msg)
            return False, 0.0, msg

        img_rgb = cv.cvtColor(img, cv.COLOR_BGR2RGB)
        img_resized = cv.resize(img_rgb, cv_image_size) 
        img_to_preprocess = img_resized.astype(np.float32)

        img_processed = vggface_preprocess_input(img_to_preprocess, version=vggface_preprocess_version) 
        img_batch = np.expand_dims(img_processed, axis=0)
        logger.debug("Image preprocessed successfully for verification.")

    except Exception as e:
        msg = f"Verification failed: Error during image preprocessing: {e}"
        logger.error(msg, exc_info=True)
        return False, 0.0, msg

    # --- Prediction ---
    try:
        prediction_prob = trained_model.predict(img_batch, verbose=0)[0][0]
        logger.info(f"Raw prediction probability for user {user_id}: {prediction_prob:.4f}")
    except Exception as e:
        msg = f"Verification failed: Error during model prediction: {e}"
        logger.error(msg, exc_info=True)
        return False, 0.0, msg
        
    # --- Decision Making ---
    is_match = prediction_prob >= verification_threshold

    if is_match:
        message = f"User {user_id} VERIFIED. Probability: {prediction_prob:.4f} (Threshold: {verification_threshold})"
        logger.info(message)
    else:
        message = f"User {user_id} NOT VERIFIED. Probability: {prediction_prob:.4f} (Threshold: {verification_threshold})"
        logger.info(message)
        
    return bool(is_match), float(prediction_prob), message