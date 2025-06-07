import os
import random
import cv2 as cv
import numpy as np
import tensorflow as tf
from keras import layers, models, regularizers
from keras.utils import Sequence
from keras_vggface.vggface import VGGFace
from keras_vggface.utils import preprocess_input as vggface_preprocess_input
from flask import current_app 
import logging

class FacesSequence(Sequence):
    def __init__(self, directory, batch_size, image_size, class_names, augment=False, logger=None):
        self.directory = directory
        self.batch_size = batch_size
        self.image_size = image_size # Expected as (height, width) e.g. (224,224)
        self.class_names = class_names
        self.augment = augment
        self.class_to_idx = {cls: i for i, cls in enumerate(class_names)}
        self.samples = []
        self.logger = logger if logger else (current_app.logger if current_app else logging.getLogger(__name__))
        self.vggface_preprocess_version = 1 # As in original build_model.py

        for cls in class_names:
            cls_dir = os.path.join(directory, cls)
            if not os.path.isdir(cls_dir):
                self.logger.warning(f"Class directory not found or not a directory: {cls_dir}. Skipping.")
                continue
            for fname in os.listdir(cls_dir):
                self.samples.append((os.path.join(cls_dir, fname), self.class_to_idx[cls]))
        
        if not self.samples:
            self.logger.warning(f"No images found in directory {self.directory} for classes {class_names}. Sequence will be empty.")
        
        random.shuffle(self.samples)

    def __len__(self):
        return int(np.ceil(len(self.samples) / self.batch_size))

    def __getitem__(self, idx):
        batch_samples = self.samples[idx * self.batch_size:(idx + 1) * self.batch_size]
        images = []
        labels = []
        for img_path, label in batch_samples:
            img = cv.imread(img_path)
            if img is None:
                self.logger.warning(f"Could not read image {img_path}. Skipping.")
                continue
            
            img = cv.cvtColor(img, cv.COLOR_BGR2RGB)
            # Directly using self.image_size as in original build_model.py line 126
            # Assumes IMAGE_SIZE in original was (width, height) for cv.resize, or cv.resize handles (h,w) if square.
            # If IMAGE_SIZE was (H,W) and cv.resize needs (W,H), this might need (self.image_size[1], self.image_size[0])
            # For now, direct copy of logic:
            img = cv.resize(img, self.image_size) 

            if self.augment:
                # custom_augment expects uint8 RGB image
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
        # This logic is directly adapted from src/ai/old/build_model.py custom_augment
        # It expects an uint8 RGB image and returns an uint8 RGB image.
        image = image_uint8.astype(np.float32) / 255.0

        if random.random() > 0.5:
            image = cv.flip(image, 1)

        brightness_factor = random.uniform(0.8, 1.2)
        image = np.clip(image * brightness_factor, 0, 1)

        mean = np.mean(image, axis=(0, 1), keepdims=True)
        contrast_factor = random.uniform(0.8, 1.2)
        image = np.clip((image - mean) * contrast_factor + mean, 0, 1)
        
        hsv_input_img = (image * 255).astype(np.uint8) # For HSV conversion
        hsv = cv.cvtColor(hsv_input_img, cv.COLOR_RGB2HSV).astype(np.float32)
        saturation_factor = random.uniform(0.8, 1.2)
        hsv[:, :, 1] = np.clip(hsv[:, :, 1] * saturation_factor, 0, 255)
        image_hsv_adjusted = cv.cvtColor(hsv.astype(np.uint8), cv.COLOR_HSV2RGB)
        image = image_hsv_adjusted.astype(np.float32) / 255.0

        angle = random.uniform(-15, 15)
        # Original build_model.py (lines 175-176) used self.image_size[0] for tx, self.image_size[1] for ty
        # Assuming self.image_size is (height, width) as per Keras convention
        tx = random.uniform(-0.1, 0.1) * self.image_size[0] 
        ty = random.uniform(-0.1, 0.1) * self.image_size[1]
        
        warp_input_img = (image * 255).astype(np.uint8) # For warpAffine
        # Original build_model.py (line 180) used (self.image_size[0]/2, self.image_size[1]/2) for center
        # Original build_model.py (line 182) used self.image_size for dsize in warpAffine
        # Replicating this direct usage:
        center_of_rotation = (self.image_size[0] / 2, self.image_size[1] / 2)
        dsize_for_warp = self.image_size

        M_rot_trans = cv.getRotationMatrix2D(center_of_rotation, angle, 1)
        M_rot_trans[:, 2] += [tx, ty]
        image_warped = cv.warpAffine(warp_input_img, M_rot_trans, dsize_for_warp, borderMode=cv.BORDER_REFLECT_101)
        image = image_warped.astype(np.float32) / 255.0

        if random.random() < 0.3: # Noise
            noise = np.random.normal(0, 0.02, image.shape).astype(np.float32)
            image = np.clip(image + noise, 0, 1)

        if random.random() < 0.3: # Blur
            ksize = random.choice([3, 5])
            image = cv.GaussianBlur(image, (ksize, ksize), 0)

        return (image * 255.0).astype(np.uint8)


def build_vggface_classifier(input_shape, l2_reg_factor, dropout_dense_rate, logger=None):
    # This function is a direct adaptation of build_vggface_model from src/ai/old/build_model.py (lines 224-247)
    if logger is None:
        logger = current_app.logger if current_app else logging.getLogger(__name__)

    base_model_object = VGGFace(model='vgg16',
                                weights='vggface',
                                include_top=False,
                                input_shape=input_shape, # e.g., (224, 224, 3)
                                pooling=None) 

    logger.info(f"VGGFace base model loaded. Name: {base_model_object.name}, Trainable: {base_model_object.trainable}")
    
    base_model_object.trainable = False # Freeze base model layers

    inputs = base_model_object.input
    x = base_model_object.output

    x = layers.GlobalAveragePooling2D(name="gap")(x)
    x = layers.Dense(512, kernel_regularizer=regularizers.l2(l2_reg_factor), name="fc1")(x)
    x = layers.BatchNormalization(name="bn1")(x)
    x = layers.ReLU(name="relu1")(x)
    x = layers.Dropout(dropout_dense_rate, name="dropout1")(x)

    outputs = layers.Dense(1, activation='sigmoid', name='classifier')(x) # Binary classification

    final_model = models.Model(inputs=inputs, outputs=outputs, name="vggface_binary_classifier") # Name updated for clarity
    logger.info("Custom VGGFace classifier head built based on build_vggface_model.")
    
    return final_model, base_model_object