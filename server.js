const express = require('express');
const db_access = require('./db.js');
const db = db_access.db;
const server = express();
const port = 8888;
server.use(express.json());

//USERR
//registration
server.post('/user/register', (req, res) => {
    let name = req.body.name;
    let email = req.body.email;
    let password = req.body.password;
    let age= req.body.age;
    if (!name || !email || !password || !role) {
        return res.status(400).send("name, email,role, and password are required.");
    };
    const insertquery = `INSERT INTO USER(name,email,password)Values('${name}','${email}','${password}')`;
    db.run(insertquery, (err) => {
        if (err) {
            return res.status(500).send(`Error during registration: ${err.message}`);
        }
        else {
            return res.status(200).send("Registration successful");
        }
    });
});

//login
server.post('/user/login', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    if (!email || !password) {
        return res.status(400).send("Email and password are required.");
    }

    const loginquery = `SELECT * FROM USER WHERE email = '${email}' AND password = '${password}'`;

    db.get(loginquery, (err, row) => {
        if (err){
            console.error("Database error:", err);
            return res.status(500).send("An error occurred.");
        }
      
        if (!row) {
            return res.status(401).send("Invalid credentials");
        } else {
            return res.status(200).send("Login successful");
        }
    });
});

//user deleting account
server.delete('/user/account/delete/:id', (req, res) => {
    let userid= parseInt(req.params.id,10); 
    
    const query = `DELETE FROM user WHERE id = ${userid}`;
    db.run(query, (err) => {
        if (err) {
            return res.status(500).send('Error deleting account');
        }
        else{
        res.status(200).send('Account deleted successfully');
        }
    });
});

