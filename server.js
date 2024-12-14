const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const db_access = require('./db.js');
const db = db_access.db;
const server = express();
const port = 8888;
const secret_key = 'PetVerseSecretKey2024';

server.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));
server.use(express.json());
server.use(cookieParser());

console.log('Checking database contents...');
db.all('SELECT * FROM user', [], (err, rows) => {
    if (err) {
        console.error('Error querying database:', err);
    } else {
        console.log('All users in database:', rows);
    }
});

const generateToken = (id) => {
    return jwt.sign({ id }, secret_key, { expiresIn: '2h' });
};

const verifyToken = (req, res, next) => {
    console.log('Cookies received:', req.cookies);
    const token = req.cookies.authToken;
    
    if (!token) {
        console.log('No auth token found in cookies');
        return res.status(401).json({
            success: false,
            message: 'Authentication required. Please log in.',
            code: 'AUTH_REQUIRED'
        });
    }
    
    jwt.verify(token, secret_key, (err, details) => {
        if (err) {
            console.error('Token verification failed:', err);
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Session expired. Please log in again.',
                    code: 'TOKEN_EXPIRED'
                });
            }
            return res.status(403).json({
                success: false,
                message: 'Invalid authentication token.',
                code: 'INVALID_TOKEN'
            });
        }
        
        // Check if user still exists
        db.get('SELECT id FROM user WHERE id = ?', [details.id], (err, user) => {
            if (err) {
                console.error('Database error during auth check:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Internal server error during authentication.',
                    code: 'AUTH_ERROR'
                });
            }
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User no longer exists.',
                    code: 'USER_NOT_FOUND'
                });
            }
            
            req.userDetails = details;
            next();
        });
    });
};

// Add check-auth endpoint
server.get('/user/check-auth', verifyToken, (req, res) => {
    const userId = req.userDetails.id;
    
    db.get('SELECT id, name, email FROM user WHERE id = ?', [userId], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ 
                success: false,
                message: 'Error checking authentication status'
            });
        }
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found'
            });
        }

        const newToken = generateToken(user.id);
        
        res.cookie('authToken', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 2 * 60 * 60 * 1000 // 2 hours
        });

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    });
});

//USERR
//registration
server.post('/user/register', (req, res) => {
    console.log('Registration request received:', { ...req.body, password: '***' });
    const name = req.body.name
    const email = req.body.email
    const password = req.body.password
    let age = req.body.age;
    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid email format'
        });
    }
    db.get('SELECT id FROM user WHERE email = ?', [email], (err, existingUser) => {
        if (err) {
            console.error('Database error during email check:', err);
            return res.status(500).json({
                success: false,
                message: 'Registration failed. Please try again.'
            });
        }

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Email already registered'
            });
        }

        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.error('Password hashing error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Registration failed. Please try again.'
                });
            }

            const insertQuery = `
                INSERT INTO user (name, email, password, age) 
                VALUES (?, ?, ?, ?)
            `;

            db.run(insertQuery, [name, email, hashedPassword, age], function(err) {
                if (err) {
                    console.error('User insertion error:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Registration failed. Please try again.'
                    });
                }

                db.get('SELECT * FROM user WHERE email = ?', [email], (err, user) => {
                    console.log('Newly registered user:', { ...user, password: '***' });
                });

                const token = generateToken(this.lastID);

                res.cookie('authToken', token, {
                    httpOnly: true,
                    sameSite: 'strict',
                    maxAge: 24 * 60 * 60 * 1000 // 1 day
                });

                return res.status(201).json({
                    success: true,
                    message: "Registration successful",
                    user: {
                        id: this.lastID,
                        name: name,
                        email: email
                    }
                });
            });
        });
    });
});

// Logout route
server.post('/user/logout', (req, res) => {
    res.clearCookie('authToken');
    res.status(200).send('Logged out successfully');
});

