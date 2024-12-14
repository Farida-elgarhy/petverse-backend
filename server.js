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
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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

const generateToken = (id, isAdmin) => {
    return jwt.sign({ id, isAdmin }, secret_key, { expiresIn: '2h' });
};

const verifyToken = (req, res, next) => {
    console.log('Cookies received:', req.cookies);
    const token = req.cookies.authToken;
    if (!token) {
        console.log('No auth token found in cookies');
        return res.status(401).send('Unauthorized');
    }
    
    console.log('Verifying token:', token);
    jwt.verify(token, secret_key, (err, details) => {
        if (err) {
            console.error('Token verification failed:', err);
            return res.status(403).send('Invalid or expired token');
        }
        console.log('Token verified successfully. User details:', details);
        req.userDetails = details;
        next();
    });
};

// Add this near the top of your routes
server.get('/test', (req, res) => {
    console.log('Test endpoint hit');
    res.json({ message: 'Server is running!' });
});

// Add check-auth endpoint
server.get('/user/check-auth', verifyToken, (req, res) => {
    // If we get here, the token is valid
    const userId = req.userDetails.id;
    
    // Get user data from database
    db.get('SELECT id, name, email, isadmin FROM user WHERE id = ?', [userId], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ 
                isAuthenticated: false,
                message: 'Error checking authentication status'
            });
        }
        
        if (!user) {
            return res.status(404).json({ 
                isAuthenticated: false,
                message: 'User not found'
            });
        }

        const newToken = generateToken(user.id, user.isadmin);
        
        res.cookie('authToken', newToken, {
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        res.json({
            isAuthenticated: true,
            id: user.id,
            name: user.name,
            email: user.email,
            isAdmin: user.isadmin === 1
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
                INSERT INTO user (name, email, password, age, isadmin) 
                VALUES (?, ?, ?, ?, 0)
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

                const token = generateToken(this.lastID, 0);

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
                        email: email,
                        isAdmin: false
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
            message: "Email and password are required"
        });
    }

    const query = 'SELECT * FROM user WHERE email = ?';
    db.get(query, [email], (err, user) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({
                success: false,
                message: "An error occurred. Please try again."
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error("Error comparing passwords:", err);
                return res.status(500).json({
                    success: false,
                    message: "An error occurred during login"
                });
            }

            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid email or password"
                });
            }

            const token = generateToken(user.id, user.isadmin === 1);

            res.cookie('authToken', token, {
                httpOnly: true,
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000 // 1 day
            });

            res.json({
                success: true,
                id: user.id,
                name: user.name,
                email: user.email,
                isAdmin: user.isadmin === 1
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
    let type= req.query.type;
    let location= req.query.location;
    let rating= req.query.rating;

    const query = 'SELECT * FROM vets';
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error("Error fetching vets:", err);
            return res.status(500).json({
                success: false,
                message: 'Error fetching vets'
            });
        }
        res.json({
            success: true,
            vets: rows
        });
    });
});

//vets search
server.get('/vets/search', verifyToken, (req, res) => {
    let name = req.query.name;
    let specialisation = req.query.specialisation;
    let rating = req.query.rating;
    let location = req.query.location;

    if (!specialisation && !location && !rating && !name) {
        return res.status(400).send("Choose at least one filter");
    }

    let searchquery = 'SELECT * FROM vets WHERE 1=1';
    let params = [];

    if (specialisation) {
        searchquery += ` AND specialisation LIKE ?`;
        params.push(`%${specialisation}%`);
    }
    if (name) {
        searchquery += ` AND name LIKE ?`;
        params.push(`%${name}%`);
    }
    if (location) {
        searchquery += ` AND location LIKE ?`;
        params.push(`%${location}%`);
    }

    if (rating) {
        searchquery += ` AND rating >= ?`;
        params.push(rating);    }

    console.log("Search Results: ", searchquery);
    console.log("Query Parameters: ", params);
    db.all(searchquery, params, (err, rows) => {

        if (err) {
            console.error("Error fetching vets:", err.message);
            return res.status(500).send("Failed to fetch vets.");
        }
        return res.status(200).json(rows);
    });
});

