import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import "dotenv/config";

const app = express();

const PORT = 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URL);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("booknook-app");
const addBookCollection = db.collection("books");

app.post("/add-book", async (req, res) => {
  const data = req.body;
  const result = await addBookCollection.insertOne(data);
  res.send(result);
});

app.get("/books", async (req, res) => {
  const result = await addBookCollection.find({}).toArray();
  res.send(result);
});

app.get("/books/:id", async (req, res) => {
  const { id } = req.params;
  const result = await addBookCollection.findOne({ _id: new ObjectId(id) });
  res.send(result);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
