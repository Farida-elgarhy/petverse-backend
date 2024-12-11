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
    })
})

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
