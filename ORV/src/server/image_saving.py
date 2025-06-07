import os
from werkzeug.utils import secure_filename
from flask import current_app

def _allowed_file(filename):
    """Checks if the file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

def _save_individual_files(files, user_id, user_upload_folder):
    """Helper to save a list of files. (Content remains the same as your version)"""
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

def handle_image_upload(request_form, request_files):
    """
    Processes image upload request, saves files.
    Returns a dictionary:
    {
        "status_code": int,
        "response_payload": dict,  // Data for the JSON response
        "upload_successful": bool,
        "user_id": str (if successful),
        "user_image_folder_path": str (if successful, absolute path)
    }
    """
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
    
    saved_files_info, errors = _save_individual_files(files, user_id, user_upload_folder_abs)

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