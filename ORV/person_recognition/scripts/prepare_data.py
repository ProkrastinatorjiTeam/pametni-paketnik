import os
import shutil
import random

raw_data_dir = '../data/raw'
train_dir = '../data/train'
test_dir = '../data/test'


def prepare_data():
    if not os.path.exists(train_dir):
        os.makedirs(train_dir)
    if not os.path.exists(test_dir):
        os.makedirs(test_dir)

    for person in os.listdir(raw_data_dir):
        person_path = os.path.join(raw_data_dir, person)

        if os.path.isdir(person_path):
            valid_exts = ('.jpg', '.jpeg', '.png', '.JPG', '.PNG')
            images = [f for f in os.listdir(person_path) if f.lower().endswith(valid_exts)]

            if len(images) < 2:
                print(f"Skipping {person} (only {len(images)} image(s))")
                continue

            train_person_path = os.path.join(train_dir, person)
            test_person_path = os.path.join(test_dir, person)

            if not os.path.exists(train_person_path):
                os.makedirs(train_person_path)
            if not os.path.exists(test_person_path):
                os.makedirs(test_person_path)

            random.shuffle(images)

            split_index = int(len(images) * 0.8)
            train_images = images[:split_index]
            test_images = images[split_index:]

            for image in train_images:
                shutil.copy(os.path.join(person_path, image), os.path.join(train_person_path, image))
            for image in test_images:
                shutil.copy(os.path.join(person_path, image), os.path.join(test_person_path, image))


if __name__ == '__main__':
    prepare_data()
