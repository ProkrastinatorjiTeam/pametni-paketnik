import os
import random
import cv2 as cv
import matplotlib.pyplot as plt
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, optimizers, regularizers
from tensorflow.keras.callbacks import EarlyStopping
from tensorflow.keras.utils import Sequence
import keras_tuner as kt

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
print("Num GPUs Available: ", len(tf.config.list_physical_devices('GPU')))


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
            if not os.path.isdir(cls_dir):
                print(f"Warning: Class directory {cls_dir} not found or not a directory. Skipping.")
                continue
            for fname in os.listdir(cls_dir):
                self.samples.append((os.path.join(cls_dir, fname), self.class_to_idx[cls]))
        if not self.samples:
            raise ValueError(
                f"No images found in directory {self.directory}. Please check the path and class subdirectories.")
        random.shuffle(self.samples)

    def __len__(self):
        return int(np.ceil(len(self.samples) / self.batch_size))

    def __getitem__(self, idx):
        batch_samples = self.samples[idx * self.batch_size:(idx + 1) * self.batch_size]
        images = []
        labels = []
        for img_path, label in batch_samples:
            img = cv.imread(img_path)
            if img is None:
                print(f"Warning: Could not read image {img_path}. Skipping.")
                continue
            img = cv.cvtColor(img, cv.COLOR_BGR2RGB)
            img = cv.resize(img, self.image_size)
            img = img.astype(np.float32) / 255.0
            if self.augment:
                img = self.custom_augment(img)
            images.append(img)
            labels.append(label)
        if not images:
            return np.empty((0, *self.image_size, 3)), np.empty((0, len(self.class_names)))
        return np.array(images), tf.keras.utils.to_categorical(labels, num_classes=len(self.class_names))

    def on_epoch_end(self):
        random.shuffle(self.samples)

    def custom_augment(self, image):
        if random.random() > 0.5:
            image = cv.flip(image, 1)
        brightness_factor = 0.8 + 0.4 * random.random()
        image = np.clip(image * brightness_factor, 0, 1)
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


TRAIN_DIR = "../data/train"
VALIDATION_DIR = "../data/validation"

IMAGE_SIZE = (100, 100)
EPOCHS_PER_TRIAL = 15

if not os.path.exists(TRAIN_DIR):
    raise FileNotFoundError(f"Training directory not found: {TRAIN_DIR}")
class_names = sorted(os.listdir(TRAIN_DIR))
NUM_CLASSES = len(class_names)
if NUM_CLASSES == 0:
    raise ValueError(f"No classes found in {TRAIN_DIR}")
print(f"Found {NUM_CLASSES} classes for tuning.")


def build_model_for_tuner(hp):
    filters_base = hp.Choice("filters_base", values=[16, 32])

    dense_units = hp.Int("dense_units", min_value=256, max_value=1024, step=128)
    dropout_conv = hp.Float("dropout_conv", min_value=0.1, max_value=0.4, step=0.05)
    dropout_dense = hp.Float("dropout_dense", min_value=0.2, max_value=0.5, step=0.05)
    embedding_dim = hp.Choice("embedding_dim", values=[64, 128, 256])

    l2_reg = hp.Float("l2_reg", min_value=1e-4, max_value=1e-2, sampling="log")

    learning_rate = hp.Float("lr", min_value=1e-4, max_value=1e-2, sampling="log")

    inputs = layers.Input(shape=(IMAGE_SIZE[0], IMAGE_SIZE[1], 3))

    x = layers.Conv2D(filters_base, (3, 3), padding='same', kernel_regularizer=regularizers.l2(l2_reg))(inputs)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.Conv2D(filters_base * 2, (3, 3), padding='same', kernel_regularizer=regularizers.l2(l2_reg))(x)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.MaxPooling2D()(x)
    x = layers.Dropout(dropout_conv)(x)

    x = layers.Conv2D(filters_base * 2, (3, 3), padding='same', kernel_regularizer=regularizers.l2(l2_reg))(x)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.Conv2D(filters_base * 4, (3, 3), padding='same', kernel_regularizer=regularizers.l2(l2_reg))(x)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.MaxPooling2D()(x)
    x = layers.Dropout(dropout_conv)(x)

    x = layers.Conv2D(filters_base * 4, (3, 3), padding='same', kernel_regularizer=regularizers.l2(l2_reg))(x)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.Conv2D(filters_base * 8, (3, 3), padding='same', kernel_regularizer=regularizers.l2(l2_reg))(x)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.MaxPooling2D()(x)
    x = layers.Dropout(dropout_conv)(x)

    x = layers.Flatten()(x)
    x = layers.Dense(dense_units, kernel_regularizer=regularizers.l2(l2_reg))(x)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.Dropout(dropout_dense)(x)

    embeddings = layers.Dense(embedding_dim, name="embedding")(x)
    normalized_embeddings = tf.math.l2_normalize(embeddings, axis=-1)

    classifier_output = layers.Dense(NUM_CLASSES, activation='softmax', name='classifier')(normalized_embeddings)
    training_model = models.Model(inputs, classifier_output, name="training_model_for_tuner")

    training_model.compile(
        optimizer=optimizers.Adam(learning_rate=learning_rate),
        loss="categorical_crossentropy",
        metrics=["accuracy"]
    )
    return training_model


