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


//starting server  
server.listen(port, () => {
    console.log(`Server is listening at port ${port}`);
});
