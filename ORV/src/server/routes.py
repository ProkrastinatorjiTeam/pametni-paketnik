from flask import request, jsonify, Blueprint, current_app
from .image_saving import handle_image_upload
import sys
import os
import logging

from src.ai.training_pipeline import start_user_training_pipeline
from src.ai.verification_manager import verify_user_with_image

module_logger = logging.getLogger(__name__) 

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


api_bp = Blueprint('api', __name__)

@api_bp.route('/api/data', methods=['GET'])
def get_data():
    sample_data = {"message": "Hello from the server!", "items": [1, 2, 3]}
    return jsonify(sample_data)


@api_bp.route('/user/updateImages', methods=['POST'])
def update_images_route():
    upload_result = handle_image_upload(request.form, request.files)

    response_payload = upload_result["response_payload"]
    status_code = upload_result["status_code"]

    if upload_result["upload_successful"]:
        user_id = upload_result["user_id"]
        # This is the path to the 'uploads/{user_id}' directory
        user_uploaded_images_dir = upload_result["user_image_folder_path"]
        
        current_app.logger.info(f"Images saved for user {user_id} at {user_uploaded_images_dir}. Attempting to trigger training pipeline.")
        
        # --- AI Training Initiation ---
        training_initiated, training_message = start_user_training_pipeline(
            user_id, 
            user_uploaded_images_dir
        )
        # --- End AI Training Initiation ---
        
        response_payload["training_initiation_status"] = training_message
        if not training_initiated:
            current_app.logger.error(f"Failed to initiate training pipeline for user {user_id}: {training_message}")
            # Optionally, you might want to change the status_code here if initiation fails critically
            # For now, we'll keep the image upload status and add the training initiation message.
    
    return jsonify(response_payload), status_code

@api_bp.route('/api/user/verify', methods=['POST'])
def verify_image_route():
    logger = current_app.logger
    app_config = current_app.config

    if 'user_id' not in request.form:
        logger.warning("Verification attempt failed: 'user_id' missing from form data.")
        return jsonify({"error": "user_id is required"}), 400
    
    user_id = request.form['user_id']

    if 'image' not in request.files:
        logger.warning(f"Verification attempt for user {user_id} failed: 'image' file part missing.")
        return jsonify({"error": "Image file is required"}), 400

    image_file = request.files['image']

    if image_file.filename == '':
        logger.warning(f"Verification attempt for user {user_id} failed: No image selected.")
        return jsonify({"error": "No selected image file"}), 400

    try:
        image_bytes = image_file.read()
        if not image_bytes:
            logger.warning(f"Verification attempt for user {user_id} failed: Image file is empty.")
            return jsonify({"error": "Image file is empty"}), 400

        logger.info(f"Received image for verification for user_id: {user_id}. Image size: {len(image_bytes)} bytes.")

        is_match, probability, message = verify_user_with_image(
            user_id=user_id,
            image_bytes=image_bytes,
            app_config=dict(app_config), # Pass a copy of app_config
            logger=logger
        )

        return jsonify({
            "user_id": user_id,
            "is_match": is_match,
            "probability": probability,
            "message": message
        }), 200

    except Exception as e:
        logger.error(f"Error during verification process for user {user_id}: {e}", exc_info=True)
        return jsonify({"error": "Server error during verification process."}), 500