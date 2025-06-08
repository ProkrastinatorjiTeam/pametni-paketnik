import tensorflow as tf
import matplotlib.pyplot as plt
import numpy as np


train_dir = "../data/train"


def prikazi_primer_slika(dataset, imena_razredov):
    primerki_po_razredih = {}

    for images, labels in dataset:
        for img, lbl in zip(images, labels):
            lbl_val = lbl.numpy()
            if lbl_val not in primerki_po_razredih:
                primerki_po_razredih[lbl_val] = img.numpy()

            if len(primerki_po_razredih) == len(imena_razredov):
                break
        if len(primerki_po_razredih) == len(imena_razredov):
            break

    plt.figure(figsize=(15, 7))
    for i, razred in enumerate(sorted(primerki_po_razredih.keys())):
        plt.subplot(2, len(imena_razredov) // 2 + 1, i + 1)
        slika = primerki_po_razredih[razred]
        plt.imshow(slika.astype("uint8"))
        plt.title(imena_razredov[razred])
        plt.axis('off')

    plt.tight_layout()
    plt.show()

tren_dataset = tf.keras.utils.image_dataset_from_directory(
    train_dir,
    labels='inferred',
    label_mode='int',
    image_size=(100, 100),
    batch_size=32,
    shuffle=True,
    seed=123
)

imena_razredov = tren_dataset.class_names
print("Razredi:", imena_razredov)

prikazi_primer_slika(tren_dataset, imena_razredov)
