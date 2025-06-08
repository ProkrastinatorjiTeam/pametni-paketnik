import os
import tensorflow as tf
from keras import optimizers
from keras.callbacks import ModelCheckpoint, ReduceLROnPlateau, EarlyStopping
from flask import current_app
import logging

from .model_components import FacesSequence, build_vggface_classifier

def train_model_for_user(
    user_id: str,
    base_data_dir: str, # e.g., 'ORV/data'
    base_models_dir: str, # e.g., 'ORV/models'
    app_config: dict, 
    logger=None
):
    if logger is None:
        logger = current_app.logger if current_app else logging.getLogger(__name__)

    logger.info(f"Starting training process for user_id: {user_id}")

    # --- Configuration from app_config (matching globals in old build_model.py) ---
    image_size = app_config.get('AI_MODEL_INPUT_SIZE', (224, 224)) # Corresponds to IMAGE_SIZE
    batch_size = app_config.get('AI_BATCH_SIZE', 16)               # Corresponds to BATCH_SIZE
    initial_epochs = app_config.get('AI_INITIAL_EPOCHS', 20)       # Corresponds to INITIAL_EPOCHS
    fine_tune_epochs = app_config.get('AI_FINE_TUNE_EPOCHS', 20)   # Corresponds to FINE_TUNE_EPOCHS
    lr_initial = app_config.get('AI_LEARNING_RATE_INITIAL', 0.001) # Corresponds to LR_INITIAL
    lr_finetune = app_config.get('AI_LEARNING_RATE_FINETUNE', 0.00005) # Corresponds to LR_FINETUNE
    optimal_l2_reg = app_config.get('AI_OPTIMAL_L2_REG', 0.0005)     # Corresponds to OPTIMAL_L2_REG
    optimal_dropout_dense = app_config.get('AI_OPTIMAL_DROPOUT_DENSE', 0.5) # Corresponds to OPTIMAL_DROPOUT_DENSE

    # --- Path definitions ---
    # train_dir and validation_dir for FacesSequence should point to the root of class folders
    # e.g., data/train/ (which contains user_id/ and not_user/)
    train_data_root_path = os.path.join(base_data_dir, 'train') 
    val_data_root_path = os.path.join(base_data_dir, 'validation')
    
    user_model_save_dir = os.path.join(base_models_dir, user_id)
    os.makedirs(user_model_save_dir, exist_ok=True)
    # Path for ModelCheckpoint, matching "best_vggface_model.keras" from old script
    model_checkpoint_path = os.path.join(user_model_save_dir, 'best_vggface_model.keras')
    # Path for the final full model
    full_model_save_path = os.path.join(user_model_save_dir, 'full_vggface_model.keras')

    # --- Class names (direct adaptation from old build_model.py line 98) ---
    class_names = ["not_user", user_id] 
    logger.info(f"Training with classes: {class_names}")

    # --- Data Sequences (direct adaptation from old build_model.py lines 100-101) ---
    try:
        train_sequence = FacesSequence(
            directory=train_data_root_path, 
            batch_size=batch_size,
            image_size=image_size,
            class_names=class_names,
            augment=True, # Augmentation for training set
            logger=logger
        )
        val_sequence = FacesSequence(
            directory=val_data_root_path,
            batch_size=batch_size,
            image_size=image_size,
            class_names=class_names,
            augment=False, # No augmentation for validation set
            logger=logger
        )
    except Exception as e:
        logger.error(f"Failed to create FacesSequence for user {user_id}: {e}")
        return False, f"Data sequence creation failed: {e}"

    if len(train_sequence.samples) == 0:
        logger.error(f"No training samples found for user {user_id} or 'not_user' in {train_data_root_path}. Aborting training.")
        return False, "No training samples found."
    if len(val_sequence.samples) == 0 and initial_epochs > 0 : # Keras needs val_data if val_accuracy/loss is monitored
        logger.warning(f"No validation samples found for user {user_id} or 'not_user' in {val_data_root_path}. Validation-based callbacks might fail.")
        # Consider if training should proceed or if this is a critical error.
        # For now, let Keras handle it, but callbacks might error.

    # --- Class Weights Calculation (direct adaptation from old build_model.py lines 103-114) ---
    num_not_user_train = sum(1 for _, label_idx in train_sequence.samples if train_sequence.class_names[label_idx] == "not_user")
    num_user_train = sum(1 for _, label_idx in train_sequence.samples if train_sequence.class_names[label_idx] == user_id)
    
    class_weights_dict = None
    if num_user_train > 0 and num_not_user_train > 0:
        total_train_samples = num_not_user_train + num_user_train
        weight_for_0 = (1 / num_not_user_train) * (total_train_samples / 2.0) 
        weight_for_1 = (1 / num_user_train) * (total_train_samples / 2.0)   
        class_weights_dict = {
            train_sequence.class_to_idx['not_user']: weight_for_0,
            train_sequence.class_to_idx[user_id]: weight_for_1
        }
        logger.info(f"Using class weights for user {user_id}: {class_weights_dict}")
    elif num_user_train == 0:
        logger.error(f"No training images found for specific user {user_id} in {os.path.join(train_data_root_path, user_id)}. Aborting.")
        return False, f"No training images for user {user_id}."
    # If only user_id images or only not_user images, class_weights_dict remains None, Keras default behavior.

    # --- Build Model (direct adaptation from old build_model.py line 250) ---
    try:
        training_model, vgg_base_model_ref = build_vggface_classifier(
            input_shape=(image_size[0], image_size[1], 3),
            l2_reg_factor=optimal_l2_reg,
            dropout_dense_rate=optimal_dropout_dense,
            logger=logger
        )
        # training_model.summary(print_fn=logger.info) # Optional: for verbose logging
    except Exception as e:
        logger.error(f"Failed to build model for user {user_id}: {e}")
        return False, f"Model building failed: {e}"

    # --- Callbacks (direct adaptation from old build_model.py lines 267-287) ---
    # ModelCheckpoint: Saves the best model based on val_accuracy.
    checkpoint = ModelCheckpoint(
        model_checkpoint_path, # Path to save the best model
        monitor="val_accuracy",
        save_best_only=True,
        mode="max",
        verbose=1
    )
    # EarlyStopping: Stops training if val_loss doesn't improve.
    early_stopping = EarlyStopping(
        monitor="val_loss",
        patience=5, 
        verbose=1,
        mode="min",
        restore_best_weights=True # Restores model weights from the epoch with the best value of the monitored quantity.
    )
    # ReduceLROnPlateau: Reduces learning rate if val_loss plateaus.
    reduce_lr = ReduceLROnPlateau(
        monitor="val_loss",
        factor=0.2, # Factor by which the learning rate will be reduced. new_lr = lr * factor.
        patience=5, 
        verbose=1,
        mode="min",
        min_delta=0.0001, # Threshold for measuring the new optimum, to only focus on significant changes.
        min_lr=1e-7 
    )
    
    callbacks_list = [checkpoint, early_stopping, reduce_lr]
    if len(val_sequence.samples) == 0: # If no validation data, remove callbacks that monitor val_ metrics
        logger.warning("No validation data; removing validation-dependent callbacks (ModelCheckpoint, EarlyStopping, ReduceLROnPlateau).")
        callbacks_list = []


    # --- Phase 1: Training the classifier head (direct adaptation from old build_model.py lines 260-292) ---
    logger.info(f"--- Phase 1: Training classifier head for user {user_id} ---")
    training_model.compile(
        optimizer=optimizers.Adam(learning_rate=lr_initial),
        loss="binary_crossentropy", 
        metrics=["accuracy"]
    )
    try:
        history_initial = training_model.fit(
            train_sequence,
            validation_data=val_sequence if len(val_sequence.samples) > 0 else None,
            epochs=initial_epochs,
            callbacks=callbacks_list,
            class_weight=class_weights_dict,
            verbose=1 
        )
    except Exception as e:
        logger.error(f"Error during initial training phase for user {user_id}: {e}")
        return False, f"Initial training phase failed: {e}"

    # --- Phase 2: Fine-tuning the model (direct adaptation from old build_model.py lines 294-311) ---
    logger.info(f"--- Phase 2: Fine-tuning model for user {user_id} ---")
    if vgg_base_model_ref:
        vgg_base_model_ref.trainable = True 
        logger.info(f"Unfroze VGGFace base model ({vgg_base_model_ref.name}) for fine-tuning.")
        # Optional: Selectively unfreeze layers if needed, original script unfreezes all.
        # for layer in vgg_base_model_ref.layers[-4:]: # Example: unfreeze last 4 layers
        #    if not isinstance(layer, layers.BatchNormalization):
        #        layer.trainable = True
    else:
        logger.warning("VGGFace base model reference not available for fine-tuning.")

    training_model.compile(
        optimizer=optimizers.Adam(learning_rate=lr_finetune), 
        loss="binary_crossentropy",
        metrics=["accuracy"]
    )
    
    # Calculate epochs for fine-tuning phase
    # The initial_epoch argument in fit() is 0-indexed.
    # If history_initial.epoch is empty (e.g. initial_epochs=0), handle it.
    start_epoch_for_finetune = 0
    if history_initial and history_initial.epoch:
      start_epoch_for_finetune = history_initial.epoch[-1] + 1
    
    total_epochs_for_finetune_phase = start_epoch_for_finetune + fine_tune_epochs

    try:
        training_model.fit(
            train_sequence,
            validation_data=val_sequence if len(val_sequence.samples) > 0 else None,
            epochs=total_epochs_for_finetune_phase,
            initial_epoch=start_epoch_for_finetune,
            callbacks=callbacks_list, # Re-use callbacks
            class_weight=class_weights_dict,
            verbose=1
        )
    except Exception as e:
        logger.error(f"Error during fine-tuning phase for user {user_id}: {e}")
        return False, f"Fine-tuning phase failed: {e}"

    # --- Save the final model (direct adaptation from old build_model.py line 313) ---
    try:
        training_model.save(full_model_save_path)
        logger.info(f"Full fine-tuned model for user {user_id} saved to {full_model_save_path}")
        if os.path.exists(model_checkpoint_path):
            logger.info(f"Best model during training (based on val_accuracy) also available at {model_checkpoint_path}")
        else:
            logger.warning(f"Best model checkpoint {model_checkpoint_path} not found. This might happen if validation data was unavailable or training was too short.")

    except Exception as e:
        logger.error(f"Failed to save final model for user {user_id}: {e}")
        return False, f"Model saving failed: {e}"

    logger.info(f"Training completed successfully for user {user_id}.")
    return True, f"Training completed. Model saved at {user_model_save_dir}"
