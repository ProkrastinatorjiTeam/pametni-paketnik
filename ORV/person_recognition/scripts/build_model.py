import tensorflow as tf
from keras import layers, models, optimizers

train_dir = "../data/train"
test_dir = "../data/test"

IMAGE_SIZE = (100, 100)
BATCH_SIZE = 32
EPOCHS = 20
LR = 0.01

# noinspection PyUnresolvedReferences
train_dataset = tf.keras.utils.image_dataset_from_directory(
    train_dir,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="categorical",
)

# noinspection PyUnresolvedReferences
test_dataset = tf.keras.utils.image_dataset_from_directory(
    test_dir,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="categorical",
)

class_names = train_dataset.class_names
normalization_layer = layers.Rescaling(1.0 / 255)

train_dataset = train_dataset.map(lambda x, y: (normalization_layer(x), y))
test_dataset = test_dataset.map(lambda x, y: (normalization_layer(x), y))

model = models.Sequential([
    layers.Input(shape=(100, 100, 3)),
    layers.Conv2D(32, (3, 3), activation="relu", padding='same'),
    layers.Conv2D(64, (3, 3), activation="relu", padding='same'),
    layers.MaxPooling2D(pool_size=(2, 2)),

    layers.Conv2D(64, (3, 3), activation="relu", padding='same'),
    layers.Conv2D(128, (3, 3), activation="relu", padding='same'),
    layers.MaxPooling2D(pool_size=(2, 2)),

    layers.Conv2D(128, (3, 3), activation="relu", padding='same'),
    layers.Conv2D(256, (3, 3), activation="relu", padding='same'),
    layers.MaxPooling2D(pool_size=(2, 2)),

    layers.Flatten(),
    layers.Dense(1000, activation="relu"),
    layers.Dropout(0.5),
    layers.Dense(100, activation="relu"),
    layers.Dropout(0.5),

    layers.Dense(len(class_names), activation="softmax"),
])

optimizer = optimizers.Adam(learning_rate=LR)
model.compile(optimizer=optimizer, loss="categorical_crossentropy", metrics=["accuracy"])

model.fit(train_dataset, epochs=EPOCHS, validation_data=test_dataset)

model.save('../models/person_recognition_model.keras')
