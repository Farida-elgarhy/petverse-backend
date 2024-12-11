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
    if (!name || !email || !password) {
        return res.status(400).send("name, email, and password are required.");
    }
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

//user deleting account
server.delete('/user/account/delete/:id', (req, res) => {
    let userid= parseInt(req.params.id,10); 
    
    const query = `DELETE FROM user WHERE id = ${userid}`;
    db.run(query, (err) => {
        if (err) {
            return res.status(500).send('Error deleting account');
        }
        res.status(200).send('Account deleted successfully');
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


//starting server  
server.listen(port, () => {
    console.log(`Server is listening at port ${port}`);
});
