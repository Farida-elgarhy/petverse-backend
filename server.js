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
    origin:"http://localhost:3000",
    credentials:true
}))
server.use(express.json());
server.use(cookieParser());



const generateToken = (id, isAdmin) => {
    return jwt.sign({ id, isAdmin }, secret_key, { expiresIn: '2h' });
};

const verifyToken = (req, res, next) => {
    const token = req.cookies.authToken;
    if (!token) {
        return res.status(401).send('Unauthorized');
    }
    
    jwt.verify(token, secret_key, (err, details) => {
        if (err) {
            return res.status(403).send('Invalid or expired token');
        }
        req.userDetails = details;
        next();
    });
};


//USERR
//registration
server.post('/user/register', (req, res) => {
    const name = req.body.name
    const email = req.body.email
    const password = req.body.password
    let age = req.body.age;
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            return res.status(500).send('error hashing password')
        }
        db.run(`INSERT INTO USER (name,email,password,isadmin) VALUES (?,?,?,?)`, [name, email, hashedPassword, 0], (err) => {
            if (err) {
                return res.status(401).send(err)
            }
            else
                return res.status(200).send(`registration successfull`)
        })
    })

});

// Logout route
server.post('/user/logout', (req, res) => {
    res.clearCookie('authToken');
    res.status(200).send('Logged out successfully');
});



//login
server.post('/user/login', (req, res) => {
    const email = req.body.email
    const password = req.body.password
    db.get(`SELECT * FROM USER WHERE EMAIL=?`, [email], (err, row) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("An error occurred.");
        }
      
        if (!row) {
            return res.status(401).send("Invalid credentials");
        }
        
        bcrypt.compare(password, row.PASSWORD, (err, isMatch) => {
            if (err) {
                return res.status(500).send('Error comparing password');
            }
            if (!isMatch) {
                return res.status(401).send('Invalid credentials');
            }
            
            let userID = row.ID
            let isAdmin = row.ISADMIN
            const token = generateToken(userID, isAdmin)

            res.cookie('authToken', token, {
                httpOnly: true,
                sameSite: 'none',
                secure: true,
                expiresIn: '1h'
            })
            return res.status(200).json({ id: userID, admin: isAdmin })
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
server.put('/user/account/edit/:id', verifyToken, (req, res) => {
    let name= req.body.name;
    let email= req.body.email;
    let password = req.body.password;
    const userId = parseInt(req.params.id,10);

    if (!name && !email && !password) {
        return res.status(400).send('At least one field (name, email, or password) must be provided.');
    }

    const updates = [];
    const values = [];

    if (name) {
        updates.push("name = ?");
        values.push(name);
    }
    if (email) {
        updates.push("email = ?");
        values.push(email);
    }
    if (password) {
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                return res.status(500).send('Error hashing password');
            }
            updates.push("password = ?");
            values.push(hashedPassword);
        });
    }

    const query = `UPDATE user SET ${updates.join(', ')} WHERE id = ?`;
    values.push(userId); 

    db.run(query, values, function (err) {
        if (err) {
            console.error(err);
            return res.status(500).send('Error updating account.',(err));
        }

        if (this.changes === 0) {
            return res.status(404).send('User not found or no changes made.');
        }

        return res.status(200).send('Account updated successfully.');
    });
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
    let name = req.body.name;
    let age = req.body.age;
    let vaccinationdates = req.body.vaccinationdates;
    let healthnotes = req.body.healthnotes;
    let breed =req.body.breed;
    let userid= req.body.userid;

    if (!name || !age || !breed || !userid) {
        return res.status(400).send("Name, age, breed and user ID are required");
    }

    const insertquery = `INSERT INTO pet (name, age, vaccinationdates, healthnotes, breed, userid) 
                        VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.run(insertquery, [name, age, vaccinationdates, healthnotes, breed, userid], (err) => {
        if (err) {
            console.error("Error inserting pet profile:", err.message);
            return res.status(500).send( "Failed to create pet profile" );
        }
        else{
        res.status(201).send("Pet profile created successfully")
        }
        res.status(201).json({
            message: "Pet profile created successfully",
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
    db.all(query,(err, rows) => {
        if (err) {
            return res.status(500).send('Error fetching Vets');
        }
        res.status(200).json(rows);
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
    let email = req.body.email

    if (!rating) {
        return res.status(400).json({
            message: "Rating is required."
        });
    }

    const feedbackQuery = `INSERT INTO feedback (rating, comment, email) VALUES (?,?,?)`;

    db.run(feedbackQuery, [rating,comment,email], (err) => {
        if (err) {
            console.error('Error submitting feedback:', err.message);
            return res.status(500).send("There was an error submitting your feedback. Please try again later.");
        }

        return res.status(200).send("Thank you for your feedback!");
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

    const shopid = parseInt(req.params.shopid, 10);
    const productid = parseInt(req.params.productid, 10);
    const userid = req.body.userid;

    if (!shopid || !productid || !userid) {
        return res.status(400).send("Shop ID, Product ID, and User ID are required.");
    }

    const fetch_product_query = `SELECT * FROM products WHERE id = ? AND shopid = ?`;
    db.get(fetch_product_query, [productid, shopid], (err, product) => {
        if (err) {
            console.error("Error fetching product details:", err.message);
            return res.status(500).send("Failed to fetch product details.");
        }

        if (!product) {
            return res.status(404).send("Product not found in the specified shop.");
        }

        if (product.quantity <= 0) {
            return res.status(400).send("Product is out of stock.");
        }

        const updated_quantity = product.quantity - 1;
        const update_product_query = `UPDATE products SET quantity = ? WHERE id = ? AND shopid = ?`;
        db.run(update_product_query, [updated_quantity, productid, shopid], (err) => {
            if (err) {
                console.error("Error updating product quantity:", err.message);
                return res.status(500).send("Failed to update product quantity.");
            }

            const insert_purchase_query = `
                INSERT INTO purchases (userid, productid, shopid)
                VALUES (?, ?, ?)
            `;

            db.run(insert_purchase_query, [userid, productid, shopid], function(err) {
                if (err) {
                    console.error("Error recording purchase:", err.message);
                    return res.status(500).send("Failed to record purchase.");
                }
                else{
                res.status(201).send("Product purchased successfully.")
                }
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
    console.log(`Server is listening at port ${port}`);
});
