import os
import shutil
import random
import math

RAW_DATA_DIR = '../data/images'
TRAIN_DIR = '../data/train'
VALIDATION_DIR = '../data/validation'
TEST_DIR = '../data/test'

TRAIN_RATIO = 0.70
VALIDATION_RATIO = 0.20
TEST_RATIO = 0.10

MIN_IMAGES_PER_PERSON = 10

OVERWRITE_EXISTING_DIRS = True


def create_dir_structure(base_dir, person_name=None, overwrite_base=False):
    """
    Creates directories.
    If person_name is None, creates the base_dir (e.g., TRAIN_DIR).
    If person_name is provided, creates a subdirectory for that person within base_dir.
    """
    target_dir = base_dir
    if person_name:
        target_dir = os.path.join(base_dir, person_name)

    if person_name is None and os.path.exists(target_dir) and overwrite_base:
        print(f"Base directory '{target_dir}' already exists. Removing its contents.")
        shutil.rmtree(target_dir)

    os.makedirs(target_dir, exist_ok=True)
    if person_name is None and overwrite_base:
        print(f"Recreated base directory: {target_dir}")
    elif not os.path.exists(target_dir):
        print(f"Created directory: {target_dir}")


def split_data():
    print("Starting data splitting process...")

    if not os.path.exists(RAW_DATA_DIR):
        print(f"ERROR: Raw data directory '{RAW_DATA_DIR}' not found!")
        return

    create_dir_structure(TRAIN_DIR, overwrite_base=OVERWRITE_EXISTING_DIRS)
    create_dir_structure(VALIDATION_DIR, overwrite_base=OVERWRITE_EXISTING_DIRS)
    create_dir_structure(TEST_DIR, overwrite_base=OVERWRITE_EXISTING_DIRS)

    person_names = [d for d in os.listdir(RAW_DATA_DIR) if os.path.isdir(os.path.join(RAW_DATA_DIR, d))]

    if not person_names:
        print(f"No person subdirectories found in '{RAW_DATA_DIR}'.")
        return

    print(f"Found {len(person_names)} persons in raw data.")
    processed_persons_count = 0

    for person_name in person_names:
        print(f"\nProcessing person: {person_name}")
        source_person_dir = os.path.join(RAW_DATA_DIR, person_name)

        all_images = [
            f for f in os.listdir(source_person_dir)
            if os.path.isfile(os.path.join(source_person_dir, f))
               and f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif', '.webp'))  # Added .webp
        ]
        num_total_images = len(all_images)

        if num_total_images < MIN_IMAGES_PER_PERSON:
            print(f"  WARNING: Person '{person_name}' has only {num_total_images} images, "
                  f"which is less than the required minimum of {MIN_IMAGES_PER_PERSON}. Skipping this person.")
            continue

        random.shuffle(all_images)

        num_train = math.floor(num_total_images * TRAIN_RATIO)
        num_validation = math.floor(num_total_images * VALIDATION_RATIO)

        if num_train + num_validation > num_total_images:
            if num_train > num_total_images:
                num_train = num_total_images
                num_validation = 0
            else:
                num_validation = num_total_images - num_train

        num_test = num_total_images - num_train - num_validation

        if num_total_images > 0 and num_train == 0:
            num_train = 1
            if num_validation > 0 and num_total_images == 1:
                num_validation = 0
            elif num_validation == 0 and num_test > 0 and num_total_images > 1:
                num_validation = 1
            num_test = num_total_images - num_train - num_validation
            if num_test < 0: num_test = 0
            if num_train + num_validation > num_total_images:
                num_validation = num_total_images - num_train

        train_images = all_images[:num_train]
        validation_images = all_images[num_train: num_train + num_validation]
        test_images = all_images[num_train + num_validation:]

        person_train_dir = os.path.join(TRAIN_DIR, person_name)
        person_validation_dir = os.path.join(VALIDATION_DIR, person_name)
        person_test_dir = os.path.join(TEST_DIR, person_name)

        create_dir_structure(TRAIN_DIR, person_name)
        create_dir_structure(VALIDATION_DIR, person_name)
        create_dir_structure(TEST_DIR, person_name)

        for img_name in train_images:
            shutil.copy(os.path.join(source_person_dir, img_name), os.path.join(person_train_dir, img_name))
        for img_name in validation_images:
            shutil.copy(os.path.join(source_person_dir, img_name), os.path.join(person_validation_dir, img_name))
        for img_name in test_images:
            shutil.copy(os.path.join(source_person_dir, img_name), os.path.join(person_test_dir, img_name))

        print(f"  Split for '{person_name}': {len(train_images)} train, "
              f"{len(validation_images)} validation, {len(test_images)} test.")
        processed_persons_count += 1

    print("\n--- Data Splitting Complete ---")
    print(
        f"Processed {processed_persons_count} out of {len(person_names)} persons (due to MIN_IMAGES_PER_PERSON filter).")
    print(f"Training data: {TRAIN_DIR}")
    print(f"Validation data: {VALIDATION_DIR}")
    print(f"Test data: {TEST_DIR}")


if __name__ == '__main__':
    if not math.isclose(TRAIN_RATIO + VALIDATION_RATIO + TEST_RATIO, 1.0):
        raise ValueError("Error: TRAIN_RATIO, VALIDATION_RATIO, and TEST_RATIO must sum to 1.0")
    if MIN_IMAGES_PER_PERSON < 3 and (VALIDATION_RATIO > 0 or TEST_RATIO > 0):
        print(
            f"WARNING: MIN_IMAGES_PER_PERSON is {MIN_IMAGES_PER_PERSON}, which might be too low for a meaningful train/validation/test split. "
            "Consider increasing it if you have validation/test sets.")

    split_data()
