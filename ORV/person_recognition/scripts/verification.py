import os
import sys
import cv2 as cv
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.utils import Sequence
from keras_vggface.utils import preprocess_input as vggface_preprocess_input

from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import seaborn as sns
import matplotlib.pyplot as plt

IMAGE_SIZE = (224, 224)

class FacesSequence(Sequence):
    def __init__(self, directory, batch_size, image_size, class_names, augment=False):
        self.directory = directory
        self.batch_size = batch_size
        self.image_size = image_size
        self.class_names = class_names
        self.augment = augment  # Za testiranje mora biti False
        self.class_to_idx = {cls: i for i, cls in enumerate(class_names)}
        self.samples = []
        for cls in class_names:
            cls_dir = os.path.join(directory, cls)
            if not os.path.isdir(cls_dir):
                print(f"Opozorilo: Mapa ni najdena {cls_dir} v {directory}")
                continue
            for fname in os.listdir(cls_dir):
                self.samples.append((os.path.join(cls_dir, fname), self.class_to_idx[cls]))

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
                print(f"Opozorilo: Slike ni bilo mogoče prebrati {img_path}. Preskočim.")
                continue
            img = cv.cvtColor(img, cv.COLOR_BGR2RGB)
            img = cv.resize(img, self.image_size)

            img_to_preprocess = img.astype(np.float32)
            img_processed = vggface_preprocess_input(img_to_preprocess, version=self.vggface_preprocess_version)

            images.append(img_processed)
            labels.append(label)

        if not images:
            return np.array([]), np.array([])

        return np.array(images), np.array(labels, dtype=np.float32)

    def on_epoch_end(self):

        pass


if 'username' not in locals():
    if len(sys.argv) > 1:
        username = sys.argv[1]
        print(f"Testiram model za uporabnika (iz argumenta): {username}")
    else:
        username = "janez"
        print(f"OPOZORILO: Uporabniško ime ni podano kot argument, uporabljam privzeto: '{username}'")
        print("Za testiranje specifičnega uporabnika zaženite: python test_model.py <username>")

MODEL_PATH = f"../models/{username}/best_vggface_model.keras"
CLASS_NAMES = ["not_user", username]


def predict_single_image(image_path, model_to_test, threshold=0.5):
    """Naloži, predprocesira sliko in naredi napoved."""
    img = cv.imread(image_path)
    if img is None:
        print(f"Napaka: Slike ni bilo mogoče naložiti s poti: {image_path}")
        return None, None

    img_rgb = cv.cvtColor(img, cv.COLOR_BGR2RGB)
    img_resized = cv.resize(img_rgb, IMAGE_SIZE)
    img_to_preprocess = img_resized.astype(np.float32)

    img_processed = vggface_preprocess_input(img_to_preprocess, version=1)
    img_batch = np.expand_dims(img_processed, axis=0)

    prediction_prob = model_to_test.predict(img_batch, verbose=0)[0][0]

    if prediction_prob > threshold:
        predicted_label = CLASS_NAMES[1]
    else:
        predicted_label = CLASS_NAMES[0]

    return predicted_label, prediction_prob


if not os.path.exists(MODEL_PATH):
    print(f"Napaka: Model na poti {MODEL_PATH} ne obstaja.")
    sys.exit(1)

print(f"Nalaganje modela s poti: {MODEL_PATH}")

trained_model = load_model(MODEL_PATH, compile=False)

print("\n--- Sistematična evaluacija na celotnem testnem naboru ---")

test_dir = f"../data/test"

if not os.path.isdir(test_dir):
    print(f"Napaka: Testna mapa '{test_dir}' ne obstaja. Sistematična evaluacija ni mogoča.")
    sys.exit(1)
if not os.path.isdir(os.path.join(test_dir, username)):
    print(f"Napaka: Mapa za uporabnika '{username}' ne obstaja znotraj '{test_dir}'.")
    sys.exit(1)
if not os.path.isdir(os.path.join(test_dir, "not_user")):
    print(f"Napaka: Mapa 'not_user' ne obstaja znotraj '{test_dir}'.")
    sys.exit(1)

test_sequence = FacesSequence(
    directory=test_dir,
    batch_size=16,
    image_size=IMAGE_SIZE,
    class_names=CLASS_NAMES,
    augment=False
)

