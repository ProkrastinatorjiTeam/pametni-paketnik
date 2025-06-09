import os
import random
import sys
import cv2 as cv
import matplotlib.pyplot as plt
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, optimizers, regularizers
from tensorflow.keras.callbacks import ModelCheckpoint, ReduceLROnPlateau, EarlyStopping
from tensorflow.keras.utils import Sequence

from keras_vggface.vggface import VGGFace
from keras_vggface.utils import preprocess_input as vggface_preprocess_input

if len(sys.argv) < 2:
    print("Usage: python build_model.py <username>")
    sys.exit(1)

username = sys.argv[1]

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
print("Num GPUs Available: ", len(tf.config.list_physical_devices('GPU')))


def visual(history_result_initial, history_result_finetune=None):
    num_plots = 1
    if history_result_finetune:
        num_plots = 2

    plt.figure(figsize=(10 * num_plots, 8))

    plt.subplot(2, num_plots, 1)
    plt.plot(history_result_initial.history['accuracy'], label='Train Accuracy (Initial)')
    plt.plot(history_result_initial.history['val_accuracy'], label='Validation Accuracy (Initial)')
    plt.xlabel("Epoch")
    plt.ylabel("Accuracy")
    plt.title("Accuracy per Epoch (Initial Training)")
    plt.legend()
    plt.grid()

    plt.subplot(2, num_plots, 2 if num_plots == 1 else 3)
    plt.plot(history_result_initial.history['loss'], label='Train Loss (Initial)')
    plt.plot(history_result_initial.history['val_loss'], label='Validation Loss (Initial)')
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.title("Loss per Epoch (Initial Training)")
    plt.legend()
    plt.grid()

    if history_result_finetune:
        initial_epochs = len(history_result_initial.history['loss'])

        fine_tune_epochs_range = range(initial_epochs,
                                       initial_epochs + len(history_result_finetune.history['loss']))

        plt.subplot(2, num_plots, 2)
        plt.plot(fine_tune_epochs_range, history_result_finetune.history['accuracy'],
                 label='Train Accuracy (Fine-tune)')
        plt.plot(fine_tune_epochs_range, history_result_finetune.history['val_accuracy'],
                 label='Validation Accuracy (Fine-tune)')
        plt.xlabel("Epoch")
        plt.ylabel("Accuracy")
        plt.title("Accuracy per Epoch (Fine-tuning)")
        plt.legend()
        plt.grid()

        plt.subplot(2, num_plots, 4)
        plt.plot(fine_tune_epochs_range, history_result_finetune.history['loss'], label='Train Loss (Fine-tune)')
        plt.plot(fine_tune_epochs_range, history_result_finetune.history['val_loss'],
                 label='Validation Loss (Fine-tune)')
        plt.xlabel("Epoch")
        plt.ylabel("Loss")
        plt.title("Loss per Epoch (Fine-tuning)")
        plt.legend()
        plt.grid()

    plt.tight_layout()
    plt.show()


train_dir = f"../data/train"
validation_dir = f"../data/validation"

IMAGE_SIZE = (224, 224)
BATCH_SIZE = 16
INITIAL_EPOCHS = 20
FINE_TUNE_EPOCHS = 20
LR_INITIAL = 0.001
LR_FINETUNE = 0.00005

OPTIMAL_DROPOUT_DENSE = 0.5
OPTIMAL_L2_REG = 0.0005


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
                print(f"Warning: Directory not found {cls_dir}")
                continue
            for fname in os.listdir(cls_dir):
                self.samples.append((os.path.join(cls_dir, fname), self.class_to_idx[cls]))
        random.shuffle(self.samples)
        self.vggface_preprocess_version = 1

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

            if self.augment:
                img = self.custom_augment(img)

            img_to_preprocess = img.astype(np.float32)

            img_processed = vggface_preprocess_input(img_to_preprocess, version=self.vggface_preprocess_version)

            images.append(img_processed)
            labels.append(label)

        if not images:
            return np.array([]), np.array([])

        return np.array(images), np.array(labels, dtype=np.float32)

    def on_epoch_end(self):
        random.shuffle(self.samples)

    def custom_augment(self, image_uint8):
        image = image_uint8.astype(np.float32) / 255.0

        # Flip horizontal with 50% probability
        if random.random() > 0.5:
            image = cv.flip(image, 1)

        # Adjust brightness (0.8 to 1.2)
        brightness_factor = random.uniform(0.8, 1.2)
        image = np.clip(image * brightness_factor, 0, 1)

        # Adjust contrast (0.8 to 1.2)
        mean = np.mean(image, axis=(0, 1), keepdims=True)
        contrast_factor = random.uniform(0.8, 1.2)
        image = np.clip((image - mean) * contrast_factor + mean, 0, 1)

        # Adjust saturation (0.8 to 1.2)
        # Pretvorba v HSV pričakuje uint8 [0,255]
        hsv_input_img = (image * 255).astype(np.uint8)
        hsv = cv.cvtColor(hsv_input_img, cv.COLOR_RGB2HSV).astype(np.float32)
        saturation_factor = random.uniform(0.8, 1.2)
        hsv[:, :, 1] = np.clip(hsv[:, :, 1] * saturation_factor, 0, 255)
        # Pretvorba nazaj v RGB
        image_hsv_adjusted = cv.cvtColor(hsv.astype(np.uint8), cv.COLOR_HSV2RGB)
        image = image_hsv_adjusted.astype(np.float32) / 255.0

        # Combined rotation and translation
        angle = random.uniform(-15, 15)  # degrees
        tx = random.uniform(-0.1, 0.1) * self.image_size[0]  # image_size je (224,224)
        ty = random.uniform(-0.1, 0.1) * self.image_size[1]
        # warpAffine pričakuje vhodno sliko uint8 [0,255] za boljše rezultate interpolacije
        warp_input_img = (image * 255).astype(np.uint8)
        M_rot_trans = cv.getRotationMatrix2D((self.image_size[0] / 2, self.image_size[1] / 2), angle, 1)
        M_rot_trans[:, 2] += [tx, ty]
        image_warped = cv.warpAffine(warp_input_img, M_rot_trans, self.image_size,
                                     borderMode=cv.BORDER_REFLECT_101)
        image = image_warped.astype(np.float32) / 255.0

        # Add random Gaussian noise (mean=0, std=0.02)
        if random.random() < 0.3:
            noise = np.random.normal(0, 0.02, image.shape).astype(np.float32)
            image = np.clip(image + noise, 0, 1)

        # Add slight blur with 30% chance
        if random.random() < 0.3:
            ksize = random.choice([3, 5])
            # GaussianBlur deluje bolje na float slikah v območju [0,1] ali pa uint8
            image = cv.GaussianBlur(image, (ksize, ksize), 0)

        return (image * 255.0).astype(np.uint8)


