require('dotenv').config();
const jsforce = require('jsforce');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const express = require('express');
const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());

mongoose.connect(process.env.MONGOURL, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const { SF_LOGIN_URL, SF_USERNAME, SF_PASSWORD, SF_TOKEN } = process.env;
const conn = new jsforce.Connection({
    loginUrl: SF_LOGIN_URL
});
conn.login(SF_USERNAME, SF_PASSWORD + SF_TOKEN)
.then(userInfo => {
    console.log('Successfully Logged in as:', userInfo.username);
    console.log('Instance URL :', conn.instanceUrl);
    console.log('Access Token :', conn.accessToken);
    console.log('Org Id :', userInfo.organizationId);

    // Define the schema for the "trips" collection
    const tripSchema = new mongoose.Schema({
        vehicle: {
            id: String,
            name: String,
            linkedVehicleId: mongoose.Schema.Types.ObjectId
        },
        startTime: String,
        stopTime: String,
        tripDuration: String,
        tripDistance: String,
        maxSpeed: String,
        avgSpeed: String,
        startAddress: {
            queryAddress: String,
            position: {
                altitude: Number,
                longitude: Number,
                latitude: Number
            },
            countryName: String,
            postalCodeNumber: String,
            streetName: String,
            address: String,
            administrativeAreaName: String,
            subAdministrativeAreaName: String,
            formattedResult: String
        },
        endAddress: {
            queryAddress: String,
            position: {
                altitude: Number,
                longitude: Number,
                latitude: Number
            },
            countryName: String,
            postalCodeNumber: String,
            address: String,
            administrativeAreaName: String,
            subAdministrativeAreaName: String,
            formattedResult: String
        }
    });

    // Create a model for the "trips" collection
    const Trip = mongoose.model('Trip', tripSchema);

    // Query the "trips" collection
    return Trip.find({});
})
.then(trips => {
    console.log('Trips:', trips);

    // Transform MongoDB data into Salesforce format
    const recordsToInsert = trips.map(trip => ({
        // Map MongoDB fields to Salesforce fields
        // Example:
        Vehicle: trip.vehicle.id,
        Duration: trip.tripDuration,
        Start_Time__c: trip.startTime,
        Stop_Time__c: trip.stopTime,
        // and so on...
    }));

    // Insert data into Salesforce
    return conn.sobject('Trip__c').create(recordsToInsert);
})
.then(rets => {
    console.log('Successfully inserted data into Salesforce:', rets);
})
.catch(error => {
    console.error('Error:', error);
});

app.get('/', (req, res) => {
    res.send('Integrating MongoDB with Salesforce using REST API');
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
