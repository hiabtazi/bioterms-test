import { Client, Databases } from "appwrite";

const client = new Client()
<<<<<<< HEAD
    .setEndpoint('https://appwrite.bioterms.space/v1') // Your API Endpoint
=======
    .setEndpoint('https://cloud.appwrite.io/v1') // Your API Endpoint
>>>>>>> 5ddc969c330a34e947abc5bad4d75267c39b87d1
    .setProject('66bdd9ef0022a854dccc'); // Your project ID

const databases = new Databases(client);

const result = await databases.listDocuments(
    '', // databaseId
    '66bddd03002e43f7d4f1', // collectionId
    [] // queries (optional)
);

console.log(result);
