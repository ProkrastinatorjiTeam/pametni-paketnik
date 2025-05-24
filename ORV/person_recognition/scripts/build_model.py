import os
import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow.keras import layers, models, optimizers, regularizers
from tensorflow.keras.callbacks import ModelCheckpoint

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

train_dir = "../data/raw"
validation_dir = "../data/validation"

IMAGE_SIZE = (100, 100)
BATCH_SIZE = 32
EPOCHS = 10
LR = 0.001

# noinspection PyUnresolvedReferences
train_dataset = tf.keras.utils.image_dataset_from_directory(
    train_dir,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="categorical",
    shuffle=True
)

# noinspection PyUnresolvedReferences
validation_dataset = tf.keras.utils.image_dataset_from_directory(
    validation_dir,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="categorical",
    shuffle=False
)

class_names = train_dataset.class_names
NUM_CLASSES = len(class_names)


normalization_layer = layers.Rescaling(1.0 / 255)
train_dataset = train_dataset.map(lambda x, y: (normalization_layer(x), y))
validation_dataset = validation_dataset.map(lambda x, y: (normalization_layer(x), y))

def build_base_model():
    inputs = layers.Input(shape=(100, 100, 3))
    x = layers.Conv2D(32, (3, 3), padding='same', kernel_regularizer=regularizers.l2(0.001))(inputs)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.Conv2D(64, (3, 3), padding='same', kernel_regularizer=regularizers.l2(0.001))(x)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.MaxPooling2D()(x)
    x = layers.Dropout(0.25)(x)

    x = layers.Conv2D(64, (3, 3), padding='same', kernel_regularizer=regularizers.l2(0.001))(x)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.Conv2D(128, (3, 3), padding='same', kernel_regularizer=regularizers.l2(0.001))(x)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.MaxPooling2D()(x)
    x = layers.Dropout(0.25)(x)

    x = layers.Conv2D(128, (3, 3), padding='same', kernel_regularizer=regularizers.l2(0.001))(x)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.Conv2D(256, (3, 3), padding='same', kernel_regularizer=regularizers.l2(0.001))(x)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.MaxPooling2D()(x)
    x = layers.Dropout(0.25)(x)

    x = layers.Flatten()(x)
    x = layers.Dense(1000, kernel_regularizer=regularizers.l2(0.001))(x)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.Dropout(0.5)(x)

    embeddings = layers.Dense(128, name="embedding")(x)
    normalized_embeddings = tf.math.l2_normalize(embeddings, axis=-1)

    return models.Model(inputs, normalized_embeddings, name="embedding_model")

def build_training_model(base_model):
    inputs = base_model.input
    embeddings = base_model.output
    classifier_output = layers.Dense(NUM_CLASSES, activation='softmax', name='classifier')(embeddings)
    return models.Model(inputs, classifier_output, name="training_model")


embedding_model = build_base_model()
training_model = build_training_model(embedding_model)

training_model.compile(
    optimizer=optimizers.Adam(learning_rate=LR),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

checkpoint = ModelCheckpoint(
    "../models/best_model.keras",
    monitor="val_accuracy",
    save_best_only=True,
    mode="max",
    verbose=1
)

history = training_model.fit(
    train_dataset,
    validation_data=validation_dataset,
    epochs=EPOCHS,
    callbacks=[checkpoint]
)

visual(history)

training_model.save('../models/person_recognition_full_model.keras')
embedding_model.save('../models/person_embedding_model.keras')