//login
server.post('/user/login', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required'
        });
    }

    const query = 'SELECT * FROM user WHERE email = ?';
    db.get(query, [email], (err, user) => {
        if (err) {
            console.error('Database error during login:', err);
            return res.status(500).json({
                success: false,
                message: 'Login failed. Please try again.'
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        bcrypt.compare(password, user.password, (err, match) => {
            if (err) {
                console.error('Password comparison error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Login failed. Please try again.'
                });
            }

            if (!match) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            const token = generateToken(user.id);
            
            res.cookie('authToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 2 * 60 * 60 * 1000 // 2 hours
            });

            res.json({
                success: true,
                message: 'Login successful',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            });
        });
    });
});

//user deleting account
server.delete('/user/account/delete/:id', verifyToken, (req, res) => {
    let userid= parseInt(req.params.id,10); 
    
    const query = `DELETE FROM user WHERE id = ?`;
    db.run(query, [userid], (err) => {
        if (err) {
            return res.status(500).send('Error deleting account');
        }
        else{
        res.status(200).send('Account deleted successfully');
        }
    });
});

//user editing account
server.put('/user/account/edit/:id', verifyToken, async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const { name, email, password } = req.body;

    // Verify user is editing their own profile
    if (userId !== req.userDetails.id) {
        return res.status(403).json({
            message: "You can only edit your own profile"
        });
    }

    try {
        // Start building the update query
        let updateFields = [];
        let params = [];
        
        if (name) {
            updateFields.push('name = ?');
            params.push(name);
        }
        
        if (email) {
            // Check if email is already taken by another user
            const existingUser = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM user WHERE email = ? AND id != ?', [email, userId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (existingUser) {
                return res.status(400).json({
                    message: "Email is already in use"
                });
            }

            updateFields.push('email = ?');
            params.push(email);
        }
        
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateFields.push('password = ?');
            params.push(hashedPassword);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                message: "No fields to update"
            });
        }

        // Add userId to params array
        params.push(userId);

        const updateQuery = `
            UPDATE user 
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `;

        db.run(updateQuery, params, function(err) {
            if (err) {
                console.error('Error updating profile:', err);
                return res.status(500).json({
                    message: "Failed to update profile"
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            res.status(200).json({
                message: "Profile updated successfully"
            });
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            message: "An error occurred while updating profile"
        });
    }
});

// Get all users
server.get('/users', verifyToken, (req, res) => {
    const getAllUsersQuery = `SELECT * FROM user`;

    db.all(getAllUsersQuery, [], (err, rows) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("An error occurred while retrieving users.");
        }

        if (rows.length === 0) {
            return res.status(404).send("No users found.");
        } else {
            return res.status(200).json(rows); 
        }
    });
});