server.get('/vets/search/:vetid', verifyToken, (req, res) => {
    const servicesquery = `SELECT * FROM vets WHERE id=?`
    db.get(servicesquery,[req.params.vetid], (err, row) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Error fetching vet details');
        }
        if (!row) {
            return res.status(404).send(`vet not found`);
        }
        return res.status(200).json(row);
    });
});

server.put('/vet/update/:vetid', verifyToken, (req, res) => {
    const vetid = parseInt(req.params.vetid, 10);
    let name = req.body.name;
    let specialisation = req.body.specialisation;
    let location = req.body.location;
    let email = req.body.email;
    let phonenumber = req.body.phonenumber;
    let rating = req.body.rating;
    let contact = req.body.contact;

    if (!name && !specialisation && !location && !email && !phonenumber && !rating && !contact) {
        return res.status(400).send('At least one field required (name, specialisation, location, email, phonenumber, rating, contact)');
    }

    const updates = [];
    const values = [];

    if (name) {
        updates.push("name = ?");
        values.push(name);
    }
    if (specialisation) {
        updates.push("specialisation = ?");
        values.push(specialisation);
    }
    if (location) {
        updates.push("location = ?");
        values.push(location);
    }
    if (email) {
        updates.push("email = ?");
        values.push(email);
    }
    if (phonenumber) {
        updates.push("phonenumber = ?");
        values.push(phonenumber);
    }
    if (rating) {
        updates.push("rating = ?");
        values.push(rating);
    }
    if (contact) {
        updates.push("contact = ?");
        values.push(contact);
    }

    const query = `UPDATE vets SET ${updates.join(', ')} WHERE id = ?`;
    values.push(vetid);

    db.run(query, values, (err) => {
        if (err) {
            return res.status(500).send('Error updating vet data');
        }
        res.status(200).send('Vet data updated successfully');
    });
});

//admin deleting a service using its id
server.delete('/vet/delete/:vetid', verifyToken, (req, res) => {
    const vetid = parseInt(req.params.vetid, 10);
    const query = `DELETE FROM vets WHERE id = ?`;

    db.run(query, [vetid], (err) => {
        if (err) {
            return res.status(500).send('Error deleting vet data');
        }
        res.status(200).send('Vet deleted successfully');
    });
});