class_names = ["not_user", f"{username}"]

train_sequence = FacesSequence(train_dir, BATCH_SIZE, IMAGE_SIZE, class_names, augment=True)
val_sequence = FacesSequence(validation_dir, BATCH_SIZE, IMAGE_SIZE, class_names, augment=False)

num_not_user_train = 0
num_user_train = 0
for sample_path, label_idx in train_sequence.samples:
    if train_sequence.class_names[label_idx] == "not_user":
        num_not_user_train += 1
    else:
        num_user_train += 1

class_weights = None
if num_user_train > 0 and num_not_user_train > 0:
    total_train_samples = num_not_user_train + num_user_train
    weight_for_0 = (1 / num_not_user_train) * (total_train_samples / 2.0)
    weight_for_1 = (1 / num_user_train) * (total_train_samples / 2.0)
    class_weights = {
        train_sequence.class_to_idx['not_user']: weight_for_0,
        train_sequence.class_to_idx[username]: weight_for_1
    }
    print(f"Using class weights: {class_weights}")


def build_vggface_model():
    base_model_object = VGGFace(model='vgg16',
                                weights='vggface',
                                include_top=False,
                                input_shape=(IMAGE_SIZE[0], IMAGE_SIZE[1], 3),
                                pooling=None)

    print(f"VGGFace base model loaded. Name: {base_model_object.name}, Type: {type(base_model_object)}")

    base_model_object.trainable = False

    inputs = base_model_object.input
    x = base_model_object.output

    x = layers.GlobalAveragePooling2D(name="gap")(x)

    x = layers.Dense(512, kernel_regularizer=regularizers.l2(OPTIMAL_L2_REG), name="fc1")(x)
    x = layers.BatchNormalization(name="bn1")(x)
    x = layers.ReLU(name="relu1")(x)
    x = layers.Dropout(OPTIMAL_DROPOUT_DENSE, name="dropout1")(x)

    outputs = layers.Dense(1, activation='sigmoid', name='classifier')(x)

    final_model = models.Model(inputs=inputs, outputs=outputs, name="vggface_vgg16_binary_classifier")

    return final_model, base_model_object


training_model, vgg_base_for_finetuning = build_vggface_model()

if training_model is None or vgg_base_for_finetuning is None:
    print("Model building failed. Exiting.")
    sys.exit(1)

training_model.summary()

print("\n--- Phase 1: Training the classifier head ---")
training_model.compile(
    optimizer=optimizers.Adam(learning_rate=LR_INITIAL),
    loss="binary_crossentropy",
    metrics=["accuracy"]
)

checkpoint_path = f"../models/{username}/best_vggface_model.keras"
checkpoint = ModelCheckpoint(
    checkpoint_path,
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
    restore_best_weights=True  # Pomembno!
)
reduce_lr = ReduceLROnPlateau(
    monitor="val_loss",
    patience=5,
    verbose=1,
    mode="min",
    min_delta=0.0001,
    cooldown=0,
    min_lr=1e-7
)

history_initial = training_model.fit(
    train_sequence,
    validation_data=val_sequence,
    epochs=INITIAL_EPOCHS,
    callbacks=[checkpoint, reduce_lr, early_stopping],
    class_weight=class_weights
)

print("\n--- Phase 2: Fine-tuning the model ---")

if vgg_base_for_finetuning is not None:
    print(f"Unfreezing VGGFace base model: {vgg_base_for_finetuning.name}")
    vgg_base_for_finetuning.trainable = True
else:
    print("Warning: VGGFace base model reference is missing, cannot unfreeze for fine-tuning.")

training_model.compile(
    optimizer=optimizers.Adam(learning_rate=LR_FINETUNE),
    loss="binary_crossentropy",
    metrics=["accuracy"]
)

total_epochs = INITIAL_EPOCHS + FINE_TUNE_EPOCHS

history_finetune = training_model.fit(
    train_sequence,
    validation_data=val_sequence,
    epochs=total_epochs,
    initial_epoch=history_initial.epoch[-1] + 1,
    callbacks=[checkpoint, reduce_lr, early_stopping],
    class_weight=class_weights
)

training_model.save(f'../models/{username}/full_vggface_model.keras')

visual(history_initial, history_finetune)

print("Trening zaključen. Model shranjen.")
