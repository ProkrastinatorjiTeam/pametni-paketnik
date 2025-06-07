import os
import shutil
import random
import math
from flask import current_app # For logging
import logging

def split_user_images_for_training(
    user_id: str,
    source_image_dir: str,
    base_data_dir: str,
    train_ratio: float,
    validation_ratio: float,
    logger=None
):
    """
    Splits images from a user's upload directory into train, validation, and test sets.

    Args:
        user_id (str): The ID of the user.
        source_image_dir (str): Path to the directory containing the user's uploaded images.
        base_data_dir (str): The root directory for AI data (e.g., 'data/').
        train_ratio (float): Proportion of images for the training set.
        validation_ratio (float): Proportion of images for the validation set.
        logger: Optional logger instance.
    
    Returns:
        bool: True if successful, False otherwise.
        str: Message indicating status or error.
        str: Path to the user's training data directory if successful, else None.
    """
    if logger is None:
        logger = current_app.logger if current_app else logging.getLogger(__name__)

    if not os.path.isdir(source_image_dir):
        msg = f"Source image directory not found: {source_image_dir}"
        logger.error(msg)
        return False, msg, None

    all_images = [
        f for f in os.listdir(source_image_dir)
        if os.path.isfile(os.path.join(source_image_dir, f))
           and f.lower().endswith(('.png', '.jpg', '.jpeg'))
    ]

    if not all_images:
        msg = f"No images found in source directory: {source_image_dir}"
        logger.warning(msg)
        return False, msg, None

    num_total_images = len(all_images)
    random.shuffle(all_images)

    if train_ratio + validation_ratio > 1.0:
        msg = "Train ratio and validation ratio sum cannot exceed 1.0"
        logger.error(msg)
        return False, msg, None
    
    test_ratio = 1.0 - train_ratio - validation_ratio

    num_train = math.floor(num_total_images * train_ratio)
    num_validation = math.floor(num_total_images * validation_ratio)
    num_test = num_total_images - num_train - num_validation
    
    # Adjust if rounding causes issues, ensure test set gets at least one if possible
    if num_total_images > 0 and (num_train + num_validation + num_test) != num_total_images:
        num_test = num_total_images - num_train - num_validation


    train_images = all_images[:num_train]
    validation_images = all_images[num_train : num_train + num_validation]
    test_images = all_images[num_train + num_validation :]

    user_train_dir_path = os.path.join(base_data_dir, 'train', user_id)
    user_val_dir_path = os.path.join(base_data_dir, 'validation', user_id)
    user_test_dir_path = os.path.join(base_data_dir, 'test', user_id)

    paths_to_create = [user_train_dir_path, user_val_dir_path, user_test_dir_path]
    for p in paths_to_create:
        try:
            os.makedirs(p, exist_ok=True)
        except OSError as e:
            msg = f"Failed to create directory {p}: {e}"
            logger.error(msg)
            return False, msg, None

    def copy_files(files_list, destination_dir):
        for img_name in files_list:
            try:
                shutil.copy(os.path.join(source_image_dir, img_name), os.path.join(destination_dir, img_name))
            except Exception as e:
                logger.error(f"Failed to copy {img_name} to {destination_dir}: {e}")
                # Decide if one failure should stop the whole process or just be logged

    copy_files(train_images, user_train_dir_path)
    copy_files(validation_images, user_val_dir_path)
    copy_files(test_images, user_test_dir_path)

    msg = (f"Data for user {user_id} split: "
           f"{len(train_images)} train, {len(validation_images)} validation, {len(test_images)} test. "
           f"Train: {user_train_dir_path}, Val: {user_val_dir_path}, Test: {user_test_dir_path}")
    logger.info(msg)
    return True, msg, user_train_dir_path

def augment_and_duplicate_user_training_images(
    user_id: str,
    user_train_data_path: str, # Path to 'data/train/user_id/'
    app_config: dict,
    logger=None
):
    """
    Duplicates some images in the user's training set and applies slight augmentations.
    This is for offline augmentation to increase dataset size.
    (Currently a placeholder)

    Args:
        user_id (str): The ID of the user.
        user_train_data_path (str): Path to the directory containing the user's training images.
        app_config (dict): Application configuration for augmentation parameters.
        logger: Optional logger instance.
    
    Returns:
        bool: True if successful, False otherwise.
        str: Message indicating status or error.
    """
    if logger is None:
        logger = current_app.logger if current_app else logging.getLogger(__name__)

    logger.info(f"Placeholder: Starting offline augmentation for user {user_id} in {user_train_data_path}")
    
    # --- Future Implementation Details ---
    # 1. List images in user_train_data_path.
    # 2. Decide on a strategy for duplication (e.g., duplicate all, duplicate a percentage).
    # 3. For each image to be duplicated/augmented:
    #    a. Load the image.
    #    b. Apply slight augmentations (e.g., minor brightness/contrast changes, very small rotations, slight noise).
    #       - These should be different from the on-the-fly augmentations in FacesSequence if both are used.
    #       - Augmentation parameters could come from app_config.
    #    c. Save the augmented image with a new name (e.g., originalname_aug_1.jpg) in the same directory.
    # 4. Log the number of new images created.
    # --- End Future Implementation Details ---
    
    pass # Placeholder for actual implementation

    logger.info(f"Placeholder: Offline augmentation completed for user {user_id}.")
    return True, "Offline augmentation placeholder executed successfully."