from flask import request, jsonify, Blueprint, current_app
from .image_saving import handle_image_upload

import sys
import os
import logging # Import the standard logging module

# Configure a basic logger for module-level messages if current_app is not available
module_logger = logging.getLogger(__name__)

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

try:
    from ai_trainer.model_service import begin_user_training
except ImportError as e:
    # Use the standard logger here as current_app context is not available at import time
    module_logger.error(f"Could not import 'ai_trainer.model_service': {e}. AI training will not be available.")
    def begin_user_training(user_id: str, source_images_path: str):
        # This current_app.logger is fine because it's called within a request context
        current_app.logger.warning("AI training module not loaded. Skipping training.")
        return False, "AI training module not available."

api_bp = Blueprint('api', __name__)

@api_bp.route('/api/data', methods=['GET'])
def get_data():
    sample_data = {"message": "Hello from the server!", "items": [1, 2, 3]}
    return jsonify(sample_data)


@api_bp.route('/user/updateImages', methods=['POST'])
def update_images_route():
    """
    Handles image upload, saves images, and then triggers AI model training.
    """
    upload_result = handle_image_upload(request.form, request.files)

    response_payload = upload_result["response_payload"]
    status_code = upload_result["status_code"]

    if upload_result["upload_successful"]:
        user_id = upload_result["user_id"]
        user_image_folder = upload_result["user_image_folder_path"]
        
        current_app.logger.info(f"Images saved for user {user_id} at {user_image_folder}. Attempting to trigger training.")
        
        # --- AI Training Initiation (Placeholder) ---
        # training_success, training_message = begin_user_training(user_id, user_image_folder) # Actual call commented out
        training_success = True # Assume training initiated successfully for now
        training_message = "AI model training initiated successfully (simulated)." 
        # --- End AI Training Initiation (Placeholder) ---
        
        response_payload["training_initiation_status"] = training_message
        if not training_success: # This block will not be hit with the current placeholder
            current_app.logger.error(f"Failed to initiate training for user {user_id}: {training_message}")
    
    return jsonify(response_payload), status_code