//PETT
//creating pet profile
server.post('/user/pets/add', verifyToken, (req, res) => { 
    console.log('Creating pet profile with data:', req.body);
    console.log('User from token:', req.userDetails);

    let name = req.body.name;
    let age = req.body.age;
    let vaccinationdates = req.body.vaccinationdates || '';
    let healthnotes = req.body.healthnotes || '';
    let breed = req.body.breed;
    let userid = req.userDetails.id;

    if (!name || !age || !breed) {
        return res.status(400).json({
            success: false,
            message: "Name, age, and breed are required"
        });
    }

    const insertQuery = `
        INSERT INTO pet (name, age, breed, vaccinationdates, healthnotes, userid)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(insertQuery, [name, age, breed, vaccinationdates, healthnotes, userid], function(err) {
        if (err) {
            console.error("Error creating pet profile:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to create pet profile"
            });
        }

        res.status(201).json({
            success: true,
            message: "Pet profile created successfully",
            pet: {
                id: this.lastID,
                name,
                age,
                breed,
                vaccinationdates,
                healthnotes,
                userid
            }
        });
    });
});

//deleting pet profile
server.delete('/user/pets/delete/:id', verifyToken, (req, res) => {
    let petid= parseInt(req.params.id, 10);

    const query = `DELETE FROM pet WHERE id = ?`;
    db.run(query, [petid], (err) =>{
        if (err) {
            return res.status(500).send('Error deleting pet account');
        }
        res.status(200).send('Pet account deleted successfully');
    });
});

//user editing pets profile
server.put('/user/pets/edit/:id', verifyToken, (req, res) => {
    const petid  =parseInt(req.params.id,10);
    let name = req.body.name;
    let age = req.body.age;
    let vaccinationdates = req.body.vaccinationdates;
    let healthnotes = req.body.healthnotes;
    let breed= req.body.breed;

    if (!name && !breed && !age && !healthnotes && !vaccinationdates) {
        return res.status(400).send('At least one field required (Name, breed, age, vaccination dates, healthnotes)');
    }
    const updates=[];
    const values=[];
    if (name) {
        updates.push("name = ?");
        values.push(name);
    }
    if (breed) {
        updates.push("breed = ?");
        values.push(breed);
    }
    if (age) {
        updates.push("age = ?");
        values.push(age);
    }
    if (healthnotes) {
        updates.push("healthnotes = ?");
        values.push(healthnotes);
    }
    if (vaccinationdates) {
        updates.push("vaccinationdates = ?");
        values.push(vaccinationdates);
    }

    const query = `UPDATE pet SET ${updates.join(', ')} WHERE id = ?`;
    values.push(petid); 

    db.run(query, values, function (err) {
        if (err) {
            console.error(err);
            return res.status(500).send('Error updating account.',(err));
        }

        if (this.changes === 0) {
            return res.status(404).send('pet profile not found or no changes made.');
        }

        return res.status(200).send('Account updated successfully.');
    });
});

//get all pet profiles
server.get('/petprofiles', verifyToken, (req,res)=>{
    const getallpetsquery= `SELECT * FROM pet`;

    db.all(getallpetsquery, [], (err,rows)=>{
        if (err){
            console.log("Database error:", err);
            return res.status(500).send("An error occured while retrieving pet profiles.");
        }
        if(rows.length==0){
            return res.status(404).send("No pet profiles found");
        }
        else{
            res.status(200).json(rows);
        }
    });
});

//getting all vets
server.get('/vets', verifyToken, (req, res) => {
    const { type, location, rating, id } = req.query;
    let query = 'SELECT * FROM vets WHERE 1=1';
    const params = [];

    if (id) {
        query = 'SELECT * FROM vets WHERE id = ?';
        db.get(query, [id], (err, vet) => {
            if (err) {
                console.error("Error fetching vet:", err);
                return res.status(500).json({
                    success: false,
                    message: "Failed to fetch vet details"
                });
            }
            if (!vet) {
                return res.status(404).json({
                    success: false,
                    message: "Vet not found"
                });
            }
            res.json({
                success: true,
                vet: vet
            });
        });
        return;
    }

    if (type) {
        query += ' AND specialisation LIKE ?';
        params.push(`%${type}%`);
    }
    if (location) {
        query += ' AND location LIKE ?';
        params.push(`%${location}%`);
    }
    if (rating) {
        query += ' AND rating >= ?';
        params.push(rating);
    }

    db.all(query, params, (err, vets) => {
        if (err) {
            console.error("Error fetching vets:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch vets"
            });
        }
        res.json({
            success: true,
            vets: vets
        });
    });
});

// Get all shops or search shops
server.get('/shops', verifyToken, (req, res) => {
    const { name, location, rating } = req.query;
    let query = 'SELECT * FROM shop WHERE 1=1';
    const params = [];

    if (name) {
        query += ' AND name LIKE ?';
        params.push(`%${name}%`);
    }
    if (location) {
        query += ' AND location LIKE ?';
        params.push(`%${location}%`);
    }
    if (rating) {
        query += ' AND rating >= ?';
        params.push(rating);
    }

    db.all(query, params, (err, shops) => {
        if (err) {
            console.error("Error fetching shops:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch shops"
            });
        }
        res.json({
            success: true,
            shops: shops
        });
    });
});

// Get single shop
server.get('/shops/:id', verifyToken, (req, res) => {
    const shopId = parseInt(req.params.id, 10);
    
    db.get('SELECT * FROM shop WHERE id = ?', [shopId], (err, shop) => {
        if (err) {
            console.error("Error fetching shop:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch shop details"
            });
        }
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: "Shop not found"
            });
        }
        res.json({
            success: true,
            shop: shop
        });
    });
});

// Create new shop
server.post('/shops', verifyToken, (req, res) => {
    const { name, location, description, contact, rating } = req.body;
    const userid = req.userDetails.id;

    if (!name || !location || !contact) {
        return res.status(400).json({
            success: false,
            message: "Name, location, and contact are required"
        });
    }

    const query = `
        INSERT INTO shop (name, location, description, contact, rating, userid)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [name, location, description, contact, rating || 0, userid], function(err) {
        if (err) {
            console.error("Error creating shop:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to create shop"
            });
        }

        res.status(201).json({
            success: true,
            message: "Shop created successfully",
            shopId: this.lastID
        });
    });
});

