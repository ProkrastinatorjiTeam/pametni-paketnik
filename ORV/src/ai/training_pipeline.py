import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2' 

import threading
from flask import current_app # For config and logging
import logging

from .data_processor import split_user_images_for_training, augment_and_duplicate_user_training_images # Import new function
from .training_manager import train_model_for_user

def start_user_training_pipeline(user_id: str, source_uploaded_images_dir: str):
    """
    Orchestrates the data preparation and initiates model training for a user.
    This function is intended to be called from the Flask server.
    Training itself will run in a background thread.

    Args:
        user_id (str): The ID of the user.
        source_uploaded_images_dir (str): Path to the directory where this user's
                                          images were initially uploaded by the server.
    Returns:
        bool: True if training initiation was successful, False otherwise.
        str: Message indicating status.
    """
    logger = current_app.logger if current_app else logging.getLogger(__name__)
    app_config = current_app.config

    base_data_dir = app_config.get('DATA_DIR')
    base_models_dir = app_config.get('MODELS_DIR')
    train_ratio = app_config.get('AI_TRAIN_RATIO', 0.8)
    val_ratio = app_config.get('AI_VALIDATION_RATIO', 0.15)

    if not all([base_data_dir, base_models_dir]):
        logger.error("DATA_DIR or MODELS_DIR not configured in Flask app.")
        return False, "Server configuration error for AI paths."

    logger.info(f"Initiating training pipeline for user: {user_id}")
    logger.info(f"Source images for {user_id} from: {source_uploaded_images_dir}")

    # Step 1: Prepare and split data
    logger.info(f"Preparing data for user {user_id}...")
    split_success, split_message, user_train_data_path = split_user_images_for_training( # Capture user_train_data_path
        user_id=user_id,
        source_image_dir=source_uploaded_images_dir,
        base_data_dir=base_data_dir,
        train_ratio=train_ratio,
        validation_ratio=val_ratio,
        logger=logger
    )

    if not split_success:
        logger.error(f"Data preparation failed for user {user_id}: {split_message}")
        return False, f"Data preparation failed: {split_message}"
    logger.info(f"Data preparation successful for user {user_id}: {split_message}")

    # Step 1.5: Offline Augmentation (Placeholder)
    if user_train_data_path: # Proceed only if splitting was successful and path is valid
        logger.info(f"Starting offline augmentation for user {user_id} training data.")
        aug_success, aug_message = augment_and_duplicate_user_training_images(
            user_id=user_id,
            user_train_data_path=user_train_data_path,
            app_config=dict(app_config), # Pass a copy of app_config
            logger=logger
        )
        if not aug_success:
            logger.warning(f"Offline augmentation step for user {user_id} reported an issue: {aug_message}")
            # Decide if this is a critical failure or just a warning. For now, log and continue.
        else:
            logger.info(f"Offline augmentation step for user {user_id} completed: {aug_message}")
    else:
        logger.warning(f"Skipping offline augmentation for user {user_id} due to previous data split error or invalid path.")


    # Step 2: Launch training in a background thread
    logger.info(f"Attempting to launch training for user {user_id} in a background thread.")
    try:
        # Ensure Flask app context is available in the thread if needed by extensions
        # However, we pass app_config directly to avoid issues with context.
        
        # Create a dictionary of the current app's config to pass to the thread
        # This avoids issues with Flask's app context in a new thread
        thread_app_config = dict(app_config)

        training_thread = threading.Thread(
            target=train_model_for_user,
            args=(user_id, base_data_dir, base_models_dir, thread_app_config, logger)
        )
        training_thread.daemon = True # Allows main program to exit even if thread is running
        training_thread.start()
        
        msg = f"AI model training initiated in background for user {user_id}."
        logger.info(msg)
        return True, msg
    except Exception as e:
        logger.error(f"Failed to start training thread for user {user_id}: {e}")
        return False, f"Failed to start training thread: {e}"
