import os
import tensorflow as tf
from keras import optimizers
from keras.callbacks import ModelCheckpoint, ReduceLROnPlateau, EarlyStopping
from flask import current_app
import logging

from .model_components import FacesSequence, build_vggface_classifier

def train_model_for_user(
    user_id: str,
    base_data_dir: str, 
    base_models_dir: str, 
    app_config: dict, 
    logger=None
):
    if logger is None:
        logger = current_app.logger if current_app else logging.getLogger(__name__)

    logger.info(f"Starting training process for user_id: {user_id}")

    # --- Configuration Loading ---
    image_size = app_config.get('AI_MODEL_INPUT_SIZE', (224, 224)) 
    batch_size = app_config.get('AI_BATCH_SIZE', 16)               
    initial_epochs = app_config.get('AI_INITIAL_EPOCHS', 20)       
    fine_tune_epochs = app_config.get('AI_FINE_TUNE_EPOCHS', 20)   
    lr_initial = app_config.get('AI_LEARNING_RATE_INITIAL', 0.001) 
    lr_finetune = app_config.get('AI_LEARNING_RATE_FINETUNE', 0.00005) 
    optimal_l2_reg = app_config.get('AI_OPTIMAL_L2_REG', 0.0005)     
    optimal_dropout_dense = app_config.get('AI_OPTIMAL_DROPOUT_DENSE', 0.5) 

    # --- Path Definitions ---
    train_data_root_path = os.path.join(base_data_dir, 'train') 
    val_data_root_path = os.path.join(base_data_dir, 'validation')
    
    user_model_save_dir = os.path.join(base_models_dir, user_id)
    os.makedirs(user_model_save_dir, exist_ok=True)
    model_checkpoint_path = os.path.join(user_model_save_dir, 'best_vggface_model.keras')
    full_model_save_path = os.path.join(user_model_save_dir, 'full_vggface_model.keras')

    # --- Class Names Definition ---
    class_names = ["not_user", user_id] 
    logger.info(f"Training with classes: {class_names}")

    # --- Data Sequence Creation ---
    try:
        train_sequence = FacesSequence(
            directory=train_data_root_path, 
            batch_size=batch_size,
            image_size=image_size,
            class_names=class_names,
            augment=True, 
            logger=logger
        )
        val_sequence = FacesSequence(
            directory=val_data_root_path,
            batch_size=batch_size,
            image_size=image_size,
            class_names=class_names,
            augment=False, 
            logger=logger
        )
    except Exception as e:
        logger.error(f"Failed to create FacesSequence for user {user_id}: {e}")
        return False, f"Data sequence creation failed: {e}"

    if len(train_sequence.samples) == 0:
        logger.error(f"No training samples found for user {user_id} or 'not_user' in {train_data_root_path}. Aborting training.")
        return False, "No training samples found."
    if len(val_sequence.samples) == 0 and initial_epochs > 0 : 
        logger.warning(f"No validation samples found for user {user_id} or 'not_user' in {val_data_root_path}. Validation-based callbacks might fail.")

    # --- Class Weights Calculation ---
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

    # --- Model Building ---
    try:
        training_model, vgg_base_model_ref = build_vggface_classifier(
            input_shape=(image_size[0], image_size[1], 3),
            l2_reg_factor=optimal_l2_reg,
            dropout_dense_rate=optimal_dropout_dense,
            logger=logger
        )
    except Exception as e:
        logger.error(f"Failed to build model for user {user_id}: {e}")
        return False, f"Model building failed: {e}"

    # --- Callback Definitions ---
    checkpoint = ModelCheckpoint(
        model_checkpoint_path, 
        monitor="val_accuracy",
        save_best_only=True,
        mode="max",
        verbose=1
    )
    early_stopping = EarlyStopping(
        monitor="val_loss",
        patience=5, 
        verbose=1,
        mode="min",
        restore_best_weights=True 
    )
    reduce_lr = ReduceLROnPlateau(
        monitor="val_loss",
        factor=0.2, 
        patience=5, 
        verbose=1,
        mode="min",
        min_delta=0.0001, 
        min_lr=1e-7 
    )
    
    callbacks_list = [checkpoint, early_stopping, reduce_lr]
    if len(val_sequence.samples) == 0: 
        logger.warning("No validation data; removing validation-dependent callbacks (ModelCheckpoint, EarlyStopping, ReduceLROnPlateau).")
        callbacks_list = []

    # --- Phase 1: Training Classifier Head ---
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

    # --- Phase 2: Fine-tuning Model ---
    logger.info(f"--- Phase 2: Fine-tuning model for user {user_id} ---")
    if vgg_base_model_ref:
        vgg_base_model_ref.trainable = True 
        logger.info(f"Unfroze VGGFace base model ({vgg_base_model_ref.name}) for fine-tuning.")
    else:
        logger.warning("VGGFace base model reference not available for fine-tuning.")

    training_model.compile(
        optimizer=optimizers.Adam(learning_rate=lr_finetune), 
        loss="binary_crossentropy",
        metrics=["accuracy"]
    )
    
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
            callbacks=callbacks_list, 
            class_weight=class_weights_dict,
            verbose=1
        )
    except Exception as e:
        logger.error(f"Error during fine-tuning phase for user {user_id}: {e}")
        return False, f"Fine-tuning phase failed: {e}"

    # --- Save Final Model ---
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
