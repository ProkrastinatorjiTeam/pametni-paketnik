import os
import tensorflow as tf

RAW_DIR = "../data/raw"
PROCESSED_DIR = "../data/processed"
TARGET_COUNT = 1000
IMAGE_SIZE = (100, 100)
image = tf.keras.preprocessing.image

data_augmentation = tf.keras.preprocessing.image.ImageDataGenerator(
    rescale=1. / 255,
    rotation_range=45,
    width_shift_range=0.25,
    height_shift_range=0.25,
    shear_range=0.25,
    zoom_range=0.3,
    brightness_range=[0.3, 1.6],
    channel_shift_range=20.0,
    horizontal_flip=True,
    vertical_flip=False,
    fill_mode='nearest',
)


def augment_and_save(img_path, target_dir, image_name, aug_gen):
    img = image.load_img(img_path)
    img_array = image.img_to_array(img)
    img_array = img_array.reshape((1,) + img_array.shape)

    i = 0
    for batch in aug_gen.flow(img_array, batch_size=1, save_to_dir=target_dir, save_prefix=image_name,
                              save_format='jpeg'):
        i += 1
        if i > 1:
            break


for person in os.listdir(RAW_DIR):
    person_path = os.path.join(RAW_DIR, person)

    if os.path.isdir(person_path):
        valid_exts = ('.jpg', '.jpeg', '.png', '.JPG', '.PNG')
        images = [f for f in os.listdir(person_path) if f.lower().endswith(valid_exts)]

        if not os.path.exists(PROCESSED_DIR):
            os.makedirs(PROCESSED_DIR)

        processed_person = os.path.join(PROCESSED_DIR, person)
        if not os.path.exists(processed_person):
            os.makedirs(processed_person)

        for image_name in images:
            image_path = os.path.join(person_path, image_name)
            augment_and_save(image_path, processed_person, image_name, data_augmentation)
