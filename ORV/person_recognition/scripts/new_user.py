import os
import subprocess

import cv2
import time
import math

SAVE_BASE_DIR = "../data"
TRAIN_DIR = os.path.join(SAVE_BASE_DIR, "train")
VAL_DIR = os.path.join(SAVE_BASE_DIR, "validation")
NUM_IMAGES = 49
CAPTURE_INTERVAL = 0.2
WINDOW_NAME = "Face Enrollment - Turn Slowly"
BOX_SIZE = 300
MODEL_INPUT_SIZE = (100, 100)

def draw_guiding_box(frame, size=BOX_SIZE):
    h, w, _ = frame.shape
    top_left = ((w - size) // 2, (h - size) // 2)
    bottom_right = ((w + size) // 2, (h + size) // 2)
    cv2.rectangle(frame, top_left, bottom_right, (0, 255, 0), 2)
    cv2.putText(frame, "Center face here & slowly turn", (top_left[0], top_left[1] - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 1)

def capture_user_images(user_id="user_alpha", num_images=NUM_IMAGES, capture_interval=CAPTURE_INTERVAL):
    # Create user-specific directories in train and validation folders
    user_train_dir = os.path.join(TRAIN_DIR, user_id)
    user_val_dir = os.path.join(VAL_DIR, user_id)

    os.makedirs(user_train_dir, exist_ok=True)
    os.makedirs(user_val_dir, exist_ok=True)

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Failed to access webcam.")
        return []

    print(f"📹 Starting capture for {user_id}. Please center your face and turn slowly.")
    cv2.namedWindow(WINDOW_NAME)

    captured_images = 0
    last_capture_time = time.time()

    while captured_images < num_images:
        ret, frame = cap.read()
        if not ret:
            print("Failed to read frame from webcam.")
            break

        draw_guiding_box(frame)

        current_time = time.time()
        if current_time - last_capture_time >= capture_interval:
            h, w, _ = frame.shape
            x1 = (w - BOX_SIZE) // 2
            y1 = (h - BOX_SIZE) // 2
            face_crop = frame[y1:y1 + BOX_SIZE, x1:x1 + BOX_SIZE]

            resized_face = cv2.resize(face_crop, MODEL_INPUT_SIZE)

            # Save to train or val
            split_index = math.floor(num_images * 0.8)
            if captured_images < split_index:
                save_path = os.path.join(user_train_dir, f"{user_id}_{captured_images + 1}.png")
            else:
                save_path = os.path.join(user_val_dir, f"{user_id}_{captured_images + 1}.png")

            cv2.imwrite(save_path, resized_face)
            print(f"Captured image {captured_images + 1} saved as {save_path}")

            captured_images += 1
            last_capture_time = current_time

        cv2.imshow(WINDOW_NAME, frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("Capture interrupted by user.")
            break

    cap.release()
    cv2.destroyAllWindows()

    print(f"✅ Finished capturing {captured_images} face images.")

    all_images = []
    for i in range(captured_images):
        if i < split_index:
            all_images.append(os.path.join(user_train_dir, f"{user_id}_{i + 1}.png"))
        else:
            all_images.append(os.path.join(user_val_dir, f"{user_id}_{i + 1}.png"))
    return all_images

if __name__ == "__main__":
    user_id = input("Enter new user ID: ").strip()
    image_paths = capture_user_images(user_id)

    if image_paths:
        subprocess.run(["python", "build_model.py", user_id])