if len(test_sequence.samples) == 0:
    print(f"Opozorilo: V testni mapi '{test_dir}' ni bilo najdenih nobenih slik preko FacesSequence.")
    print("Preverite, ali so slike neposredno v podmapah 'not_user' in '{username}', ne v dodatnih podmapah.")
else:
    print(f"Najdenih {len(test_sequence.samples)} slik v testnem naboru.")

    print("Pridobivam napovedi za testni nabor...")
    y_pred_probs = trained_model.predict(test_sequence, verbose=1)

    y_true = []
    print("Pridobivam dejanske labele iz testnega nabora...")
    for i in range(len(test_sequence)):
        if i % (len(test_sequence) // 10 + 1) == 0:  # Izpis napredka
            print(f"  Obdelujem batch label {i + 1}/{len(test_sequence)}")
        _, labels_batch = test_sequence[i]
        if labels_batch.size > 0:
            y_true.extend(labels_batch)
    y_true = np.array(y_true).astype(int)

    if y_pred_probs.size == 0 or y_true.size == 0:
        print("Napaka: Ni bilo mogoče pridobiti napovedi ali dejanskih label. Preverite testni nabor.")
    elif len(y_pred_probs) != len(y_true):
        print(f"Napaka: Število napovedi ({len(y_pred_probs)}) se ne ujema s številom dejanskih label ({len(y_true)}).")
        print(
            "To se lahko zgodi, če so bile nekatere slike v testnem naboru preskočene (npr. jih ni bilo mogoče prebrati).")
        print("Poskusite očistiti testni nabor ali prilagoditi FacesSequence za robustnejše ravnanje z napakami.")
    else:
        threshold = 0.5
        y_pred_classes = (y_pred_probs.flatten() > threshold).astype(int)

        accuracy = accuracy_score(y_true, y_pred_classes)
        print(f"\nCelokupna točnost na testnem naboru: {accuracy:.4f}")

        print("\nPoročilo o klasifikaciji:")
        try:
            report = classification_report(y_true, y_pred_classes, target_names=CLASS_NAMES, zero_division=0)
            print(report)
        except ValueError as e:
            print(f"Napaka pri generiranju poročila o klasifikaciji: {e}")
            print("To se lahko zgodi, če ena od kategorij nima napovedi ali dejanskih primerov v testnem naboru.")
            print(f"Dejanske labele (unikatne): {np.unique(y_true, return_counts=True)}")
            print(f"Napovedane labele (unikatne): {np.unique(y_pred_classes, return_counts=True)}")

        print("\nMatrika zmede (Confusion Matrix):")
        try:
            cm = confusion_matrix(y_true, y_pred_classes, labels=[0, 1])  # Eksplicitno podamo labele
            print(f"Oblika matrike zmede: {cm.shape}")
            print("Struktura: [[TN, FP], [FN, TP]]")
            print(f"TN (not_user napovedan kot not_user): {cm[0, 0] if cm.shape == (2, 2) else 'N/A'}")
            print(f"FP (not_user napovedan kot {username}): {cm[0, 1] if cm.shape == (2, 2) else 'N/A'}")
            print(f"FN ({username} napovedan kot not_user): {cm[1, 0] if cm.shape == (2, 2) else 'N/A'}")
            print(f"TP ({username} napovedan kot {username}): {cm[1, 1] if cm.shape == (2, 2) else 'N/A'}")

            if cm.shape == (2, 2):
                plt.figure(figsize=(6, 5))
                sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                            xticklabels=CLASS_NAMES, yticklabels=CLASS_NAMES)
                plt.xlabel("Napovedana labela")
                plt.ylabel("Dejanska labela")
                plt.title(f"Matrika zmede za '{username}'")
                plt.tight_layout()
                output_plot_path = f"../models/{username}/confusion_matrix_test.png"
                plt.savefig(output_plot_path)
                print(f"Matrika zmede shranjena v: {output_plot_path}")
                plt.show()
            else:
                print("Matrike zmede ni mogoče prikazati, ker ni oblike 2x2.")
                print(f"Matrika:\n{cm}")

        except ValueError as e:
            print(f"Napaka pri računanju ali prikazu matrike zmede: {e}")

print("\n--- Testiranje zaključeno ---")
