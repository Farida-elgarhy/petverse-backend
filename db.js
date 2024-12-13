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
    age INTEGER
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
    FOREIGN KEY (userid) REFERENCES user (id)
    )`;

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
    FOREIGN KEY (userid) REFERENCES user (id)
    )`;

//appointments table
const createappointmentstable = `
  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userid INTEGER,
    vetid INTEGER,
    appointmentdate TEXT NOT NULL,
    appointmenttime TEXT NOT NULL,
    FOREIGN KEY (userid) REFERENCES user (id),
    FOREIGN KEY (vetid) REFERENCES vets (id)
    )`;

//feedback table
const createfeedbacktable = `
  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rating INTEGER NOT NULL,
    comment TEXT,
    userid INTEGER,
    vetid INTEGER,
    FOREIGN KEY (userid) REFERENCES user (id),
    FOREIGN KEY (vetid) REFERENCES vets (id)
    )`;

//shops table 
const createshopstable = `
  CREATE TABLE IF NOT EXISTS shop (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    contact TEXT NOT NULL,
    phonenumber INTEGER NOT NULL,
    rating REAL NOT NULL,
    userid INTEGER,
    FOREIGN KEY (userid) REFERENCES user (id)
    )`;

//products table
const createproductstable = `
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    category TEXT NOT NULL,
    shopid INTEGER,
    FOREIGN KEY (shopid) REFERENCES shop (id)
    )`;

//purchases table
const createpurchasestable = `
  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userid INTEGER,
    productid INTEGER,
    shopid INTEGER,
    FOREIGN KEY (userid) REFERENCES user (id),
    FOREIGN KEY (productid) REFERENCES products (id),
    FOREIGN KEY (shopid) REFERENCES shop (id)
    )`;

// Create tables
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
    
    db.exec(createproductstable, (err) => {
        if (err) {
            console.error("Error creating products table:", err);
        } else {
          console.log("products table created successfully!");
        }
    });
    
    db.exec(createpurchasestable, (err) => {
        if (err) {
            console.error("Error creating purchases table:", err);
        } else {
            console.log("Purchases table created successfully!");
        }
    });
});

module.exports = { db, createusertable, createpettable, createappointmentstable,createfeedbacktable, createproductstable, createvetstable, createshopstable};