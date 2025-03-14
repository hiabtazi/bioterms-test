import { Client, Databases } from "appwrite";

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1') // Your API Endpoint
    .setProject('66bdd9ef0022a854dccc'); // Your project ID

const databases = new Databases(client);

const result = await databases.listDocuments(
    '', // databaseId
    '66bddd03002e43f7d4f1', // collectionId
    [] // queries (optional)
);

console.log(result);
