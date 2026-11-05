import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import "dotenv/config";
import { verifyToken } from "./middleware/verifyToken.js";

const app = express();

const PORT = 5000;

const corsOptions = {
  origin: [
    "https://booknook-app-rho.vercel.app",
    "http://localhost:3000",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
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
const borrowCollection = db.collection("borrows");

app.post("/add-book", verifyToken, async (req, res) => {
  const data = req.body;
  const result = await addBookCollection.insertOne(data);
  res.send(result);
});

app.get("/books", async (req, res) => {
  const result = await addBookCollection.find({}).toArray();
  res.send(result);
});

app.get("/books/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const result = await addBookCollection.findOne({ _id: new ObjectId(id) });
  res.send(result);
});

app.get("/featured-books", async (req, res) => {
  const result = await addBookCollection.find().limit(6).toArray();
  res.send(result);
});

app.get("/my-books", verifyToken ,async (req, res) => {
  const { userEmail } = req.query;
  if (!userEmail) {
    return res.status(400).send({ message: "userEmail is required" });
  }
  const result = await addBookCollection.find({ email: userEmail }).toArray();
  res.send(result);
});

app.patch("/books/:id", verifyToken,async (req, res) => {
  const { id } = req.params;
  const { userEmail } = req.query;
  const { _id, email, ...updates } = req.body;

  const ownerEmail = userEmail ?? email;

  const result = await addBookCollection.updateOne(
    { _id: new ObjectId(id), email: ownerEmail },
    { $set: updates },
  );
  if (result.matchedCount === 0) {
    return res.status(403).send({ message: "Book Not Found" });
  }
  res.send(result);
});

app.delete("/books/:id", verifyToken,async (req, res) => {
  const { id } = req.params;
  const { email } = req.query;

  const result = await addBookCollection.deleteOne({
    _id: new ObjectId(id),
    email: email,
  });

  if (result.deletedCount === 0) {
    return res.status(403).send({ message: "Not allowed or book not found" });
  }
  res.send(result);
});

app.get("/add-books/:email", verifyToken,async (req, res) => {
  const { email } = req.params;
  const result = await addBookCollection.find({ email: email }).toArray();
  res.send(result);
});

app.post("/my-borrows", verifyToken,async (req, res) => {
  const data = req.body;
  const result = await borrowCollection.insertOne(data);
  res.send(result);
});

app.get("/my-borrows", verifyToken,async (req, res) => {
  const { userEmail } = req.query;
  if (!userEmail) {
    return res.status(400).send({ message: "userEmail is required" });
  }
  const result = await borrowCollection.find({ userEmail }).toArray();
  res.send(result);
});

app.get("/my-borrows/:email", verifyToken,async (req, res) => {
  const { email } = req.params;
  const result = await borrowCollection.find({ userEmail: email }).toArray();
  res.send(result);
});

app.patch("/my-borrows/:id", verifyToken,async (req, res) => {
  const { id } = req.params;
  const { userEmail } = req.query;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid borrow id" });
  }

  const result = await borrowCollection.updateOne(
    { _id: new ObjectId(id), userEmail, returnDate: { $exists: false } },
    { $set: { returnDate: new Date().toISOString() } },
  );

  if (result.matchedCount === 0) {
    return res
      .status(404)
      .send({ message: "Borrow record not found or already returned" });
  }
  res.send(result);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;