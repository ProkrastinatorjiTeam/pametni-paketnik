import os
import subprocess
import cv2
import time
import math

SAVE_BASE_DIR = "../data"
TRAIN_DIR = os.path.join(SAVE_BASE_DIR, "train")
VAL_DIR = os.path.join(SAVE_BASE_DIR, "validation")
TEST_DIR = os.path.join(SAVE_BASE_DIR, "test")

NUM_IMAGES = 100
CAPTURE_INTERVAL = 0.1
WINDOW_NAME = "Face Enrollment - Position Face in Center"
GUIDING_BOX_SIZE = 300
MODEL_INPUT_SIZE = (224, 224)

TRAIN_SPLIT_RATIO = 0.8
VAL_SPLIT_RATIO = 0.15

HAAR_CASCADE_PATH = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
if not os.path.exists(HAAR_CASCADE_PATH):
    print(f"Error: Haar cascade file not found at {HAAR_CASCADE_PATH}")
    print("Please download it or ensure your OpenCV installation is correct.")
    exit()
face_cascade = cv2.CascadeClassifier(HAAR_CASCADE_PATH)


def draw_guiding_box_and_text(frame, text, size=GUIDING_BOX_SIZE):
    h, w, _ = frame.shape
    center_x, center_y = w // 2, h // 2

    top_left_guide = (center_x - size // 2, center_y - size // 2)
    bottom_right_guide = (center_x + size // 2, center_y + size // 2)
    cv2.rectangle(frame, top_left_guide, bottom_right_guide, (0, 255, 0), 1)


    text_size, _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
    text_x = center_x - text_size[0] // 2
    text_y = top_left_guide[1] - 10
    if text_y < 20:
        text_y = bottom_right_guide[1] + 20

    cv2.putText(frame, text, (text_x, text_y),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)


def capture_user_images(user_id="user_alpha", num_images=NUM_IMAGES, capture_interval=CAPTURE_INTERVAL):
    user_train_dir = os.path.join(TRAIN_DIR, user_id)
    user_val_dir = os.path.join(VAL_DIR, user_id)
    user_test_dir = os.path.join(TEST_DIR, user_id)

    os.makedirs(user_train_dir, exist_ok=True)
    os.makedirs(user_val_dir, exist_ok=True)
    os.makedirs(user_test_dir, exist_ok=True)

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Failed to access webcam.")
        return []

    print(f"📹 Starting capture for {user_id}. Please position your face in the center.")
    cv2.namedWindow(WINDOW_NAME)

    captured_images_count = 0
    last_capture_time = time.time()
    num_train_images = math.floor(num_images * TRAIN_SPLIT_RATIO)
    num_val_images = math.floor(num_images * VAL_SPLIT_RATIO)

    print(
        f"Target images: Total={num_images}, Train={num_train_images}, Validation={num_val_images}, Test={num_images - num_train_images - num_val_images}")
    all_captured_paths = []

    while captured_images_count < num_images:
        ret, frame = cap.read()
        if not ret:
            print("Failed to read frame from webcam.")
            break

        display_frame = frame.copy()
        gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        faces = face_cascade.detectMultiScale(gray_frame, scaleFactor=1.1, minNeighbors=5, minSize=(50, 50))

        face_crop_for_saving = None
        current_message = f"Align face. Captured: {captured_images_count}/{num_images}"

        if len(faces) == 1:
            x, y, w, h = faces[0]
            cv2.rectangle(display_frame, (x, y), (x + w, y + h), (255, 0, 0), 2)
            current_message = f"Face detected! Captured: {captured_images_count}/{num_images}"

            current_time = time.time()
            if current_time - last_capture_time >= capture_interval:
                padding = 20
                x1 = max(0, x - padding)
                y1 = max(0, y - padding)
                x2 = min(frame.shape[1], x + w + padding)
                y2 = min(frame.shape[0], y + h + padding)

                face_crop = frame[y1:y2, x1:x2]

                if face_crop.size == 0:
                    print("Warning: Face crop is empty. Skipping.")
                else:
                    face_crop_for_saving = cv2.resize(face_crop, MODEL_INPUT_SIZE)
                    last_capture_time = current_time

        elif len(faces) > 1:
            current_message = "Multiple faces detected! Only one please."
        else:
            current_message = f"No face detected. Captured: {captured_images_count}/{num_images}"

        draw_guiding_box_and_text(display_frame, current_message)

        if face_crop_for_saving is not None:
            if captured_images_count < num_train_images:
                save_dir = user_train_dir
                set_name = "train"
            elif captured_images_count < num_train_images + num_val_images:
                save_dir = user_val_dir
                set_name = "validation"
            else:
                save_dir = user_test_dir
                set_name = "test"

            image_filename = f"{user_id}_{set_name}_{captured_images_count + 1}.png"
            save_path = os.path.join(save_dir, image_filename)

            cv2.imwrite(save_path, face_crop_for_saving)
            print(f"Captured image {captured_images_count + 1}/{num_images} for '{set_name}' set. Saved as {save_path}")

            all_captured_paths.append(save_path)
            captured_images_count += 1

        cv2.imshow(WINDOW_NAME, display_frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("Capture interrupted by user.")
            break

    cap.release()
    cv2.destroyAllWindows()
    print(f"✅ Finished capturing {captured_images_count} face images.")
    return all_captured_paths


if __name__ == "__main__":
    username = input("Enter new user ID: ").strip()
    if not username:
        print("Username cannot be empty.")
    else:
        image_paths = capture_user_images(username, num_images=NUM_IMAGES)
        if image_paths and len(image_paths) >= (NUM_IMAGES * TRAIN_SPLIT_RATIO * 0.5):
            print(f"\nProceeding to build model for user '{username}'...")
            try:
                subprocess.run(["python", "build_model.py", username], check=True)
                print(f"Model building process for '{username}' completed.")
            except subprocess.CalledProcessError as e:
                print(f"Error during model building for '{username}': {e}")
            except FileNotFoundError:
                print(
                    "Error: build_model.py not found. Make sure it's in the same directory or provide the correct path.")
        elif image_paths:
            print("Not enough images captured to proceed with model training. Please capture more images.")
        else:
            print("No images were captured.")