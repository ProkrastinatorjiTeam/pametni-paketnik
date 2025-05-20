import os
import shutil
import random

RAW_DATA_DIR = '../data/raw'
TRAIN_DIR = '../data/train'
VALIDATION_DIR = '../data/validation'
TEST_DIR = '../data/test'

TRAIN_SIZE_PER_PERSON = 70
VALIDATION_SIZE_PER_PERSON = 15

def create_dir_if_not_exists(directory):
    if os.path.exists(directory):
        print(f"Directory '{directory}' already exists. Removing its contents.")
        shutil.rmtree(directory)
    os.makedirs(directory, exist_ok=True)
    print(f"Created directory: {directory}")

def split_data():
    print("Starting data splitting process...")

    create_dir_if_not_exists(TRAIN_DIR)
    create_dir_if_not_exists(VALIDATION_DIR)
    create_dir_if_not_exists(TEST_DIR)

    if not os.path.exists(RAW_DATA_DIR):
        print(f"ERROR: Raw data directory '{RAW_DATA_DIR}' not found!")
        return

    person_names = [d for d in os.listdir(RAW_DATA_DIR) if os.path.isdir(os.path.join(RAW_DATA_DIR, d))]

    if not person_names:
        print(f"No person subdirectories found in '{RAW_DATA_DIR}'.")
        return

    print(f"Found {len(person_names)} persons: {person_names}")

    for person_name in person_names:
        print(f"\nProcessing person: {person_name}")

        person_train_dir = os.path.join(TRAIN_DIR, person_name)
        person_validation_dir = os.path.join(VALIDATION_DIR, person_name)
        person_test_dir = os.path.join(TEST_DIR, person_name)

        os.makedirs(person_train_dir, exist_ok=True)
        os.makedirs(person_validation_dir, exist_ok=True)
        os.makedirs(person_test_dir, exist_ok=True)

        source_person_dir = os.path.join(RAW_DATA_DIR, person_name)
        all_images = [
            f for f in os.listdir(source_person_dir)
            if os.path.isfile(os.path.join(source_person_dir, f))
            and f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif'))
        ]

        if len(all_images) < (TRAIN_SIZE_PER_PERSON + VALIDATION_SIZE_PER_PERSON):
            print(f"  WARNING: Person '{person_name}' has only {len(all_images)} images, "
                  f"which is less than the required for train+validation ({TRAIN_SIZE_PER_PERSON + VALIDATION_SIZE_PER_PERSON}). "
                  "Skipping or adjusting logic might be needed. For now, will use all for train if too few.")

            if len(all_images) < TRAIN_SIZE_PER_PERSON:
                 train_images = all_images
                 validation_images = []
                 test_images = []
            else: # Enough for train, but maybe not val/test
                train_images = all_images[:TRAIN_SIZE_PER_PERSON]
                remaining_for_val_test = all_images[TRAIN_SIZE_PER_PERSON:]
                if len(remaining_for_val_test) < VALIDATION_SIZE_PER_PERSON:
                    validation_images = remaining_for_val_test
                    test_images = []
                else:
                    validation_images = remaining_for_val_test[:VALIDATION_SIZE_PER_PERSON]
                    test_images = remaining_for_val_test[VALIDATION_SIZE_PER_PERSON:]

        else:
            random.shuffle(all_images)

            train_images = all_images[:TRAIN_SIZE_PER_PERSON]
            validation_images = all_images[TRAIN_SIZE_PER_PERSON : TRAIN_SIZE_PER_PERSON + VALIDATION_SIZE_PER_PERSON]
            test_images = all_images[TRAIN_SIZE_PER_PERSON + VALIDATION_SIZE_PER_PERSON:]


        for img_name in train_images:
            shutil.copy(os.path.join(source_person_dir, img_name), os.path.join(person_train_dir, img_name))
        for img_name in validation_images:
            shutil.copy(os.path.join(source_person_dir, img_name), os.path.join(person_validation_dir, img_name))
        for img_name in test_images:
            shutil.copy(os.path.join(source_person_dir, img_name), os.path.join(person_test_dir, img_name))

        print(f"  Copied {len(train_images)} to train, {len(validation_images)} to validation, {len(test_images)} to test.")

    print("\n--- Data Splitting Complete ---")
    print(f"Training data: {TRAIN_DIR}")
    print(f"Validation data: {VALIDATION_DIR}")
    print(f"Test data: {TEST_DIR}")

if __name__ == '__main__':
    split_data()