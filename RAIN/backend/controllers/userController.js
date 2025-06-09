var UserModel = require('../models/userModel.js');
var BoxModel = require('../models/boxModel.js');
var UnlockEventModel = require('../models/unlockEventModel.js');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'tvoj_jwt_secret';

module.exports = {

    // List all users (admin only)
    listUsers: async function (req, res) {
        try {
            // Fetch all users from the database
            const users = await UserModel.find();

            // Respond with the list of users
            return res.status(200).json({message: 'Users retrieved successfully', users: users});

            // Handle errors
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error retrieving users',
                error: err.message
            });
        }
    },


    // Get logged-in user's profile information
    showSelf: async function (req, res) {
        // Check if the user is authenticated
        if (req.session && req.session.userId) {
            try {
                // Retrieve the user from the database
                const user = await UserModel.findById(req.session.userId);

                // Handle case where user is not found
                if (!user) {
                    return res.status(404).json({message: 'User not found'});
                }

                // Respond with the user's profile information
                return res.status(200).json({message: 'User profile retrieved successfully', user: user});

                // Handle errors
            } catch (err) {
                return res.status(500).json({message: 'Error retrieving user profile', error: err.message});
            }
        }
        return res.status(401).json({message: 'Not authenticated'});
    },


    // Get a specific user's profile information (admin only)
    showUser: async function (req, res) {
        const id = req.params.id;

        try {
            // Retrieve the user from the database
            const user = await UserModel.findOne({_id: id});

            // Handle case where user is not found
            if (!user) {
                return res.status(404).json({
                    message: 'User not found'
                });
            }

            // Respond with the user's profile information
            return res.status(200).json({message: 'User retrieved successfully', user: user});

            // Handle errors
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error retrieving user',
                error: err.message
            });
        }
    },


    // Get logged-in user's unlock history
    showSelfUnlockHistory: async function (req, res) {
        // Check if the user is authenticated
        if (!req.session || !req.session.userId) {
            return res.status(401).json({message: 'Not authenticated'});
        }

        const userId = req.session.userId;

        try {
            // Retrieve the unlock events for the user from the database
            const unlockEvents = await UnlockEventModel.find({user: userId});

            // Respond with the list of unlock events
            return res.status(200).json({message: 'Unlock history retrieved successfully', unlockEvents: unlockEvents});

            // Handle errors
        } catch (err) {
            console.error(err);
            return res.status(500).json({message: 'Error retrieving unlock history', error: err.message});
        }
    },

    // Get a specific user's unlock history (admin only)
    showUserUnlockHistory: async function (req, res) {
        const id = req.params.id;

        try {
            // Retrieve the unlock events for the user from the database
            const unlockEvents = await UnlockEventModel.find({user: id})
                                                .populate('box', 'name physicalId') // Populate box name and physicalId
                                                .sort({ timestamp: -1 }); // Optional: sort by most recent

            // It's better to check if the array is empty rather than if unlockEvents itself is falsy
            if (!unlockEvents || unlockEvents.length === 0) {
                return res.status(200).json({message: 'No unlock events found for this user', unlockEvents: []});
            }

            // Respond with the list of unlock events
            return res.status(200).json({
                message: 'User unlock history retrieved successfully',
                unlockEvents: unlockEvents
            });

            // Handle errors
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error retrieving user unlock history',
                error: err.message
            });
        }
    },


    // Get boxes authorized for the logged-in user
    showSelfAuthorizedBoxes: async function (req, res) {
        // Check if the user is authenticated
        if (!req.session || !req.session.userId) {
            return res.status(401).json({message: 'Not authenticated'});
        }

        const userId = req.session.userId;

        try {
            // Find boxes where the authorizedUsers array contains the userId
            const boxes = await BoxModel.find({authorizedUsers: userId});

            // Respond with the list of authorized boxes
            return res.status(200).json({message: 'Authorized boxes retrieved successfully', boxes: boxes});

        } catch (err) {
            console.error(err);
            return res.status(500).json({message: 'Error retrieving authorized boxes', error: err.message});
        }
    },


    // Get boxes authorized for a specific user (admin only)
    showUserAuthorizedBoxes: async function (req, res) {
        const userId = req.params.id;

        try {
            // Find boxes where the authorizedUsers array contains the userId
            const boxes = await BoxModel.find({authorizedUsers: userId});

            // Respond with the list of authorized boxes
            return res.status(200).json({message: 'User authorized boxes retrieved successfully', boxes: boxes});

        } catch (err) {
            console.error(err);
            return res.status(500).json({message: 'Error retrieving user authorized boxes', error: err.message});
        }
    },

    // Register a new user
    registerSelf: async function (req, res) {
        try {
            // Prevent logged-in users from registering again
            if (req.session && req.session.userId) {
                return res.status(400).json({message: 'Before registering logout!'});
            }

            // Create a new user instance
            const user = new UserModel({
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                username: req.body.username,
                email: req.body.email,
                password: req.body.password,
            });

            // Save the new user to the database
            const savedUser = await user.save();

            // Respond with success message
            return res.status(201).json({message: 'User registered successfully', user: savedUser});

            // Handle errors
        } catch (err) {
            console.error(err);
            if (err.code === 11000) {
                if (err.keyPattern && err.keyPattern.username) {
                    return res.status(400).json({message: 'Username already exists'});
                } else if (err.keyPattern && err.keyPattern.email) {
                    return res.status(400).json({message: 'Email already exists'});
                } else {
                    return res.status(400).json({message: 'Duplicate key error'});
                }
            }
            return res.status(500).json({
                message: 'Error registering user',
                error: err.message
            });
        }
    },


    // Log in an existing user
    loginSelf: async function (req, res) {
        try {
            if (req.session && req.session.userId) {
                return res.status(400).json({message: 'You are already logged in.'});
            }

            const user = await UserModel.authenticate(req.body.username, req.body.password);

            req.session.userId = user._id;

            const token = jwt.sign({userId: user._id}, JWT_SECRET, {expiresIn: '1h'});

            return res.status(200).json({
                message: 'Login successful',
                user: user,
                token: token
            });

        } catch (err) {
            return res.status(401).json({message: err.message});
        }
    },


    // Log out the current user
    logoutSelf: async function (req, res, next) {
        try {
            const authHeader = req.headers['authorization'];

            // Če obstaja sejna seja (web user)
            if (req.session) {
                await new Promise((resolve, reject) => {
                    req.session.destroy((err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }

            // Če je mobilna aplikacija (JWT), preverimo če je Authorization header sploh bil
            if (authHeader && authHeader.startsWith('Bearer ')) {
                return res.status(200).json({message: 'Logout successful (JWT)'});
            }

            return res.status(200).json({message: 'Logout successful (session or unknown)'});

        } catch (err) {
            return next(err);
        }
    },


    // Update the logged-in user's profile information
    updateSelf: async function (req, res) {
        // Check if the user is authenticated
        if (!req.session || !req.session.userId) {
            return res.status(401).json({message: 'Not authenticated'});
        }

        const userId = req.session.userId;

        try {
            // Retrieve the user from the database
            const user = await UserModel.findById(userId);

            // Handle case where user is not found
            if (!user) {
                return res.status(404).json({message: 'User not found'});
            }

            // Define the allowed updates
            const updates = {};
            if (req.body.firstName) updates.firstName = req.body.firstName;
            if (req.body.lastName) updates.lastName = req.body.lastName;
            if (req.body.username) updates.username = req.body.username;

            // Apply the updates to the user object
            Object.assign(user, updates);

            // Save the updated user to the database
            const updatedUser = await user.save();

            // Respond with success message
            return res.status(200).json({message: 'Profile updated successfully', user: updatedUser});

            // Handle errors
        } catch (err) {
            console.error(err);
            if (err.name === 'ValidationError') {
                const errors = Object.values(err.errors).map(el => el.message);
                return res.status(400).json({message: 'Validation error', errors: errors});
            }
            return res.status(500).json({message: 'Error updating profile', error: err.message});
        }
    },


    // Update a specific user's profile information (admin only)
    updateUser: async function (req, res) {
        const id = req.params.id;

        try {
            // Retrieve the user from the database
            const user = await UserModel.findOne({_id: id});

            // Handle case where user is not found
            if (!user) {
                return res.status(404).json({message: 'User not found'});
            }

            // Define the allowed updates
            const updates = {};
            if (req.body.firstName) updates.firstName = req.body.firstName;
            if (req.body.lastName) updates.lastName = req.body.lastName;
            if (req.body.username) updates.username = req.body.username;
            if (req.body.email) updates.email = req.body.email;

            // Apply the updates to the user object
            Object.assign(user, updates);

            // Save the updated user to the database
            const updatedUser = await user.save();

            // Respond with success message
            return res.status(200).json({message: 'User updated successfully', user: updatedUser});

            // Handle errors
        } catch (err) {
            console.error(err);
            if (err.name === 'ValidationError') {
                const errors = Object.values(err.errors).map(el => el.message);
                return res.status(400).json({message: 'Validation error', errors: errors});
            }
            return res.status(500).json({message: 'Error updating user', error: err.message});
        }
    },


    // Change the logged-in user's password
    changePassword: async function (req, res) {
        // Check if the user is authenticated
        if (!req.session || !req.session.userId) {
            return res.status(401).json({message: 'Not authenticated'});
        }

        const userId = req.session.userId;
        const {currentPassword, newPassword} = req.body;

        try {
            // Retrieve the user from the database
            const user = await UserModel.findById(userId);

            // Handle case where user is not found
            if (!user) {
                return res.status(404).json({message: 'User not found'});
            }

            // Authenticate with current password
            const authenticatedUser = await UserModel.authenticate(user.username, currentPassword);

            // Handle invalid current password
            if (!authenticatedUser) {
                return res.status(401).json({message: 'Invalid current password'});
            }

            // Set new password and save
            user.password = newPassword;
            await user.save();

            // Respond with success message
            return res.status(200).json({message: 'Password changed successfully'});

            // Handle errors
        } catch (err) {
            console.error(err);
            return res.status(500).json({message: 'Error changing password', error: err.message});
        }
    },


    // Remove the logged-in user's account
    removeSelf: async function (req, res) {
        // Check if the user is authenticated
        if (!req.session || !req.session.userId) {
            return res.status(401).json({message: 'Not authenticated'});
        }

        const userId = req.session.userId;
        const {password} = req.body;

        try {
            // Retrieve the user from the database
            const user = await UserModel.findById(userId);

            // Handle case where user is not found
            if (!user) {
                return res.status(404).json({message: 'User not found'});
            }

            // Authenticate with provided password
            const authenticatedUser = await UserModel.authenticate(user.username, password);

            // Handle invalid password
            if (!authenticatedUser) {
                return res.status(401).json({message: 'Invalid password'});
            }

            // Delete the user
            await UserModel.findByIdAndDelete(userId);

            // Destroy the session
            req.session.destroy((err) => {
                if (err) {
                    console.error("Error destroying session:", err);
                    return res.status(500).json({
                        message: 'Error destroying session after account deletion',
                        error: err.message
                    });
                }
                return res.status(200).json({message: 'Account deleted successfully'});
            });

            // Handle errors
        } catch (err) {
            console.error(err);
            return res.status(500).json({message: 'Error deleting account', error: err.message});
        }
    },


    // Remove a specific user's account (admin only)
    removeUser: async function (req, res) {
        const id = req.params.id;

        try {
            // Retrieve the user from the database
            const user = await UserModel.findByIdAndDelete(id);

            // Handle case where user is not found
            if (!user) {
                return res.status(404).json({
                    message: 'User not found'
                });
            }

            // Respond with success message
            return res.status(200).json({message: 'User deleted successfully'});

            // Handle errors
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error deleting user',
                error: err.message
            });
        }
    },
};