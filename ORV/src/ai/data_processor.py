import os
import shutil
import random
import math
from flask import current_app # For logging
import logging
import cv2 as cv
import numpy as np

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

# --- Helper functions for augmentation ---

def _add_glare(image, intensity_range=(0.2, 0.5)):
    h, w = image.shape[:2]
    overlay = image.copy()
    
    center_x = random.randint(0, w)
    center_y = random.randint(0, h)
    # Ensure axes are positive and reasonable
    axis_major = random.randint(max(1, min(w,h)//4), max(1, min(w,h)//2))
    axis_minor = random.randint(max(1, axis_major//4), max(1, axis_major//2))
    angle = random.uniform(0, 180)
    
    alpha = random.uniform(intensity_range[0], intensity_range[1])
    
    cv.ellipse(overlay, (center_x, center_y), (axis_major, axis_minor), angle, 0, 360, (255, 255, 255), -1)
    return cv.addWeighted(overlay, alpha, image, 1 - alpha, 0)

def _add_shadow(image, intensity_range=(0.3, 0.6)):
    h, w = image.shape[:2]
    overlay = image.copy()
    
    x1, y1 = random.randint(0, w -1), random.randint(0, h -1)
    x2, y2 = random.randint(0, w -1), random.randint(0, h -1)
    
    pt1 = (min(x1,x2), min(y1,y2))
    pt2 = (max(x1,x2), max(y1,y2))

    # Ensure the shadow is not too small, at least 10% of dimensions
    if pt2[0] - pt1[0] < w // 10 or pt2[1] - pt1[1] < h // 10:
        # Define a default larger shadow if the random one is too small
        s_x1 = random.randint(0, w//3)
        s_y1 = random.randint(0, h//3)
        s_x2 = random.randint(s_x1 + w//3, w-1)
        s_y2 = random.randint(s_y1 + h//3, h-1)
        pt1 = (s_x1, s_y1)
        pt2 = (s_x2, s_y2)
        
    alpha = random.uniform(intensity_range[0], intensity_range[1])
    
    cv.rectangle(overlay, pt1, pt2, (0, 0, 0), -1)
    return cv.addWeighted(overlay, alpha, image, 1 - alpha, 0)

def _rotate_image(image, angle):
    h, w = image.shape[:2]
    center = (w // 2, h // 2)
    
    M = cv.getRotationMatrix2D(center, angle, 1.0)
    rotated_image = cv.warpAffine(image, M, (w, h), borderMode=cv.BORDER_REFLECT_101) 
    return rotated_image

def _add_random_spots(image, num_spots_range=(3, 10), spot_size_range=(3, 15), spot_color_range=((0,50), (0,50), (0,50))):
    h, w = image.shape[:2]
    output_image = image.copy()
    num_spots = random.randint(num_spots_range[0], num_spots_range[1])
    
    for _ in range(num_spots):
        spot_x = random.randint(0, w - 1)
        spot_y = random.randint(0, h - 1)
        spot_radius = random.randint(spot_size_range[0], spot_size_range[1]) // 2
        if spot_radius == 0: spot_radius = 1 # Ensure radius is at least 1
        
        color_b = random.randint(spot_color_range[0][0], spot_color_range[0][1])
        color_g = random.randint(spot_color_range[1][0], spot_color_range[1][1])
        color_r = random.randint(spot_color_range[2][0], spot_color_range[2][1])
        current_spot_color = (color_b, color_g, color_r)

        cv.circle(output_image, (spot_x, spot_y), spot_radius, current_spot_color, -1)
        
    return output_image

# --- Augmentation function ---

def apply_offline_augmentations(
    user_id: str,
    user_train_data_path: str, # Path to 'data/train/user_id/'
    app_config: dict,
    logger=None
):
    """
    Applies offline augmentations to images in a user's training data directory.
    """
    if logger is None:
        logger = current_app.logger if current_app else logging.getLogger(__name__)

    logger.info(f"Starting offline augmentations for user {user_id} in {user_train_data_path}")

    # --- Configuration Loading ---
    augmentation_probability = float(app_config.get('OFFLINE_AUG_PROBABILITY', 0.4)) # Chance to augment an image
    
    # Glare effect parameters
    glare_intensity_min = float(app_config.get('OFFLINE_AUG_GLARE_INTENSITY_MIN', 0.15))
    glare_intensity_max = float(app_config.get('OFFLINE_AUG_GLARE_INTENSITY_MAX', 0.4))
    glare_intensity_range = (glare_intensity_min, glare_intensity_max)

    # Shadow effect parameters
    shadow_intensity_min = float(app_config.get('OFFLINE_AUG_SHADOW_INTENSITY_MIN', 0.25))
    shadow_intensity_max = float(app_config.get('OFFLINE_AUG_SHADOW_INTENSITY_MAX', 0.55))
    shadow_intensity_range = (shadow_intensity_min, shadow_intensity_max)

    # Rotation effect parameters
    rotation_angle_min = float(app_config.get('OFFLINE_AUG_ROTATION_ANGLE_MIN', -8.0))
    rotation_angle_max = float(app_config.get('OFFLINE_AUG_ROTATION_ANGLE_MAX', 8.0))
    rotation_angle_range = (rotation_angle_min, rotation_angle_max)

    # Random spots effect parameters
    spots_num_min = int(app_config.get('OFFLINE_AUG_SPOTS_NUM_MIN', 2))
    spots_num_max = int(app_config.get('OFFLINE_AUG_SPOTS_NUM_MAX', 8))
    spots_num_range = (spots_num_min, spots_num_max)

    spots_size_min = int(app_config.get('OFFLINE_AUG_SPOTS_SIZE_MIN', 2))
    spots_size_max = int(app_config.get('OFFLINE_AUG_SPOTS_SIZE_MAX', 12))
    spots_size_range = (spots_size_min, spots_size_max)

    # --- Initialization ---
    augmented_count = 0 # Counter for newly created augmented images
    processed_count = 0 # Counter for original images processed

    # --- Directory Validation ---
    # Check if the provided path for user's training data is a valid directory.
    if not os.path.isdir(user_train_data_path):
        msg = f"User training data path not found: {user_train_data_path}"
        logger.error(msg)
        return False, msg

    # --- Image Discovery ---
    # List all image files in the user's training directory.
    # It filters for common image extensions and excludes images that already appear to be augmented
    image_files = [f for f in os.listdir(user_train_data_path)
                   if os.path.isfile(os.path.join(user_train_data_path, f))
                   and f.lower().endswith(('.png', '.jpg', '.jpeg'))
                   and not (f.lower().endswith(('_glare.png', '_glare.jpg', '_glare.jpeg',
                                                '_shadow.png', '_shadow.jpg', '_shadow.jpeg',
                                                '_rot.png', '_rot.jpg', '_rot.jpeg',
                                                '_spots.png', '_spots.jpg', '_spots.jpeg')))
                  ]

    # If no suitable original images are found, log and return.
    if not image_files:
        logger.info(f"No suitable original images found in {user_train_data_path} for user {user_id} to augment.")
        return True, "No new images to augment."

    # --- Augmentation Loop ---
    # Iterate over each original image found.
    for img_name in image_files:
        processed_count += 1
        # Decide whether to augment this image based on the augmentation_probability.
        if random.random() < augmentation_probability:
            img_path = os.path.join(user_train_data_path, img_name)
            try:
                # Read the image using OpenCV.
                image = cv.imread(img_path)
                if image is None:
                    logger.warning(f"Could not read image {img_path}. Skipping augmentation for this file.")
                    continue # Skip to the next image if this one can't be read.
                
                # Randomly choose one of the defined augmentation types.
                chosen_aug = random.choice(['glare', 'shadow', 'rotation', 'spots'])
                
                augmented_image = None
                aug_suffix = ""

                # --- Apply Selected Augmentation ---
                if chosen_aug == 'glare':
                    augmented_image = _add_glare(image.copy(), glare_intensity_range)
                    aug_suffix = "_glare"
                elif chosen_aug == 'shadow':
                    augmented_image = _add_shadow(image.copy(), shadow_intensity_range)
                    aug_suffix = "_shadow"
                elif chosen_aug == 'rotation':
                    angle = random.uniform(rotation_angle_range[0], rotation_angle_range[1])
                    augmented_image = _rotate_image(image.copy(), angle)
                    aug_suffix = "_rot"
                elif chosen_aug == 'spots':
                    augmented_image = _add_random_spots(image.copy(), spots_num_range, spots_size_range)
                    aug_suffix = "_spots"

                # --- Save Augmented Image ---
                # If an augmentation was successfully applied:
                if augmented_image is not None:
                    # Construct the new filename by appending the suffix.
                    base, ext = os.path.splitext(img_name)
                    new_img_name = f"{base}{aug_suffix}{ext}"
                    new_img_path = os.path.join(user_train_data_path, new_img_name)
                    
                    # Save the augmented image
                    cv.imwrite(new_img_path, augmented_image)
                    augmented_count += 1
                    logger.debug(f"Applied {chosen_aug} to {img_name}, saved as {new_img_name}")

            except Exception as e:
                # --- Error Handling for Individual Image ---
                logger.error(f"Failed to augment image {img_path} with {chosen_aug}: {e}", exc_info=True)
                # Continue with next image

    # --- Final Reporting ---
    msg = f"Offline augmentation completed for user {user_id}. Processed {processed_count} original images, created {augmented_count} new augmented versions."
    logger.info(msg)
    return True, msg