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
// // Get all users
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

//SERVICES
//services search
server.get('/services/search', (req, res) => {
    let type = req.query.type;
    let name = req.query.name;
    let rating = req.query.rating;
    let contact = req.query.contact;
    let location = req.query.location;

    if (!type && !location && !rating && !name) {
        return res.status(400).send("choose at least one filter");
    }

    const searchquery = `SELECT * FROM services WHERE QUANTITY > 0`

    if (type) {
        searchquery += `AND TYPE= '${type}'`;
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
            console.error("Error fetching services:", err.message);
            return res.status(500).send("Failed to fetch services.");
        }

        return res.status(200).json({ services: rows });
    });
});


//searching services by their id 
server.get('/services/search/:serviceid', (req, res) => {
    const servicesquery = `SELECT * FROM services WHERE id=${req.params.id}`
    db.get(servicesquery, (err, row) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Error fetching service details');
        }
        if (!row) {
            return res.status(404).send(`Service with id = ${serviceid} not found`);
        }
        return res.status(200).json(row);
    });
});

//getting all services
server.get('/admin/services', (req, res) => {
    let type= req.query.type;
    let location= req.query.location;
    let rating= req.query.rating;

    const query = 'SELECT * FROM services';
    db.all(query,(err, rows) => {
        if (err) {
            return res.status(500).send('Error fetching services');
        }
        res.status(200).json(rows);
    });
});

//admin updating a service based on id
server.put('/admin/services/update/:serviceid', (req, res) => {
    const { serviceid } = req.params;
    let name = req.body.name;
    let type = req.body.type;
    let provider = req.body.provider;
    let location = req.body.location;
    let cost = req.body.cost;
    let rating = req.body.rating;
    const query = `UPDATE services SET name = '${name}', type = '${type}', provider = '${provider}', location = '${location}', cost = '${cost}', rating = '${rating}' WHERE id = '${serviceid}'`;

    db.run(query, [name, type, provider, location, cost, rating, serviceid],(err)=> {
        if (err) {
            return res.status(500).send('Error updating service');
        }
        res.status(200).send('Service updated successfully');
    });
});

//admin deleting a service using its id
server.delete('/admin/services/delete/:serviceid', (req, res) => {
    const { serviceid } = req.params;
    const query = `DELETE FROM services WHERE id = ${serviceid}`;

    db.run(query, [serviceid], (err)=> {
        if (err) {
            return res.status(500).send('Error deleting service');
        }
        res.status(200).send('Service deleted successfully');
    });
});

//adding service
server.post('/admin/services/add', (req, res) => {
    let name = req.body.name;
    let type = req.body.type;
    let provider = req.body.provider;
    let location = req.body.location;
    let cost = req.body.cost;
    let rating = req.body.rating;
    const query = `INSERT INTO services (name, type, provider, location, cost, rating) VALUES ('${name}','${type}','${provider}','${location}','${cost}','${rating}')`;

    db.run(query, [name, type, provider, location, cost, rating],  (err) =>{
        if (err) {
            return res.status(500).send('Error creating service');
        }
        res.status(201).json({
            message: 'Service created successfully',
            serviceId: this.lastID
        });
    });
});
//starting server  
server.listen(port, () => {
    console.log(`Server is listening at port ${port}`);
});