// Update shop
server.put('/shops/:id', verifyToken, (req, res) => {
    const shopId = parseInt(req.params.id, 10);
    const { name, location, description, contact, rating } = req.body;
    const userId = req.userDetails.id;

    // Check if user owns this shop
    db.get('SELECT userid FROM shop WHERE id = ?', [shopId], (err, shop) => {
        if (err) {
            console.error("Error checking shop ownership:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to verify shop ownership"
            });
        }

        if (!shop) {
            return res.status(404).json({
                success: false,
                message: "Shop not found"
            });
        }

        if (shop.userid !== userId) {
            return res.status(403).json({
                success: false,
                message: "You don't have permission to update this shop"
            });
        }

        let updates = [];
        let params = [];
        
        if (name) {
            updates.push('name = ?');
            params.push(name);
        }
        if (location) {
            updates.push('location = ?');
            params.push(location);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            params.push(description);
        }
        if (contact) {
            updates.push('contact = ?');
            params.push(contact);
        }
        if (rating !== undefined) {
            updates.push('rating = ?');
            params.push(rating);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No fields to update"
            });
        }

        params.push(shopId);
        const query = `UPDATE shop SET ${updates.join(', ')} WHERE id = ?`;

        db.run(query, params, (err) => {
            if (err) {
                console.error("Error updating shop:", err);
                return res.status(500).json({
                    success: false,
                    message: "Failed to update shop"
                });
            }

            res.json({
                success: true,
                message: "Shop updated successfully"
            });
        });
    });
});

// Delete shop
server.delete('/shops/:id', verifyToken, (req, res) => {
    const shopId = parseInt(req.params.id, 10);
    const userId = req.userDetails.id;

    // Check if user owns this shop
    db.get('SELECT userid FROM shop WHERE id = ?', [shopId], (err, shop) => {
        if (err) {
            console.error("Error checking shop ownership:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to verify shop ownership"
            });
        }

        if (!shop) {
            return res.status(404).json({
                success: false,
                message: "Shop not found"
            });
        }

        if (shop.userid !== userId) {
            return res.status(403).json({
                success: false,
                message: "You don't have permission to delete this shop"
            });
        }

        const query = `DELETE FROM shop WHERE id = ?`;
        db.run(query, [shopId], (err) => {
            if (err) {
                console.error("Error deleting shop:", err);
                return res.status(500).json({
                    success: false,
                    message: "Failed to delete shop"
                });
            }

            res.json({
                success: true,
                message: "Shop deleted successfully"
            });
        });
    });
});

server.get('/shops/:shopid/products', verifyToken, (req, res) => {
    const shopid = parseInt(req.params.shopid, 10);
    const query = `SELECT * FROM products WHERE shopid = ?`;
    
    db.all(query, [shopid], (err, products) => {
        if (err) {
            console.error("Error fetching products for shop:", err);
            return res.status(500).json({
                success: false,
                message: 'Error fetching products'
            });
        }
        
        res.json({
            success: true,
            shopId: shopid,
            products: products
        });
    });
});

