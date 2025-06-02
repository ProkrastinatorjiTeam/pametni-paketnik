import os
import random
import sys
import json
import cv2 as cv
import matplotlib.pyplot as plt
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, optimizers, regularizers
from tensorflow.keras.callbacks import ModelCheckpoint, ReduceLROnPlateau, EarlyStopping
from tensorflow.keras.utils import Sequence

if len(sys.argv) < 2:
    print("Usage: python build_model.py <user_id>")
    sys.exit(1)

user_id = sys.argv[1]

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
print("Num GPUs Available: ", len(tf.config.list_physical_devices('GPU')))

def visual(history_result):
    plt.figure(figsize=(10, 4))

    plt.subplot(1, 2, 1)
    plt.plot(history_result.history['accuracy'], label='Train Accuracy')
    plt.plot(history_result.history['val_accuracy'], label='Validation Accuracy')
    plt.xlabel("Epoch")
    plt.ylabel("Accuracy")
    plt.title("Accuracy per Epoch")
    plt.legend()
    plt.grid()

    plt.subplot(1, 2, 2)
    plt.plot(history_result.history['loss'], label='Train Loss')
    plt.plot(history_result.history['val_loss'], label='Validation Loss')
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.title("Loss per Epoch")
    plt.legend()
    plt.grid()

    plt.tight_layout()
    plt.show()

train_dir = f"../data/train"
validation_dir = f"../data/validation"

IMAGE_SIZE = (100, 100)
BATCH_SIZE = 32
EPOCHS = 50
LR = 0.0014

OPTIMAL_FILTERS_BASE = 16
OPTIMAL_DENSE_UNITS = 768
OPTIMAL_DROPOUT_CONV = 0.30
OPTIMAL_DROPOUT_DENSE = 0.35
OPTIMAL_EMBEDDING_DIM = 128
OPTIMAL_L2_REG = 0.0006


class FacesSequence(Sequence):
    def __init__(self, directory, batch_size, image_size, class_names, augment=False):
        self.directory = directory
        self.batch_size = batch_size
        self.image_size = image_size
        self.class_names = class_names
        self.augment = augment
        self.class_to_idx = {cls: i for i, cls in enumerate(class_names)}
        self.samples = []
        for cls in class_names:
            cls_dir = os.path.join(directory, cls)
            for fname in os.listdir(cls_dir):
                self.samples.append((os.path.join(cls_dir, fname), self.class_to_idx[cls]))
        random.shuffle(self.samples)

    def __len__(self):
        return int(np.ceil(len(self.samples) / self.batch_size))

    def __getitem__(self, idx):
        batch_samples = self.samples[idx * self.batch_size:(idx + 1) * self.batch_size]
        images = []
        labels = []
        for img_path, label in batch_samples:
            img = cv.imread(img_path)
            img = cv.cvtColor(img, cv.COLOR_BGR2RGB)
            img = cv.resize(img, self.image_size)
            img = img.astype(np.float32) / 255.0
            if self.augment:
                img = self.custom_augment(img)
            images.append(img)
            labels.append(label)
        return np.array(images), tf.keras.utils.to_categorical(labels, num_classes=len(self.class_names))

    def on_epoch_end(self):
        random.shuffle(self.samples)

    def custom_augment(self, image):
        # Random brightness shift
        # Random contrast adjustment
        # Small random translation
        # Random rotation

        if random.random() > 0.5:
            image = cv.flip(image, 1)

        brightness_factor = 0.5 + 1.0 * random.random()
        image = np.clip(image * brightness_factor, 0, 2)

        mean = np.mean(image, axis=(0, 1), keepdims=True)
        contrast_factor = 0.8 + 0.4 * random.random()
        image = np.clip((image - mean) * contrast_factor + mean, 0, 1)

        tx = random.uniform(-0.1, 0.1) * self.image_size[0]
        ty = random.uniform(-0.1, 0.1) * self.image_size[1]
        M = np.float32([[1, 0, tx], [0, 1, ty]])
        image = cv.warpAffine(image, M, self.image_size, borderMode=cv.BORDER_REFLECT_101)

        angle = random.uniform(-15, 15)
        M_rot = cv.getRotationMatrix2D((self.image_size[0] / 2, self.image_size[1] / 2), angle, 1)
        image = cv.warpAffine(image, M_rot, self.image_size, borderMode=cv.BORDER_REFLECT_101)

        return image


