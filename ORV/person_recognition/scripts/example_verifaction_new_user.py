import os
import numpy as np
import cv2 as cv
import tensorflow as tf

IMAGE_SIZE = (100, 100)
MODEL_PATH = '../models/person_embedding_model.keras'
EMBEDDINGS_BASE_DIR = "../embeddings"

try:
    embedding_model = tf.keras.models.load_model(MODEL_PATH, compile=False)
    print(f"Embedding model loaded successfully from {MODEL_PATH}")
except Exception as e:
    print(f"Error loading embedding model: {e}")
    exit()

os.makedirs(EMBEDDINGS_BASE_DIR, exist_ok=True)


def preprocess_image_for_embedding(image_data):
    """
    Preprocesses a single image (OpenCV BGR numpy array or image path)
    for the embedding model.
    """
    if isinstance(image_data, str):
        img = cv.imread(image_data)
        if img is None:
            print(f"Warning: Could not read image from path {image_data}")
            return None
    elif isinstance(image_data, np.ndarray):
        img = image_data
    else:
        print("Warning: Invalid image_data type for preprocessing.")
        return None

    img = cv.cvtColor(img, cv.COLOR_BGR2RGB)
    img = cv.resize(img, IMAGE_SIZE)
    img = img.astype(np.float32) / 255.0
    img = np.expand_dims(img, axis=0)
    return img


def generate_user_template_embedding(list_of_user_images):
    """
    Generates a single template embedding for a user from a list of their images.
    """
    user_embeddings = []
    if len(list_of_user_images) == 0:
        print("Error: No images provided for enrollment.")
        return None

    for image_data in list_of_user_images:
        preprocessed_img = preprocess_image_for_embedding(image_data)
        if preprocessed_img is not None:
            try:
                embedding = embedding_model.predict(preprocessed_img, verbose=0)[0]
                user_embeddings.append(embedding)
            except Exception as e:
                print(f"Error generating embedding for an image: {e}")
                continue
    if not user_embeddings:
        print("Error: Could not generate any embeddings for the provided user images.")
        return None
    user_embeddings_np = np.array(user_embeddings)
    template_embedding = np.mean(user_embeddings_np, axis=0)
    print(f"Successfully generated template embedding from {len(user_embeddings_np)} images.")
    return template_embedding


def save_user_embedding(user_id, embedding_array):
    """
    Saves the user's embedding to a file.
    Path: embeddings/user_id/embedding.npy
    """
    user_dir = os.path.join(EMBEDDINGS_BASE_DIR, str(user_id))
    os.makedirs(user_dir, exist_ok=True)
    embedding_file_path = os.path.join(user_dir, "embedding.npy")
    try:
        np.save(embedding_file_path, embedding_array)
        print(f"Embedding for user '{user_id}' saved to: {embedding_file_path}")
        return True
    except Exception as e:
        print(f"Error saving embedding for user '{user_id}': {e}")
        return False


def load_user_embedding(user_id):
    """
    Loads the user's embedding from a file.
    Path: embeddings/user_id/embedding.npy
    """
    embedding_file_path = os.path.join(EMBEDDINGS_BASE_DIR, str(user_id), "embedding.npy")
    if os.path.exists(embedding_file_path):
        try:
            embedding_array = np.load(embedding_file_path)
            print(f"Embedding for user '{user_id}' loaded from: {embedding_file_path}")
            return embedding_array
        except Exception as e:
            print(f"Error loading embedding for user '{user_id}': {e}")
            return None
    else:
        print(f"No embedding file found for user '{user_id}' at: {embedding_file_path}")
        return None