if __name__ == "__main__":
    tuner = kt.Hyperband(
        build_model_for_tuner,
        objective="val_accuracy",
        max_epochs=EPOCHS_PER_TRIAL,
        factor=3,
        hyperband_iterations=1,
        directory="keras_tuner_dir",
        project_name="faceid_tuning",
        overwrite=True
    )

    BATCH_SIZE_FOR_TUNING = 32  # Or 64
    print(f"Using fixed BATCH_SIZE = {BATCH_SIZE_FOR_TUNING} for this tuning run.")

    train_sequence_tune = FacesSequence(TRAIN_DIR, BATCH_SIZE_FOR_TUNING, IMAGE_SIZE, class_names, augment=True)
    val_sequence_tune = FacesSequence(VALIDATION_DIR, BATCH_SIZE_FOR_TUNING, IMAGE_SIZE, class_names, augment=False)

    stop_early = EarlyStopping(monitor='val_loss', patience=5,
                               restore_best_weights=False)

    print("Starting hyperparameter search...")
    tuner.search(
        train_sequence_tune,
        validation_data=val_sequence_tune,
        epochs=EPOCHS_PER_TRIAL,
        callbacks=[stop_early],
        verbose=1
    )

    best_hps = tuner.get_best_hyperparameters(num_trials=1)[0]

    print(f"""
    The hyperparameter search is complete.
    Optimal learning rate: {best_hps.get('lr')}
    Optimal filters_base: {best_hps.get('filters_base')}
    Optimal dense_units: {best_hps.get('dense_units')}
    Optimal dropout_conv: {best_hps.get('dropout_conv')}
    Optimal dropout_dense: {best_hps.get('dropout_dense')}
    Optimal embedding_dim: {best_hps.get('embedding_dim')}
    Optimal l2_reg: {best_hps.get('l2_reg')}
    (Batch size was fixed at {BATCH_SIZE_FOR_TUNING} for this run)
    """)

    print("\nBuilding the best model with optimal hyperparameters...")
    best_model = tuner.hypermodel.build(best_hps)

    print("\nTraining the best model for more epochs...")

    final_checkpoint = tf.keras.callbacks.ModelCheckpoint(
        "../models/best_tuned_model.keras",
        monitor="val_accuracy",
        save_best_only=True,
        mode="max",
        verbose=1
    )
    final_early_stopping = EarlyStopping(
        monitor="val_loss",
        patience=10,
        verbose=1,
        mode="min",
        restore_best_weights=True
    )
    final_reduce_lr = tf.keras.callbacks.ReduceLROnPlateau(
        monitor="val_loss",
        factor=0.2,
        patience=5,
        verbose=1,
        mode="min",
        min_lr=1e-6
    )

    history_final = best_model.fit(
        train_sequence_tune,
        validation_data=val_sequence_tune,
        epochs=50,  # Train for more epochs
        callbacks=[final_checkpoint, final_early_stopping, final_reduce_lr],
        verbose=1
    )

    embedding_layer_output = best_model.get_layer('embedding_model_for_tuner_base').get_layer(
        'embedding').output

    print("Saving final tuned models...")
    best_model.save('../models/person_recognition_tuned_full_model.keras')

    inputs_final = layers.Input(shape=(IMAGE_SIZE[0], IMAGE_SIZE[1], 3))
    filters_base_best = best_hps.get('filters_base')
    dense_units_best = best_hps.get('dense_units')
    dropout_conv_best = best_hps.get('dropout_conv')
    dropout_dense_best = best_hps.get('dropout_dense')
    embedding_dim_best = best_hps.get('embedding_dim')
    l2_reg_best = best_hps.get('l2_reg')

    x = layers.Conv2D(filters_base_best, (3, 3), padding='same', kernel_regularizer=regularizers.l2(l2_reg_best))(
        inputs_final)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.Conv2D(filters_base_best * 2, (3, 3), padding='same', kernel_regularizer=regularizers.l2(l2_reg_best))(x)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.MaxPooling2D()(x)
    x = layers.Dropout(dropout_conv_best)(x)
    x = layers.Conv2D(filters_base_best * 2, (3, 3), padding='same', kernel_regularizer=regularizers.l2(l2_reg_best))(
        x)
    x = layers.BatchNormalization()(x);
    x = layers.ReLU()(x)
    x = layers.Conv2D(filters_base_best * 4, (3, 3), padding='same', kernel_regularizer=regularizers.l2(l2_reg_best))(x)
    x = layers.BatchNormalization()(x);
    x = layers.ReLU()(x)
    x = layers.MaxPooling2D()(x);
    x = layers.Dropout(dropout_conv_best)(x)

    x = layers.Conv2D(filters_base_best * 4, (3, 3), padding='same', kernel_regularizer=regularizers.l2(l2_reg_best))(
        x)
    x = layers.BatchNormalization()(x);
    x = layers.ReLU()(x)
    x = layers.Conv2D(filters_base_best * 8, (3, 3), padding='same', kernel_regularizer=regularizers.l2(l2_reg_best))(x)
    x = layers.BatchNormalization()(x);
    x = layers.ReLU()(x)
    x = layers.MaxPooling2D()(x);
    x = layers.Dropout(dropout_conv_best)(x)

    x = layers.Flatten()(x)
    x = layers.Dense(dense_units_best, kernel_regularizer=regularizers.l2(l2_reg_best))(x)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.Dropout(dropout_dense_best)(x)
    embeddings_final_out = layers.Dense(embedding_dim_best, name="embedding")(x)
    normalized_embeddings_final_out = tf.math.l2_normalize(embeddings_final_out, axis=-1)

    final_embedding_model = models.Model(inputs_final, normalized_embeddings_final_out, name="tuned_embedding_model")

    loaded_full_model = tf.keras.models.load_model('../models/best_tuned_model.keras',
                                                   compile=False)

    _best_hps = tuner.get_best_hyperparameters(num_trials=1)[0]
    temp_base_model_structure = models.Model(
        inputs_final,
        normalized_embeddings_final_out,
        name="temp_embedding_base"
    )

    base_output_tensor = None
    for layer in best_model.layers:
        if layer.name == "tf.math.l2_normalize":
            base_output_tensor = layer.output
            break

    if base_output_tensor is not None:
        final_embedding_model_extracted = models.Model(inputs=best_model.input, outputs=base_output_tensor)
        final_embedding_model_extracted.save('../models/person_embedding_tuned_model.keras')
        print("Final tuned embedding model extracted and saved.")
    else:
        print("Could not automatically extract embedding model. Please do it manually or adjust layer naming.")

    print("Tuning and final training complete.")