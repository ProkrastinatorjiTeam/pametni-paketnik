var UserModel = require('../models/userModel.js');

/**
 * userController.js
 *
 * @description :: Server-side logic for managing users.
 */
module.exports = {

    /**
     * userController.list()
     */
    listUsers: async function (req, res) {
        try {
            const users = await UserModel.find();  // Iskanje vseh uporabnikov
            return res.status(200).json({ message: 'Users retrieved successfully', users: users });  // Vrne seznam uporabnikov
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error retrieving users',
                error: err.message
            });
        }
    },

    /**
     * userController.show()
     */
    getUserInfo: async function (req, res) {
        const id = req.params.id;

        try {
            const user = await UserModel.findOne({_id: id});  // Iskanje uporabnika po ID-ju

            if (!user) {
                return res.status(404).json({
                    message: 'User not found'
                });
            }

            return res.status(200).json({ message: 'User retrieved successfully', user: user });  // Vrne uporabnika
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error retrieving user',
                error: err.message
            });
        }
    },

    /**
     * userController.getSelfInfo()
     */
    getSelfInfo: async function (req, res) {
        if (req.session && req.session.userId) {
            try {
                const user = await UserModel.findById(req.session.userId);  // Iskanje uporabnika po ID-ju iz seje
                if (!user) {
                    return res.status(404).json({message: 'User not found'});
                }
                return res.status(200).json({ message: 'User profile retrieved successfully', user: user });  // Vrne uporabnika
            } catch (err) {
                return res.status(500).json({message: 'Error retrieving user profile', error: err.message});
            }
        }
        return res.status(401).json({message: 'Not authenticated'});
    },

    /**
     * userController.create()
     */
    /**
     * userController.create()
     */
    registerSelf: async function (req, res) {
        try {
            if (req.session && req.session.userId) {
                return res.status(400).json({ message: 'Before registering logout!' });
            }
            const user = new UserModel({
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                username: req.body.username,
                email: req.body.email,
                password: req.body.password,
            });

            const savedUser = await user.save();  // Čaka na shranjevanje uporabnika
            return res.status(201).json({ message: 'User registered successfully', user: savedUser });  // Vrne shranjenega uporabnika
        } catch (err) {
            console.error(err);
            if (err.code === 11000) {
                // Duplicate key error
                if (err.keyPattern && err.keyPattern.username) {
                    return res.status(400).json({ message: 'Username already exists' });
                } else if (err.keyPattern && err.keyPattern.email) {
                    return res.status(400).json({ message: 'Email already exists' });
                } else {
                    return res.status(400).json({ message: 'Duplicate key error' });
                }
            }
            return res.status(500).json({
                message: 'Error registering user',
                error: err.message
            });
        }
    },


    /**
     * userController.update()
     */
    updateUser: async function (req, res) {
        const id = req.params.id;

        try {
            const user = await UserModel.findOne({_id: id});

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Validate input data
            const updates = {};
            if (req.body.firstName) updates.firstName = req.body.firstName;
            if (req.body.lastName) updates.lastName = req.body.lastName;
            if (req.body.username) updates.username = req.body.username;
            if (req.body.email) updates.email = req.body.email;
            if (req.body.password) updates.password = req.body.password;

            // Update user data
            Object.assign(user, updates);

            const updatedUser = await user.save();
            return res.status(200).json({ message: 'User updated successfully', user: updatedUser });
        } catch (err) {
            console.error(err);
            if (err.name === 'ValidationError') {
                // Mongoose validation error
                const errors = Object.values(err.errors).map(el => el.message);
                return res.status(400).json({ message: 'Validation error', errors: errors });
            }
            return res.status(500).json({ message: 'Error updating user', error: err.message });
        }
    },


    /**
     * userController.remove()
     */
    removeUser: async function (req, res) {
        const id = req.params.id;

        try {
            const user = await UserModel.findByIdAndDelete(id);  // Brisanje uporabnika

            if (!user) {
                return res.status(404).json({
                    message: 'User not found'
                });
            }

            return res.status(200).json({ message: 'User deleted successfully' });  // Vračanje statusa 200 z sporočilom
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error deleting user',
                error: err.message
            });
        }
    },

    showRegisterForm: async function (req, res) {
        res.render('user/register');
        return res.status(200).json({ message: 'Register form retrieved successfully' });
    },
    showLoginForm: async function (req, res) {
        res.render('user/login');
        return res.status(200).json({ message: 'Login form retrieved successfully' });
    },

    loginSelf: async function (req, res, next) {

        try {
            if (req.session && req.session.userId) {
                return res.status(400).json({ message: 'You are already logged in.' });
            }

            const user = await UserModel.authenticate(req.body.username, req.body.password);

            req.session.userId = user._id;
            return res.status(200).json({ message: 'Login successful', user: user });
        } catch (err) {
            return res.status(401).json({ message: err.message });
        }
    },
    logoutSelf: async function (req, res, next) {
        try {
            if (req.session) {
                await new Promise((resolve, reject) => {
                    req.session.destroy((err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                return res.status(200).json({ message: 'Logout successful' });
            }
        } catch (err) {
            return next(err);
        }
    },
    checkAuth: async function (req, res) {
        if (req.session && req.session.userId) {
            try {
                const user = await UserModel.findById(req.session.userId);
                if (!user) {
                    return res.status(404).json({message: 'User not found'});
                }
                return res.status(200).json({isAuthenticated: true, user: user, message: 'User is authenticated' });
            } catch (err) {
                return res.status(500).json({message: 'Error checking authentication', error: err.message});
            }
        } else {
            return res.status(200).json({isAuthenticated: false, message: 'User is not authenticated' });
        }
    },
    /**
     * userController.updateSelf()
     */
    updateSelf: async function (req, res) {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const userId = req.session.userId;

        try {
            const user = await UserModel.findById(userId);

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Validate input data
            const updates = {};
             if (req.body.firstName) updates.firstName = req.body.firstName;
            if (req.body.lastName) updates.lastName = req.body.lastName;
            if (req.body.username) updates.username = req.body.username;
            if (req.body.email) updates.email = req.body.email;
            if (req.body.password) updates.password = req.body.password;

            // Update user data
            Object.assign(user, updates);

            const updatedUser = await user.save();
            return res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
        } catch (err) {
            console.error(err);
            if (err.name === 'ValidationError') {
                // Mongoose validation error
                const errors = Object.values(err.errors).map(el => el.message);
                return res.status(400).json({ message: 'Validation error', errors: errors });
            }
            return res.status(500).json({ message: 'Error updating profile', error: err.message });
        }
    },

    /**
     * userController.removeSelf()
     */
    removeSelf: async function (req, res) {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const userId = req.session.userId;

        try {
            const user = await UserModel.findByIdAndDelete(userId);

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            req.session.destroy((err) => {
                if (err) {
                    console.error("Error destroying session:", err);
                    return res.status(500).json({ message: 'Error destroying session after account deletion', error: err.message });
                }
                return res.status(200).json({ message: 'Account deleted successfully' });
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error deleting account', error: err.message });
        }
    }
};