//user editing account
server.put('/user/account/edit/:id', (req, res) => {
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
        updates.push("password = ?");
        values.push(password);
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
server.get('/users', (req, res) => {
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
server.post('/pets/createprofile', (req, res) => {
    let name = req.body.name;
    let age = req.body.age;
    let vaccinationdates = req.body.vaccinationdates;
    let healthnotes = req.body.healthnotes;
    let breed =req.body.breed;

    if (!name || !age || !breed) {
        return res.status(400).json({ message: "Missing required fields: name, age and breed" });
    }
    if (typeof age !== 'number' || age < 0) {
        return res.status(400).json({ message: "Invalid age" });
    }

    const insertquery = `INSERT INTO PET (name, age, vaccinationdates, healthnotes, breed)VALUES ('${name}','${age}','${vaccinationdates}','${healthnotes}', '${breed}')`;

    db.run(insertquery, (err) => {
        if (err) {
            console.error("Error inserting pet profile:", err.message);
            return res.status(500).json({ message: "Failed to create pet profile" });
        }

        res.status(201).json({
            message: "Pet profile created successfully",
        });
    });
});

//deleting pet profile
server.delete('/user/pets/delete/:id', (req, res) => {
    let petid= parseInt(req.params.id, 10);

    const query = `DELETE FROM pet WHERE id = ${petid}`;
    db.run(query, (err) =>{
        if (err) {
            return res.status(500).send('Error deleting pet account');
        }
        res.status(200).send('Pet account deleted successfully');
    });
});

//user editing pets profile
server.put('/user/pets/edit/:id', (req, res) => {
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
server.get('/petprofiles', (req,res)=>{
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
server.get('/vets', (req, res) => {
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
server.get('/vets/search', (req, res) => {
    let name = req.query.name;
    let specialisation = req.query.specialisation;
    let rating = req.query.rating;
    let location = req.query.location;

    if (!specialisation && !location && !rating && !name) {
        return res.status(400).send("choose at least one filter");
    }

    const searchquery = `SELECT * FROM vets WHERE QUANTITY > 0`

    if (specialisation) {
        searchquery += `AND TYPE= '${specialisation}'`;
    };
    if (name) {
        searchquery += `AND NAME= '${name}'`;
    };
    if (location) {
        searchquery += `AND LOCATION = '${location}'`;
    }

    if (rating) {
        searchquery += `AND RATING = '${rating}'`;

    }

    console.log("Search Results: ", searchquery);
    db.all(searchquery, (err, rows) => {
        if (err) {
            console.error("Error fetching vets:", err.message);
            return res.status(500).send("Failed to fetch vets.");
        }

        return res.status(200).json({ services: rows });
    });
});

server.get('/vets/search/:vetid', (req, res) => {
    const servicesquery = `SELECT * FROM vets WHERE id=${req.params.id}`
    db.get(servicesquery, (err, row) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Error fetching vet details');
        }
        if (!row) {
            return res.status(404).send(`vet with id = ${vetid} not found`);
        }
        return res.status(200).json(row);
    });
});

server.put('/vet/update/:vetid', (req, res) => {
    const { serviceid } = req.params;
    let name = req.body.name;
    let specialisation = req.body.specialisation;
    let location = req.body.location;
    let email = req.body.email;
    let phonenumber = req.body.phonenumber;
    let rating = req.body.rating;

    const query = `UPDATE vets SET name = '${name}', specialisation = '${specialisation}', location = '${location}', email = '${email}', rating = '${rating}', phonenumber = '${phonenumber}' WHERE id = '${vetid}'`;

    db.run(query,(err)=> {
        if (err) {
            return res.status(500).send('Error updating vet data');
        }
        res.status(200).send('Vet data updated successfully');
    });
});

//admin deleting a service using its id
server.delete('/vet/delete/:vetid', (req, res) => {
    const { vetid } = parseInt(req.params,10);
    const query = `DELETE FROM vets WHERE id = ${vetid}`;

    db.run(query, (err)=> {
        if (err) {
            return res.status(500).send('Error deleting vet data');
        }
        res.status(200).send('vet deleted successfully');
    });
});

//adding service
server.post('/vet/add', (req, res) => {
    let name = req.body.name;
    let specialisation = req.body.specialisation;
    let location = req.body.location;
    let email = req.body.email;
    let phonenumber = req.body.phonenumber;
    let rating = req.body.rating;
    const query = `INSERT INTO vets (name, specialisation, email, location, phonenumber, rating) VALUES ('${name}','${specialisation}','${email}','${location}','${phonenumber}','${rating}')`;

    db.run(query, (err) =>{
        if (err) {
            return res.status(500).send('Error adding new vet');
        }
        res.status(201).json({
            message: 'vet added successfully',
        });
    });
});

//service feedback
server.post('/vets/:vetid/feedback', (req, res) => {
    let vetid = req.params.vetid;
    let userid = req.params.userid;
    let rating = req.body.rating;
    let comment = req.body.comment;

    if (!userid || !rating || typeof rating !== 'number' || rating < 1 || rating > 5 || !vetid) {
        return res.status(400).json({ message: "Invalid input. Ensure 'userId', 'rating' (1-5)" });
    }

    const feedbackQuery = `
        INSERT INTO feedback (userid, vetid, rating, comment)
        VALUES ('${userid}', '${vetid}', '${rating}', '${comment}')
    `;

    db.run(feedbackQuery, (err) =>{
        if (err) {
            console.error("Error inserting feedback:", err.message);
            return res.status(500).json({ message: "Failed to submit feedback" });
        }

        return res.status(200).json({ message: "Feedback submitted successfully" });
    });
});

// user feedback for the website
server.post('/user/feedback', (req, res) => {
    let rating = req.body.rating;
    let comment = req.body.comment;
    let email = req.body.email

    if (!rating) {
        return res.status(400).json({
            message: "Rating is required."
        });
    }

    const feedbackQuery = `INSERT INTO feedback (rating, comment, email) VALUES ('${email}', '${rating}', '${comment}')`;

    db.run(feedbackQuery, (err) => {
        if (err) {
            console.error('Error submitting feedback:', err.message);
            return res.status(500).json({
            message: "There was an error submitting your feedback. Please try again later."
            });
        }

        return res.status(200).json({
            message: "Thank you for your feedback!"
        });
    });
});


//admin getting all the feedbacks
server.get(`/admin/feedback`, (req, res) => {
    const feedbackquery = `SELECT * FROM feedback`
    db.all(feedbackquery, [], (err, rows) => {
        if (err) {
            console.error('Error fetching feedback:', err.message);
            return res.status(500).json({
                message: "Error fetching feedback data. Please try again later."
            });
        }
        else
            return res.json(rows)
    });
});

//APPOINTMENTS  
//displaying all the appointments
server.post('/vets/:vetid/bookingappointments', (req, res) => {
    let vetid = parseInt(req.params.vetid, 10);
    let userid= req.body.userid
    let bookingslot  = req.body.bookingslot;

    if (!userid || !bookingslot) {
        return res.status(400).send("User ID and selected slot are required.");
    }

    const fetch_slots_query = `SELECT availableslots FROM vets WHERE id = ${vetid}`;
    db.get(fetch_slots_query, (err, row) => {
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

        const update_slots_query = `UPDATE vets SET availableslots = '${updated_slots}' WHERE id = ${vetid}`;
        db.run(update_slots_query, (err) => {
            if (err) {
                console.error("Error updating slots:", err.message);
                return res.status(500).json({ message: "Failed to update available slots." });
            }

            const [appointment_date, appointment_time] = bookingslot.split(' '); 
            const insert_appointment_query = `
                INSERT INTO appointments (userid, vetid, appointmentdate, appointmenttime)
                VALUES ('${userid}', '${vetid}', '${appointment_date}', '${appointment_time}')
            `;

            db.run(insert_appointment_query, function (err) {
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
server.get('/shops', (req, res) => {
    const query = 'SELECT * FROM shop';
    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).send('Error fetching shops');
        }
        res.status(200).json(rows);
    });
});

//search shops
server.get('/shops/search', (req, res) => {
    const { name, location, rating } = req.query;

    if (!name && !location && !rating) {
        return res.status(400).send("Choose at least one filter");
    }

    let searchquery = `SELECT * FROM shop WHERE 1=1`;

    if (name) {
        searchquery += ` AND name LIKE '%${name}%'`;
    }
    if (location) {
        searchquery += ` AND location LIKE '%${location}%'`;
    }
    if (rating) {
        searchquery += ` AND rating >= ${rating}`;
    }

    console.log("Search Results: ", searchquery);
    db.all(searchquery, (err, rows) => {
        if (err) {
            console.error("Error fetching shops:", err.message);
            return res.status(500).send("Failed to fetch shops.");
        }

        return res.status(200).json(rows);
    });
});
//starting server  
server.listen(port, () => {
    console.log(`Server is listening at port ${port}`);
});