//adding service
server.post('/vet/add', verifyToken, (req, res) => {
    let name = req.body.name;
    let specialisation = req.body.specialisation;
    let location = req.body.location;
    let email = req.body.email;
    let phonenumber = req.body.phonenumber;
    let rating = req.body.rating;
    let contact = req.body.contact;

    if (!name || !specialisation || !location || !email || !phonenumber || !rating || !contact) {
        return res.status(400).json({
            error: 'All fields are required: name, specialisation, location, email, phonenumber, rating, and contact'
        });
    }

    if (rating < 0 || rating > 5) {
        return res.status(400).json({
            error: 'Rating must be between 0 and 5'
        });
    }

    const query = `INSERT INTO vets (name, specialisation, email, location, phonenumber, rating, contact) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.run(query, [name, specialisation, email, location, phonenumber, rating, contact], (err) => {
        if (err) {
            return res.status(500).send('Error adding new vet');
        }
        res.status(201).send('vet added successfully');
    });
});

//service feedback
server.post('/vets/:vetid/feedback', verifyToken, (req, res) => {
    const vetid = parseInt(req.params.vetid, 10);
    const email = req.body.email;
    const rating = req.body.rating;
    const comment = req.body.comment;

    if (!vetid ||!rating) {
        return res.status(400).send('Rating and vet id is required');
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).send('Rating must be a whole number between 1 and 5')
    }

    const checkVetQuery = `SELECT id FROM vets WHERE id = ?`;
    db.get(checkVetQuery, [vetid], (err, vet) => {
        if (err) {
            console.error("Error checking vet:", err);
            return res.status(500).send("Database error" );
        }

        if (!vet) {
            return res.status(404).send("Vet not found");
        }

            const insertFeedbackQuery = `
            INSERT INTO feedback (user_id, vet_id, rating, comment)
                VALUES (?, ?, ?, ?)
            `;
        db.run(insertFeedbackQuery, [ vetid, rating, comment],(err)=> {
                if (err) {
                    console.error("Error adding feedback:", err);
                    return res.status(500).send('Error adding feedback.');
                }

                return res.status(201).send(`Feedback added successfully`);
            });

    });
});

// user feedback for the website
server.post('/user/feedback', verifyToken, (req, res) => {
    let rating = req.body.rating;
    let comment = req.body.comment;
    let vetid = req.body.vetid;  
    const userid = req.userDetails.id;  

    if (!rating) {
        return res.status(400).json({
            message: "Rating is required."
        });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({
            message: "Rating must be a whole number between 1 and 5"
        });
    }

    const feedbackQuery = `INSERT INTO feedback (rating, comment, userid, vetid) VALUES (?, ?, ?, ?)`;
    db.run(feedbackQuery, [rating, comment, userid, vetid], function(err) {
        if (err) {
            console.error('Error submitting feedback:', err);
            return res.status(500).json({
                message: "Error submitting feedback"
            });
        }

        res.status(201).json({
            message: "Feedback submitted successfully",
            feedbackId: this.lastID
        });
    });
});

//admin getting all the feedbacks
server.get(`/admin/feedback`, verifyToken, (req, res) => {
    const feedbackquery = `SELECT * FROM feedback`
    db.all(feedbackquery, [], (err, rows) => {
        if (err) {
            console.error('Error fetching feedback:', err.message);
            return res.status(500).send( "Error fetching feedback data. Please try again later.");
        }
        else
            return res.json(rows)
    });
});

//APPOINTMENTS  
//displaying all the appointments
server.post('/vets/:vetid/bookingappointments', verifyToken, (req, res) => {
    let vetid = parseInt(req.params.vetid, 10);
    let userid= req.body.userid
    let bookingslot  = req.body.bookingslot;

    if (!userid || !bookingslot) {
        return res.status(400).send("User ID and selected slot are required.");
    }

    const fetch_slots_query = `SELECT availableslots FROM vets WHERE id = ?`;
    db.get(fetch_slots_query, [vetid],(err, row) => {
        if (err) {
            console.error("Error fetching available slots:", err.message);
            return res.status(500).send("Failed to fetch available slots.");
        }

        if (!row || !row.availableslots) {
            return res.status(404).send("No available booking slots for this vet.");
        }

        const available_slots = row.availableslots.split(',');
        const updated_slots_array = available_slots.filter(slot => slot !== bookingslot);

        if (updated_slots_array.length === available_slots.length) {
            return res.status(400).json({ message: "Selected slot is not available." });
        }

        const updated_slots = updated_slots_array.join(',');

        const update_slots_query = `UPDATE vets SET availableslots = ? WHERE id = ?`;
        db.run(update_slots_query, [updated_slots, vetid], (err) => {
            if (err) {
                console.error("Error updating slots:", err.message);
                return res.status(500).json({ message: "Failed to update available slots." });
            }

            const [appointment_date, appointment_time] = bookingslot.split(' '); 
            const insert_appointment_query = `
                INSERT INTO appointments (userid, vetid, appointmentdate, appointmenttime)
                VALUES (?,?,?,?)
            `;

            db.run(insert_appointment_query,[userid,vetid,appointment_date,appointment_time], function (err) {
                if (err) {
                    console.error("Error booking appointment:", err.message);
                    return res.status(500).json({ message: "Failed to confirm booking." });
                }
                return res.status(201).json({
                    message: "Booking confirmed!",
                    appointment_date,
                    appointment_time
                });
            });
        });
    });
});

// Get user appointments
server.get('/user/appointments', verifyToken, (req, res) => {
    const userId = req.userDetails.id;
    console.log('Fetching appointments for user:', userId);

    const query = `
        SELECT 
            a.id,
            a.appointmentdate,
            a.slot as bookingslot,
            a.status,
            v.name as vetName,
            v.specialisation as vetSpecialisation,
            v.location as vetLocation,
            v.contact as vetContact,
            v.email as vetEmail,
            v.phonenumber as vetPhone
        FROM appointments a
        JOIN vets v ON a.vetid = v.id
        WHERE a.userid = ?
        ORDER BY a.appointmentdate DESC, a.slot ASC
    `;

    db.all(query, [userId], (err, rows) => {
        if (err) {
            console.error("Error fetching appointments:", err);
            return res.status(500).json({
                success: false,
                message: 'Error fetching appointments'
            });
        }

        console.log('Found appointments:', rows);

        // Format appointments
        const appointments = rows.map(row => ({
            id: row.id,
            date: row.appointmentdate,
            time: row.bookingslot,
            status: row.status || 'scheduled',
            vet: {
                name: row.vetName,
                specialisation: row.vetSpecialisation,
                location: row.vetLocation,
                contact: row.vetContact,
                email: row.vetEmail,
                phone: row.vetPhone
            }
        }));

        res.json({
            success: true,
            appointments
        });
    });
});

// Book appointment
server.post('/vets/:vetid/appointments', verifyToken, (req, res) => {
    const vetId = parseInt(req.params.vetid, 10);
    const userId = req.userDetails.id;
    const { date, slot } = req.body;

    if (!date || !slot) {
        return res.status(400).json({
            success: false,
            message: 'Date and time slot are required'
        });
    }

    // First check if the slot is available
    const checkQuery = `
        SELECT COUNT(*) as count 
        FROM appointments 
        WHERE vetid = ? AND appointmentdate = ? AND slot = ?
    `;

    db.get(checkQuery, [vetId, date, slot], (err, row) => {
        if (err) {
            console.error("Error checking slot availability:", err);
            return res.status(500).json({
                success: false,
                message: 'Error checking appointment availability'
            });
        }

        if (row.count > 0) {
            return res.status(400).json({
                success: false,
                message: 'This time slot is already booked'
            });
        }

        // If slot is available, book it
        const insertQuery = `
            INSERT INTO appointments (userid, vetid, appointmentdate, slot, status)
            VALUES (?, ?, ?, ?, 'scheduled')
        `;

        db.run(insertQuery, [userId, vetId, date, slot], function(err) {
            if (err) {
                console.error("Error booking appointment:", err);
                return res.status(500).json({
                    success: false,
                    message: 'Error booking appointment'
                });
            }

            res.json({
                success: true,
                message: 'Appointment booked successfully',
                appointmentId: this.lastID
            });
        });
    });
});

// Cancel appointment
server.post('/appointments/:id/cancel', verifyToken, (req, res) => {
    const appointmentId = parseInt(req.params.id, 10);
    const userId = req.userDetails.id;

    // First verify that this appointment belongs to the user
    const checkQuery = 'SELECT userid FROM appointments WHERE id = ?';
    
    db.get(checkQuery, [appointmentId], (err, row) => {
        if (err) {
            console.error("Error checking appointment:", err);
            return res.status(500).json({
                success: false,
                message: 'Error cancelling appointment'
            });
        }

        if (!row) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        if (row.userid !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to cancel this appointment'
            });
        }

        // Update the appointment status
        const updateQuery = `
            UPDATE appointments 
            SET status = 'cancelled'
            WHERE id = ?
        `;

        db.run(updateQuery, [appointmentId], (err) => {
            if (err) {
                console.error("Error cancelling appointment:", err);
                return res.status(500).json({
                    success: false,
                    message: 'Error cancelling appointment'
                });
            }

            res.json({
                success: true,
                message: 'Appointment cancelled successfully'
            });
        });
    });
});

//shops
server.get('/shops', verifyToken, (req, res) => {
    const query = 'SELECT * FROM shop';
    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).send('Error fetching shops');
        }
        res.status(200).json(rows);
    });
});

//search shops
server.get('/shops/search', verifyToken, (req, res) => {
    let name= req.query.name;
    let location= req.query.location;
    let rating= req.query.rating;
    if (!name && !location && !rating) {
        return res.status(400).send("Choose at least one filter");
    }
    let searchquery = `SELECT * FROM shop WHERE 1=1`;
    const queryParams = [];
    if (name) {
        searchquery += ` AND name LIKE ?`;
        queryParams.push(`%${name}%`);    }
    if (location) {
        searchquery += ` AND location LIKE ?`;
        queryParams.push(`%${location}%`);
    }
    if (rating) {
        searchquery += ` AND rating >= ?`;
        queryParams.push(rating);
    }

    console.log("Search Results: ", searchquery);
    db.all(searchquery, queryParams, (err, rows) => {
        if (err) {
            console.error("Error fetching shops:", err.message);
            return res.status(500).send("Failed to fetch shops.");
        }

        return res.status(200).json(rows);
    });
});

//searching with shop id 
server.get('/shops/:shopid', verifyToken, (req, res) => {
    const shopid = parseInt(req.params.shopid, 10);
    const query = `SELECT * FROM shop WHERE id = ?`;
    db.get(query, [shopid],(err, row) => {
        if (err) {
            console.error("Error fetching shop details:", err.message);
            return res.status(500).send('Error fetching shop details');
        }
        if (!row) {
            return res.status(404).send(`Shop not found`);
        }
        return res.status(200).json(row);
    });
});

//getting products using shop id
server.get('/shops/:shopid/products', verifyToken, (req, res) => {
    const shopid = parseInt(req.params.shopid, 10);
    const query = `SELECT * FROM products WHERE shopid = ?`;
    db.all(query, [shopid],(err, rows) => {
        if (err) {
            console.error("Error fetching products for shop:", err.message);
            return res.status(500).send('Error fetching products');
        }
        if (rows.length === 0) {
            return res.status(404).send(`No products found for shop ID = ${shopid}`);
        }
        res.status(200).json(rows);
    });
});

server.put('/shop/update/:shopid', verifyToken, (req, res) => {

    const shopid = parseInt(req.params.shopid, 10);
    let name = req.body.name;
    let location = req.body.location;
    let contact = req.body.contact;
    let phonenumber = req.body.phonenumber;
    let rating = req.body.rating;

    if (!name && !location && !contact && !phonenumber && !rating) {
        return res.status(400).send('At least one field required (name, location, contact, phonenumber, rating)');
    }

    const updates = [];
    const values = [];

    if (name) {
        updates.push("name = ?");
        values.push(name);
    }
    if (location) {
        updates.push("location = ?");
        values.push(location);
    }
    if (contact) {
        updates.push("contact = ?");
        values.push(contact);
    }
    if (phonenumber) {
        updates.push("phonenumber = ?");
        values.push(phonenumber);
    }
    if (rating) {
        updates.push("rating = ?");
        values.push(rating);
    }

    const query = `UPDATE shop SET ${updates.join(', ')} WHERE id = ?`;
    values.push(shopid);

    db.run(query, values, (err) => {
        if (err) {
            return res.status(500).send('Error updating shop data');
        }
        res.status(200).send('Shop data updated successfully');
    });
});

//deleting shop
server.delete('/shop/delete/:shopid', verifyToken, (req, res) => {
    const shopid = parseInt(req.params.shopid, 10);
    const query = `DELETE FROM shop WHERE id = ?`;

    db.run(query, [shopid],(err) => {
        if (err) {
            return res.status(500).send('Error deleting shop');
        }
        res.status(200).send('Shop deleted successfully');
    });
});

server.post('/shop/add', verifyToken, (req, res) => {
    let name= req.body.name;
    let location= req.body.location;
    let contact= req.body.contact;
    let phonenumber= req.body.phonenumber;
    let rating= req.body.rating;

    if (!name || !location || !contact || !phonenumber || !rating) {
        return res.status(400).send("Missing required fields");
    }

    const query = `
        INSERT INTO shop (name, location, contact, phonenumber, rating)
        VALUES (?,?,?,?,?)
    `;

    db.run(query, [name,location,contact,phonenumber,rating],(err) => {
        if (err) {
            return res.status(500).send('Error adding new shop');
        }
        res.status(201).json({ message: 'Shop added successfully' });
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
        return res.status(400).send("Missing required fields");
    }

    const query = `
        INSERT INTO products (name, description, price, quantity, category, shopid)
        VALUES (?,?,?,?,?,?)
    `;

    db.run(query, [name,description,price,quantity,category,shopid],(err) => {
        if (err) {
            return res.status(500).send('Error adding product');
        }
        res.status(201).json({ message: 'Product added successfully' });
    });
});

server.delete('/shops/:shopid/products/:productid', verifyToken, (req, res) => {
    const shopid = parseInt(req.params.shopid, 10);
    const productid = parseInt(req.params.productid, 10);

    if (!shopid || !productid) {
        return res.status(400).send("Shop ID and Product ID are required.");
        }

    const query = `DELETE FROM products WHERE id = ? AND shopid = ?`;

    db.run(query,[productid,shopid], (err) => {
            if (err) {
            console.error("Error deleting product:", err.message);
            return res.status(500).send("Failed to delete product.");
            }

        res.status(200).json({ message: "Product deleted successfully." });
        });
    });

server.put('/shops/:shopid/products/:productid', verifyToken, (req, res) => {
    const shopid = parseInt(req.params.shopid, 10);
    const productid = parseInt(req.params.productid, 10);
    let name= req.body.name;
    let description= req.body.description;
    let price= req.body.price;
    let quantity= req.body.quantity;
    let category= req.body.category;

    if (!shopid || !productid) {
        return res.status(400).send("Shop ID and Product ID are required.");
    }

    if (!name && !description && !price && !quantity && !category) {
        return res.status(400).send("At least one field to update must be provided.");
    }

    const updates = [];
    if (name) updates.push(`name = '${name}'`);
    if (description) updates.push(`description = '${description}'`);
    if (price) updates.push(`price = ${price}`);
    if (quantity) updates.push(`quantity = ${quantity}`);
    if (category) updates.push(`category = '${category}'`);

    const query = `UPDATE products SET ${updates.join(', ')} WHERE id = ${productid} AND shopid = ${shopid}`;

    db.run(query, (err) => {
        if (err) {
            console.error("Error updating product:", err.message);
            return res.status(500).send("Failed to update product.");
        }
        else{
        res.status(200).send("Product updated successfully.");
        }
    });
});

server.post('/shops/:shopid/products/:productid/buy', verifyToken, (req, res) => {
    const shopId = parseInt(req.params.shopid, 10);
    const productId = parseInt(req.params.productid, 10);
    const userId = req.userDetails.id;  
    const { quantity = 1 } = req.body;  

    if (!shopId || !productId) {
        return res.status(400).json({
            success: false,
            message: "Shop ID and Product ID are required."
        });
    }

    const fetch_product_query = `SELECT * FROM products WHERE id = ? AND shopid = ?`;
    db.get(fetch_product_query, [productId, shopId], (err, product) => {
        if (err) {
            console.error("Error fetching product details:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch product details"
            });
        }

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found in the specified shop"
            });
        }

        if (product.quantity < quantity) {
            return res.status(400).json({
                success: false,
                message: "Not enough stock available"
            });
        }

        const totalPrice = product.price * quantity;
        const updated_quantity = product.quantity - quantity;
        
        // Update product quantity
        const update_product_query = `UPDATE products SET quantity = ? WHERE id = ? AND shopid = ?`;
        db.run(update_product_query, [updated_quantity, productId, shopId], (err) => {
            if (err) {
                console.error("Error updating product quantity:", err);
                return res.status(500).json({
                    success: false,
                    message: "Failed to update product quantity"
                });
            }

            const insert_purchase_query = `
                INSERT INTO purchases (userid, productid, shopid, quantity, totalprice, purchasedate)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            `;

            db.run(insert_purchase_query, [userId, productId, shopId, quantity, totalPrice], function(err) {
                if (err) {
                    console.error("Error recording purchase:", err);
                    return res.status(500).json({
                        success: false,
                        message: "Failed to record purchase"
                    });
                }

                res.status(201).json({
                    success: true,
                    message: "Purchase successful",
                    purchase: {
                        id: this.lastID,
                        productName: product.name,
                        quantity: quantity,
                        totalPrice: totalPrice,
                        date: new Date().toISOString()
                    }
                });
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
