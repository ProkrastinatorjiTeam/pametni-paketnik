import json
import os
import time
import numpy as np
import cv2 as cv
import tensorflow as tf

IMAGE_SIZE = (100, 100)
MODELS_BASE_DIR = "../models"
VERIFICATION_THRESHOLD = 0.77
VERIFICATION_DURATION = 10

def preprocess_image_for_embedding(image_data):
    if isinstance(image_data, np.ndarray):
        img = cv.cvtColor(image_data, cv.COLOR_BGR2RGB)
        img = cv.resize(img, IMAGE_SIZE)
        img = img.astype(np.float32) / 255.0
        img = np.expand_dims(img, axis=0)
        return img
    return None

with open("../models/class_index_map.json", "r") as f:
    class_index_map = json.load(f)

def live_verification(user_id):
    print(f"\n--- Starting Live Verification for '{user_id}' ---")

    model_path = os.path.join(MODELS_BASE_DIR, user_id, "best_model.keras")
    try:
        classification_model = tf.keras.models.load_model(model_path, compile=False)
        print(f"✅ Classification model loaded successfully from {model_path}")
    except Exception as e:
        print(f"❌ Error loading model for user '{user_id}': {e}")
        return False

    cap = cv.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Error: Unable to access the camera.")
        return False

    frame_width = int(cap.get(cv.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv.CAP_PROP_FRAME_HEIGHT))

    box_size = 300
    center_x = frame_width // 2
    center_y = frame_height // 2
    top_left = (center_x - box_size // 2, center_y - box_size // 2)
    bottom_right = (center_x + box_size // 2, center_y + box_size // 2)

    print("📷 Starting verification window...")
    start_time = time.time()
    verified = False
    verified_frame = None

    while time.time() - start_time < VERIFICATION_DURATION:
        ret, frame = cap.read()
        if not ret:
            continue

        display_frame = frame.copy()
        cv.rectangle(display_frame, top_left, bottom_right, (0, 255, 0), 2)
        cv.putText(display_frame, "Align your face in the box", (top_left[0] - 50, top_left[1] - 10),
                   cv.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

        x1, y1 = top_left
        x2, y2 = bottom_right
        cropped_face = frame[y1:y2, x1:x2]

        if cropped_face.shape[:2] == (box_size, box_size):
            img = preprocess_image_for_embedding(cropped_face)

            try:
                preds = classification_model.predict(img, verbose=0)[0]
                predicted_class_index = np.argmax(preds)
                predicted_user_id = class_index_map[str(predicted_class_index)]
                confidence = preds[predicted_class_index]

                print(f"Predicted: {predicted_user_id} with confidence {confidence:.4f}")

                if predicted_user_id == user_id and confidence >= VERIFICATION_THRESHOLD:
                    verified = True
                    verified_frame = cropped_face.copy()
                    print(f"\n✅ Verification SUCCESSFUL! User matched with confidence {confidence:.4f}")
                    break

            except Exception as e:
                print(f"❌ Classification prediction error: {e}")

        cv.imshow("Verifying... (Align your face)", display_frame)
        if cv.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv.destroyAllWindows()

    if verified and verified_frame is not None:
        cv.imshow("✅ Verified Face", verified_frame)
        cv.imwrite("last_verified_face.png", verified_frame)
        cv.waitKey(0)
        cv.destroyAllWindows()
        return True
    else:
        print("\n❌ Verification FAILED. No valid match within time limit.")
        return False

if __name__ == "__main__":
    user_id_to_verify = input("Enter user id to verify: ").strip()
    live_verification(user_id_to_verify)