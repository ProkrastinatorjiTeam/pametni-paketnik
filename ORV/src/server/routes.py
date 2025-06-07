from flask import request, jsonify, Blueprint, current_app
from .image_saving import handle_image_upload
import sys
import os
import logging

module_logger = logging.getLogger(__name__) # Keep this for module-level logging if needed

# --- Updated PROJECT_ROOT and sys.path ---
# Assuming routes.py is in src/server/, to get to ORV/ (project root)
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
# --- End Updated PROJECT_ROOT ---

# --- Updated AI import ---
try:
    # Now import from the new ai package
    from src.ai.training_pipeline import start_user_training_pipeline
except ImportError as e:
    module_logger.error(f"Could not import 'start_user_training_pipeline' from 'src.ai.training_pipeline': {e}. AI training will not be available.")
    # Fallback function if import fails
    def start_user_training_pipeline(user_id: str, source_uploaded_images_dir: str):
        current_app.logger.warning("AI training module (src.ai.training_pipeline) not loaded. Skipping training initiation.")
        return False, "AI training module not available."
# --- End Updated AI import ---

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

# TODO: Add the /user/verify route here later
# @api_bp.route('/user/verify', methods=['POST'])
# def verify_image_route():
#     # ... implementation for verification ...
#     pass