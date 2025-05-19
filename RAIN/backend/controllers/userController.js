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
            return res.json(users);  // Vrne seznam uporabnikov
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error when getting user.',
                error: err
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
                    message: 'No such user'
                });
            }

            return res.json(user);  // Vrne uporabnika
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error when getting user.',
                error: err
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
                return res.json(user);  // Vrne uporabnika
            } catch (err) {
                return res.status(500).json({message: 'Server error', error: err.message});
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
                createdAt: req.body.createdAt
            });

            const savedUser = await user.save();  // Čaka na shranjevanje uporabnika
            return res.status(201).json(savedUser);  // Vrne shranjenega uporabnika
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error when creating user',
                error: err
            });
        }
    },


    /**
     * userController.update()
     */
    updateUser: async function (req, res) {
        const id = req.params.id;

        try {
            const user = await UserModel.findOne({_id: id});  // Iskanje uporabnika

            if (!user) {
                return res.status(404).json({
                    message: 'No such user'
                });
            }

            // Posodabljanje uporabnikovih podatkov
            user.firstName = req.body.firstName || user.firstName;
            user.lastName = req.body.lastName || user.lastName;
            user.username = req.body.username || user.username;
            user.email = req.body.email || user.email;
            user.password = req.body.password || user.password;
            user.createdAt = req.body.createdAt || user.createdAt;

            const updatedUser = await user.save();  // Čaka na posodobitev uporabnika
            return res.json(updatedUser);  // Vrne posodobljenega uporabnika
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error when updating user.',
                error: err
            });
        }
    },


    /**
     * userController.remove()
     */
    removeUser: async function (req, res) {
        const id = req.params.id;

        try {
            const user = await UserModel.findByIdAndRemove(id);  // Brisanje uporabnika

            if (!user) {
                return res.status(404).json({
                    message: 'No such user'
                });
            }

            return res.status(204).json();  // Vračanje statusa 204 za uspešno brisanje
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                message: 'Error when deleting the user.',
                error: err
            });
        }
    },
    showRegisterForm: async function (req, res) {
        res.render('user/register');
    },
    showLoginForm: async function (req, res) {
        res.render('user/login');
    },

    loginSelf: async function (req, res, next) {

        try {
            if (req.session && req.session.userId) {
                return res.status(400).json({ message: 'You are already logged in.' });
            }

            const user = await UserModel.authenticate(req.body.username, req.body.password);

            req.session.userId = user._id;
            return res.json({ message: 'Login successful', user: user });
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
                return res.json({isAuthenticated: true, user: user});
            } catch (err) {
                return res.status(500).json({message: 'Server error', error: err.message});
            }
        } else {
            return res.json({isAuthenticated: false});
        }
    }
};