if __name__ == "__main__":
    new_user_id_to_enroll = "user_alpha"
    enrollment_image_paths = [
        "../data/newuser/IMG_1869.jpeg",
        "../data/newuser/IMG_1870.jpeg",
        "../data/newuser/IMG_1871.jpeg",
        "../data/newuser/IMG_1872.jpeg",
        "../data/newuser/IMG_1873.jpeg",
    ]

    print(f"\n--- Enrolling New User: {new_user_id_to_enroll} ---")
    template = generate_user_template_embedding(enrollment_image_paths)

    if template is not None:
        print(f"Template embedding for user '{new_user_id_to_enroll}': (shape: {template.shape})")

        if save_user_embedding(new_user_id_to_enroll, template):
            print(f"User '{new_user_id_to_enroll}' enrolled successfully.")
        else:
            print(f"Failed to save embedding for user '{new_user_id_to_enroll}'.")
    else:
        print(f"Enrollment failed for user '{new_user_id_to_enroll}'.")

    print("-" * 30)

    user_id_to_verify = "user_alpha"
    login_image_path = "../data/newuser/IMG_1873.jpeg"

    print(f"\n--- Verifying User: {user_id_to_verify} ---")
    print(f"Attempting login with image: {login_image_path}")

    stored_template = load_user_embedding(user_id_to_verify)

    if stored_template is not None:
        preprocessed_login_img = preprocess_image_for_embedding(login_image_path)
        if preprocessed_login_img is not None:
            live_embedding = embedding_model.predict(preprocessed_login_img, verbose=0)[0]
            print(f"Live embedding generated. Shape: {live_embedding.shape}")

            cosine_similarity = np.dot(stored_template, live_embedding)
            print(f"Cosine Similarity: {cosine_similarity:.4f}")

            VERIFICATION_THRESHOLD = 0.75
            if cosine_similarity >= VERIFICATION_THRESHOLD:
                print(
                    f"Verification SUCCESSFUL for {user_id_to_verify}! (Similarity >= Threshold: {VERIFICATION_THRESHOLD})")
            else:
                print(
                    f"Verification FAILED for {user_id_to_verify}. (Similarity < Threshold: {VERIFICATION_THRESHOLD})")
        else:
            print("Failed to preprocess login image for verification.")
    else:
        print(f"Verification failed: User '{user_id_to_verify}' not found or no embedding stored.")

    print("-" * 30)

    impostor_user_id_to_verify = "user_alpha"
    impostor_login_image_path = "../data/dataset/Hugh Jackman/Hugh Jackman_20.jpg"

    if not os.path.exists(impostor_login_image_path):
        print(
            f"\nNote: Impostor image '{impostor_login_image_path}' not found. Creating a dummy random image for demo.")
        dummy_impostor_array = np.random.randint(0, 256, (160, 160, 3), dtype=np.uint8)
        cv.imwrite("dummy_impostor.png", dummy_impostor_array)
        impostor_login_image_path = "dummy_impostor.png"

    print(f"\n--- Impostor Attempt: Verifying as '{impostor_user_id_to_verify}' ---")
    print(f"Attempting login with image: {impostor_login_image_path} (expected to be a different person)")

    stored_template_for_impostor_check = load_user_embedding(impostor_user_id_to_verify)

    if stored_template_for_impostor_check is not None:
        preprocessed_impostor_img = preprocess_image_for_embedding(impostor_login_image_path)
        if preprocessed_impostor_img is not None:
            impostor_live_embedding = embedding_model.predict(preprocessed_impostor_img, verbose=0)[0]
            print(f"Impostor live embedding generated. Shape: {impostor_live_embedding.shape}")

            cosine_similarity_impostor = np.dot(stored_template_for_impostor_check, impostor_live_embedding)
            print(f"Cosine Similarity (Impostor): {cosine_similarity_impostor:.4f}")

            if cosine_similarity_impostor >= VERIFICATION_THRESHOLD:
                print(
                    f"IMPOSTOR Verification FAILED (as expected, but system allowed access)! (Similarity >= Threshold)")
            else:
                print(f"IMPOSTOR Verification CORRECTLY REJECTED. (Similarity < Threshold)")
        else:
            print("Failed to preprocess impostor login image.")
    else:
        print(f"Verification failed: User '{impostor_user_id_to_verify}' not found or no embedding stored.")

    if os.path.exists("dummy_impostor.png"):
        os.remove("dummy_impostor.png")
