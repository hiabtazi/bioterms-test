const sdk = require('node-appwrite');

const client = new sdk.Client()
<<<<<<< HEAD
    .setEndpoint('https://appwrite.bioterms.space/v1') // Your API Endpoint
=======
    .setEndpoint('https://cloud.appwrite.io/v1') // Your API Endpoint
>>>>>>> 5ddc969c330a34e947abc5bad4d75267c39b87d1
    .setProject('66bdd9ef0022a854dccc') // Your project ID
    .setKey('AIzaSyAHAj-yv-OvCBOfuKjHOFRUfOlKGJHLwAo'); // Your secret API key

const users = new sdk.Users(client);

const result = await users.list(
    [], // queries (optional)
    '<SEARCH>' // search (optional)
);