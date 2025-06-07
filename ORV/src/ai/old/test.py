import os
import tensorflow as tf
import numpy as np
from tensorflow.keras.preprocessing import image
from scipy.spatial.distance import cosine

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

embedding_model = tf.keras.models.load_model('../models/person_embedding_model.keras')

def preprocess_image(img_path):
    img = image.load_img(img_path, target_size=(100, 100))
    img_array = image.img_to_array(img)
    img_array = img_array / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

def get_embedding(img_path):
    img = preprocess_image(img_path)
    embedding = embedding_model.predict(img)
    return embedding[0]

known_image = "../data/test/Robert Downey Jr/Robert Downey Jr_23.jpg"
new_image = "../data/test/Robert Downey Jr/Robert Downey Jr_108.jpg"

embedding_known = get_embedding(known_image)
embedding_new = get_embedding(new_image)

distance = cosine(embedding_known, embedding_new)

print(f"Razdalja med obrazoma: {distance:.4f}")

threshold = 0.5

if distance < threshold:
    print("Osebi sta verjetno enaki.")
else:
    print("Osebi sta različni.")