class_names = sorted(os.listdir(train_dir))
NUM_CLASSES = len(class_names)

train_sequence = FacesSequence(train_dir, BATCH_SIZE, IMAGE_SIZE, class_names, augment=True)
val_sequence = FacesSequence(validation_dir, BATCH_SIZE, IMAGE_SIZE, class_names, augment=False)


def build_base_model():
    inputs = layers.Input(shape=(IMAGE_SIZE[0], IMAGE_SIZE[1], 3))

    x = layers.Conv2D(OPTIMAL_FILTERS_BASE, (3, 3), padding='same', kernel_regularizer=regularizers.l2(OPTIMAL_L2_REG))(inputs)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.Conv2D(OPTIMAL_FILTERS_BASE * 2, (3, 3), padding='same', kernel_regularizer=regularizers.l2(OPTIMAL_L2_REG))(x)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.MaxPooling2D()(x)
    x = layers.Dropout(OPTIMAL_DROPOUT_CONV)(x)

    x = layers.Conv2D(OPTIMAL_FILTERS_BASE * 2, (3, 3), padding='same', kernel_regularizer=regularizers.l2(OPTIMAL_L2_REG))(x)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.Conv2D(OPTIMAL_FILTERS_BASE * 4, (3, 3), padding='same', kernel_regularizer=regularizers.l2(OPTIMAL_L2_REG))(x)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.MaxPooling2D()(x)
    x = layers.Dropout(OPTIMAL_DROPOUT_CONV)(x)

    x = layers.Conv2D(OPTIMAL_FILTERS_BASE * 4, (3, 3), padding='same', kernel_regularizer=regularizers.l2(OPTIMAL_L2_REG))(x)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.Conv2D(OPTIMAL_FILTERS_BASE * 8, (3, 3), padding='same', kernel_regularizer=regularizers.l2(OPTIMAL_L2_REG))(x)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.MaxPooling2D()(x)
    x = layers.Dropout(OPTIMAL_DROPOUT_CONV)(x)

    x = layers.Flatten()(x)
    x = layers.Dense(OPTIMAL_DENSE_UNITS, kernel_regularizer=regularizers.l2(OPTIMAL_L2_REG))(x)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.Dropout(OPTIMAL_DROPOUT_DENSE)(x)

    embeddings = layers.Dense(OPTIMAL_EMBEDDING_DIM, name="embedding")(x)
    normalized_embeddings = tf.math.l2_normalize(embeddings, axis=-1)

    return models.Model(inputs, normalized_embeddings, name="embedding_model_tuned")


def build_training_model(base_model):
    inputs = base_model.input
    embeddings = base_model.output
    classifier_output = layers.Dense(NUM_CLASSES, activation='softmax', name='classifier')(embeddings)
    return models.Model(inputs, classifier_output, name="training_model")


embedding_model = build_base_model()
training_model = build_training_model(embedding_model)

training_model.summary()

training_model.compile(
    optimizer=optimizers.Adam(learning_rate=LR),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

checkpoint = ModelCheckpoint(
    f"../models/{user_id}/best_model.keras",
    monitor="val_accuracy",
    save_best_only=True,
    mode="max",
    verbose=1
)

early_stopping = EarlyStopping(
    monitor="val_loss",
    patience=10,
    verbose=1,
    mode="min",
    restore_best_weights=True
)

reduce_lr = ReduceLROnPlateau(
    monitor="val_loss",
    patience=5,
    verbose=1,
    mode="min",
    min_delta=0.0001,
    cooldown=0,
    min_lr=1e-6
)

history = training_model.fit(
    train_sequence,
    validation_data=val_sequence,
    epochs=EPOCHS,
    callbacks=[checkpoint, reduce_lr, early_stopping]
)

visual(history)

training_model.save(f'../models/{user_id}/person_recognition_full_model.keras')
embedding_model.save(f'../models/{user_id}/person_embedding_model.keras')

class_index_map = {str(idx): cls_name for idx, cls_name in enumerate(class_names)}

output_dir = "../models"
os.makedirs(output_dir, exist_ok=True)

with open(os.path.join(output_dir, "class_index_map.json"), "w") as f:
    json.dump(class_index_map, f, indent=4)

print(f"Class index map saved to {os.path.join(output_dir, 'class_index_map.json')}")