server.post('/shops/:shopid/products/add', verifyToken, (req, res) => {
    const shopid = parseInt(req.params.shopid, 10);
    let name= req.body.name;
    let description= req.body.description;
    let price= req.body.price;
    let quantity= req.body.quantity;
    let category= req.body.category;

    if (!name || !price || !quantity || !category) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }

    const query = `INSERT INTO products (name, description, price, quantity, category, shopid) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(query, [name, description, price, quantity, category, shopid], function(err) {
        if (err) {
            console.error("Error adding product:", err);
            return res.status(500).json({
                success: false,
                message: 'Error adding product'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Product added successfully',
            productId: this.lastID
        });
    });
});

server.put('/shops/:shopid/products/:productid', verifyToken, (req, res) => {
    const shopid = parseInt(req.params.shopid, 10);
    const productid = parseInt(req.params.productid, 10);
    const updates = [];
    const values = [];

    const fields = ['name', 'description', 'price', 'quantity', 'category'];
    for (const field of fields) {
        if (req.body[field]) {
            updates.push(`${field} = ?`);
            values.push(req.body[field]);
        }
    }

    if (updates.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No fields to update'
        });
    }

    values.push(productid, shopid);
    const query = `UPDATE products SET ${updates.join(', ')} WHERE id = ? AND shopid = ?`;

    db.run(query, values, (err) => {
        if (err) {
            console.error("Error updating product:", err);
            return res.status(500).json({
                success: false,
                message: 'Error updating product'
            });
        }

        res.json({
            success: true,
            message: 'Product updated successfully'
        });
    });
});

server.delete('/shops/:shopid/products/:productid', verifyToken, (req, res) => {
    const shopid = parseInt(req.params.shopid, 10);
    const productid = parseInt(req.params.productid, 10);

    const query = `DELETE FROM products WHERE id = ? AND shopid = ?`;
    db.run(query, [productid, shopid], (err) => {
        if (err) {
            console.error("Error deleting product:", err);
            return res.status(500).json({
                success: false,
                message: 'Error deleting product'
            });
        }

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    });
});

// Feedback endpoints
server.post('/vets/:vetid/feedback', verifyToken, (req, res) => {
    const vetId = parseInt(req.params.vetid, 10);
    const userId = req.userDetails.id;
    const { rating, comment } = req.body;

    // Validate input
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
        return res.status(400).json({
            success: false,
            message: 'Rating is required and must be between 1 and 5'
        });
    }

    // First check if the vet exists
    const checkVetQuery = 'SELECT id FROM vets WHERE id = ?';
    db.get(checkVetQuery, [vetId], (err, vet) => {
        if (err) {
            console.error("Error checking vet:", err);
            return res.status(500).json({
                success: false,
                message: 'Error submitting feedback'
            });
        }

        if (!vet) {
            return res.status(404).json({
                success: false,
                message: 'Vet not found'
            });
        }

        // Check if user has already submitted feedback for this vet
        const checkExistingQuery = 'SELECT id FROM feedback WHERE user_id = ? AND vet_id = ?';
        db.get(checkExistingQuery, [userId, vetId], (err, existing) => {
            if (err) {
                console.error("Error checking existing feedback:", err);
                return res.status(500).json({
                    success: false,
                    message: 'Error submitting feedback'
                });
            }

            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'You have already submitted feedback for this vet'
                });
            }

            // Insert the feedback
            const insertQuery = `
                INSERT INTO feedback (user_id, vet_id, rating, comment)
                VALUES (?, ?, ?, ?)
            `;
            db.run(insertQuery, [userId, vetId, rating, comment || null], function(err) {
                if (err) {
                    console.error("Error inserting feedback:", err);
                    return res.status(500).json({
                        success: false,
                        message: 'Error submitting feedback'
                    });
                }

                // Update vet's average rating
                const updateRatingQuery = `
                    UPDATE vets 
                    SET rating = (
                        SELECT AVG(rating) 
                        FROM feedback 
                        WHERE vet_id = ?
                    )
                    WHERE id = ?
                `;
                db.run(updateRatingQuery, [vetId, vetId], (err) => {
                    if (err) {
                        console.error("Error updating vet rating:", err);
                    }
                });

                res.status(201).json({
                    success: true,
                    message: 'Feedback submitted successfully',
                    feedbackId: this.lastID
                });
            });
        });
    });
});

// Get all feedback for a vet
server.get('/vets/:vetid/feedback', verifyToken, (req, res) => {
    const vetId = parseInt(req.params.vetid, 10);

    const query = `
        SELECT f.*, u.name as user_name
        FROM feedback f
        JOIN user u ON f.user_id = u.id
        WHERE f.vet_id = ?
        ORDER BY f.id DESC
    `;

    db.all(query, [vetId], (err, feedback) => {
        if (err) {
            console.error("Error fetching feedback:", err);
            return res.status(500).json({
                success: false,
                message: 'Error fetching feedback'
            });
        }

        res.json({
            success: true,
            feedback: feedback
        });
    });
});

// Get available slots for a vet
server.get('/vets/:vetid/available-slots', verifyToken, (req, res) => {
    const vetId = parseInt(req.params.vetid, 10);
    const { date } = req.query;

    if (!date) {
        return res.status(400).json({
            success: false,
            message: 'Date parameter is required'
        });
    }

    const selectedDate = new Date(date);
    if (isNaN(selectedDate.getTime())) {
        return res.status(400).json({
            success: false,
            message: 'Invalid date format'
        });
    }

    const checkVetQuery = 'SELECT id FROM vets WHERE id = ?';
    db.get(checkVetQuery, [vetId], (err, vet) => {
        if (err) {
            console.error("Error checking vet:", err);
            return res.status(500).json({
                success: false,
                message: 'Error fetching available slots'
            });
        }

        if (!vet) {
            return res.status(404).json({
                success: false,
                message: 'Vet not found'
            });
        }

        const getBookedSlotsQuery = `
            SELECT appointmenttime as time 
            FROM appointments 
            WHERE vetid = ? 
            AND date(appointmentdate) = date(?)
        `;

        db.all(getBookedSlotsQuery, [vetId, date], (err, bookedSlots) => {
            if (err) {
                console.error("Error fetching booked slots:", err);
                return res.status(500).json({
                    success: false,
                    message: 'Error fetching available slots'
                });
            }

            const workingHours = {
                start: '09:00',
                end: '17:00',
                slotDuration: 30 // in minutes
            };

            const slots = [];
            const startTime = new Date(`${date}T${workingHours.start}`);
            const endTime = new Date(`${date}T${workingHours.end}`);
            const slotDuration = workingHours.slotDuration * 60 * 1000; // convert to milliseconds

            for (let time = startTime; time < endTime; time = new Date(time.getTime() + slotDuration)) {
                const timeString = time.toTimeString().slice(0, 5);
                const isBooked = bookedSlots.some(slot => slot.time === timeString);
                
                if (!isBooked) {
                    slots.push(timeString);
                }
            }

            res.json({
                success: true,
                vetId: vetId,
                date: date,
                availableSlots: slots
            });
        });
    });
});

//dashboard
server.get('/user/dashboard/:userid', verifyToken, (req, res) => {
    const userId = parseInt(req.params.userid, 10);

    if (!userId) {
        return res.status(400).send("User ID is required." );
    }

    const petProfilesQuery = `SELECT * FROM pet WHERE userid = ?`;
    const appointmentsQuery = `SELECT * FROM appointments WHERE userid = ? ORDER BY appointmentdate ASC, appointmenttime ASC`;

    db.all(petProfilesQuery, [userId], (err, petProfiles) => {
        if (err) {
            console.error("Error fetching pet profiles:", err.message);
            return res.status(500).send("Error fetching pet profiles." );
        }

        db.all(appointmentsQuery, [userId], (err, appointments) => {
            if (err) {
                console.error("Error fetching appointments:", err.message);
                return res.status(500).send("Error fetching appointments." );
            }
            return res.status(200).json({
                message: "User Dashboard",
                userId,
                petProfiles,
                appointments
            });
        });
    });
});

//starting server  
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
