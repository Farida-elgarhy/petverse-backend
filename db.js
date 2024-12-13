const sqlite3= require('sqlite3').verbose();
const db= new sqlite3.Database('./database.db');

//DATABASE TABLES
// Creating User table
const createusertable = `
  CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, 
    email TEXT UNIQUE NOT NULL, 
    password TEXT NOT NULL,
    age INTEGER,
    role TEXT NOT NULL
    )`;

// creating pets table
const createpettable = `
  CREATE TABLE IF NOT EXISTS pet(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    vaccinationdates TEXT, 
    healthnotes TEXT,
    breed TEXT NOT NULL,
    userid INTEGER,
    FOREIGN KEY (userid) REFERENCES USER (id)
    )`;

// // services table
// const createservicestable = `
//   CREATE TABLE IF NOT EXISTS services (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     name TEXT NOT NULL,
//     type TEXT NOT NULL,
//     rating REAL NOT NULL,
//     contact TEXT NOT NULL,
//     location TEXT NOT NULL,
//     )`

//vets table 
const createvetstable= `
  CREATE TABLE IF NOT EXISTS vets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialisation TEXT NOT NULL,
    contact TEXT NOT NULL,
    location TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phonenumber INTEGER NOT NULL, 
    rating REAL NOT NULL, 
    userid INTEGER,
    adminid INTEGER,
    FOREIGN KEY (userid) REFERENCES USER (id),
    FOREIGN KEY (adminid) REFERENCES USER (id),
  )`;

//shops table 
const createshopstable= `CREATE TABLE IF NOT EXISTS shop (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    contact TEXT NOT NULL,
    phonenumber INTEGER NOT NULL,
    rating REAL NOT NULL,
    userid INTEGER,
    availableslots TEXT NOT NULL,
    FOREIGN KEY (userid) REFERENCES USER (id)
)`;

//products table 
const createproductstable= `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    category TEXT,
    shopid INTEGER NOT NULL, 
    FOREIGN KEY (shopid) REFERENCES SHOP (ID)
)`;

// appointments table
const createappointmentstable = `CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userid TEXT NOT NULL,
    vetid TEXT NOT NULL,
    appointmenttime TEXT NOT NULL,
    appointmentdate TEXT NOT NULL,
    FOREIGN KEY (userid) REFERENCES user(id),
    FOREIGN KEY (serviceid) REFERENCES vets(id)
    )`;

//feedback table
const createfeedbacktable = `CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userid TEXT,  
    serviceid INTEGER,  
    feedbacktype TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    email TEXT, 
    FOREIGN KEY (serviceid) REFERENCES services (id),
    FOREIGN KEY (userid) REFERENCES user(id)
    )`;

//complaints
// const createcomplaintstable= `CREATE TABLE IF NOT EXISTS complaint(
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     userid INTEGER,
//     subject TEXT NOT NULL,
//     description TEXT NOT NULL,
//     FOREIGN KEY (userid) REFERENCES USER (id)
// )`;

//running database tables
db.serialize(() => { 
    db.exec(createusertable, (err) => {
        if (err) {
            console.error("Error creating user table:", err);
        } else {
            console.log("User table created successfully!");
        }
    });
    db.exec(createpettable, (err) => {
        if (err) {
            console.error("Error creating pets table:", err.message);
        } else {
            console.log("Pets table created successfully!");
        }
    });

    // db.exec(createservicestable, (err) => {
    //   if (err) {
    //     console.error("Error creating the table:", err.message);
    //   } else {
    //     console.log("Services table created successfully!");
    //   }
    // });

    db.exec(createappointmentstable, (err) => {
      if (err) {
        console.error("Error creating the table:", err.message);
      } else {
        console.log("Appointments table created successfully!");
      }
    });

    db.exec(createfeedbacktable, (err) => {
      if (err) {
        console.error("Error creating the table:", err.message);
      } else {
        console.log("Feedback table created successfully!");
      }
    });
    db.exec(createvetstable, (err) => {
      if (err) {
          console.error("Error creating vets table:", err);
      } else {
          console.log("vets table created successfully!");
      }
    });
    db.exec(createshopstable, (err) => {
      if (err) {
          console.error("Error creating shops table:", err);
      } else {
          console.log("shops table created successfully!");
      }
    });
    db.exec(createcomplaintstable, (err) => {
      if (err) {
          console.error("Error creating complaints table:", err);
      } else {
          console.log("complaints table created successfully!");
      }
    });
    db.exec(createproductstable, (err) => {
      if (err) {
          console.error("Error creating products table:", err);
      } else {
          console.log("products table created successfully!");
      }
    });

});



module.exports = { db, createusertable, createpettable, createappointmentstable,createfeedbacktable, createcomplaintstable, createproductstable, createvetstable, createshopstable};