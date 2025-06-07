import os

HOST = '0.0.0.0'
PORT = 3002
DEBUG = False

PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))

BASE_UPLOAD_FOLDER = os.path.join(PROJECT_ROOT, 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# AI Model related paths
DATA_DIR = os.path.join(PROJECT_ROOT, 'data')
MODELS_DIR = 'models' # Base directory for storing trained models

# AI training parameters (examples, adjust as per build_model.py)
AI_IMAGE_SIZE = (224, 224)
AI_BATCH_SIZE = 16
AI_INITIAL_EPOCHS = 2
AI_FINE_TUNE_EPOCHS = 2

# New additions from build_model.py
AI_LEARNING_RATE_INITIAL = 0.001
AI_LEARNING_RATE_FINETUNE = 0.00005
AI_OPTIMAL_DROPOUT_DENSE = 0.5
AI_OPTIMAL_L2_REG = 0.0005
AI_MODEL_INPUT_SIZE = (224, 224) # (height, width) - consistent with training

# AI Model and Verification Settings
AI_BEST_MODEL_FILENAME = 'best_vggface_model.keras' # Or 'full_vggface_model.keras'
AI_VERIFICATION_THRESHOLD = 0.6 # Example threshold, adjust as needed
AI_VGGFACE_PREPROCESS_VERSION = 1 # For keras_vggface.utils.preprocess_input

# Data splitting ratios
AI_TRAIN_RATIO = 0.8
AI_VALIDATION_RATIO = 0.15
# TEST_RATIO will be 1.0 - TRAIN_RATIO - VALIDATION_RATIO
