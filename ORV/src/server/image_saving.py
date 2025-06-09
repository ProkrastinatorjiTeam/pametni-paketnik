import os
from werkzeug.utils import secure_filename
from flask import current_app

# --- Helper Function: File Extension Validation ---
def _allowed_file(filename):
    """Checks if the file extension is allowed based on app config."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

# --- Helper Function: Individual File Saving ---
def _save_individual_files(files, user_id, user_upload_folder):
    """Saves a list of uploaded files to the specified user folder,
    validating file types and generating secure filenames."""
    saved_files_info = []
    errors = []
    for file_index, file_storage in enumerate(files):
        if file_storage and file_storage.filename: 
            if _allowed_file(file_storage.filename):
                original_extension = os.path.splitext(file_storage.filename)[1]
                filename = secure_filename(f"frame_{file_index}{original_extension}")
                
                try:
                    file_path = os.path.join(user_upload_folder, filename)
                    file_storage.save(file_path) 
                    saved_files_info.append({"filename": filename, "path": file_path, "original_filename": file_storage.filename})
                except Exception as e:
                    errors.append({"original_filename": file_storage.filename, "error": str(e)})
            else:
                errors.append({"filename": file_storage.filename, "error": "File type not allowed"})
        elif file_storage and not file_storage.filename:
            pass
    return saved_files_info, errors

# --- Main Function: Image Upload Handling ---
def handle_image_upload(request_form, request_files):
    """
    Processes image upload request: validates input, creates directories, saves files.
    Returns a structured dictionary with status and payload.
    """
    # --- Input Validation: User ID and Files ---
    user_id = request_form.get('userId')
    if not user_id:
        return {
            "status_code": 400,
            "response_payload": {"error": "No userId part in the request"},
            "upload_successful": False
        }

    if 'images' not in request_files:
        return {
            "status_code": 400,
            "response_payload": {"error": "No images part in the request"},
            "upload_successful": False
        }

    files = request_files.getlist('images') 
    if not files or all(f.filename == '' for f in files): 
        return {
            "status_code": 400,
            "response_payload": {"error": "No selected files"},
            "upload_successful": False
        }
    
    # --- Directory Setup: Base and User-Specific Upload Folders ---
    base_upload_folder_abs = os.path.abspath(current_app.config['BASE_UPLOAD_FOLDER'])
    
    if not os.path.exists(base_upload_folder_abs):
        try:
            os.makedirs(base_upload_folder_abs)
        except OSError as e:
            current_app.logger.error(f"Could not create base upload directory {base_upload_folder_abs}: {e}")
            return {
                "status_code": 500,
                "response_payload": {"error": "Server error: Could not create base upload directory"},
                "upload_successful": False
            }

    user_upload_folder_abs = os.path.join(base_upload_folder_abs, secure_filename(str(user_id)))
    if not os.path.exists(user_upload_folder_abs):
        try:
            os.makedirs(user_upload_folder_abs)
        except OSError as e:
            current_app.logger.error(f"Could not create directory for user {user_id} at {user_upload_folder_abs}: {e}")
            return {
                "status_code": 500,
                "response_payload": {"error": f"Server error: Could not create directory for user {user_id}"},
                "upload_successful": False
            }
    
    # --- File Saving Logic ---
    saved_files_info, errors = _save_individual_files(files, user_id, user_upload_folder_abs)

    # --- Response Preparation ---
    upload_successful_flag = len(saved_files_info) > 0 

    if upload_successful_flag:
        if errors: 
            current_app.logger.warning(
                f"Image upload for user {user_id} had partial success: "
                f"{len(saved_files_info)} saved, {len(errors)} errors. Details: {errors}"
            )
        
        return {
            "status_code": 200,
            "response_payload": {"message": f"Images uploaded successfully for user {user_id}."},
            "upload_successful": True,
            "user_id": user_id,
            "user_image_folder_path": user_upload_folder_abs 
        }
    else: 
        current_app.logger.error(
            f"Image upload failed for user {user_id}. No files were saved. Errors: {errors}"
        )
        return {
            "status_code": 400, 
            "response_payload": {"error": "Image upload failed. No files were successfully saved."},
            "upload_successful": False,
            "user_id": user_id,
            "user_image_folder_path": None
        }