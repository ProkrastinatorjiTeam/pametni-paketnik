import os

HOST = '0.0.0.0'
PORT = 3002
DEBUG = True

PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))

BASE_UPLOAD_FOLDER = os.path.join(PROJECT_ROOT, 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# AI Model related paths
DATA_DIR = os.path.join(PROJECT_ROOT, 'data')
MODELS_DIR = os.path.join(PROJECT_ROOT, 'models')

# AI training parameters (examples, adjust as per build_model.py)
AI_IMAGE_SIZE = (224, 224)
AI_BATCH_SIZE = 16
AI_INITIAL_EPOCHS = 20
AI_FINE_TUNE_EPOCHS = 20
